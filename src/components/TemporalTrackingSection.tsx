import React, { useState } from 'react';
import {
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Flame,
  Award,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Filter,
  Check,
  Search,
  ExternalLink,
  Plus,
  X,
  Play,
} from 'lucide-react';
import {
  ContentItem,
  CounterCorrectionLog,
  TikTokOfficialVideo,
  TikTokMetricSnapshot,
} from '../types';
import {
  buildTemporalRecords,
  computeTemporalStats,
  computeDurationAnalysis,
  saveVideoCheckpoint,
  VideoTemporalRecord,
} from '../utils/temporalMetricsEngine';
import { MeterBar } from './ui';

interface TemporalTrackingSectionProps {
  contentItems: ContentItem[];
  officialVideos: TikTokOfficialVideo[];
  snapshots?: TikTokMetricSnapshot[];
  accountHandle?: string;
  counterCorrections?: CounterCorrectionLog[];
  onRefresh?: () => void;
}

export const TemporalTrackingSection: React.FC<TemporalTrackingSectionProps> = ({
  contentItems,
  officialVideos,
  snapshots = [],
  accountHandle,
  counterCorrections = [],
  onRefresh,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'evolution' | 'formats' | 'checkpoints_table'>('evolution');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<VideoTemporalRecord | null>(null);

  // Configurable duration thresholds (Section 8)
  const [thresholdShort, setThresholdShort] = useState<number>(30);
  const [thresholdMedium, setThresholdMedium] = useState<number>(60);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  // Re-read trigger after manual saving
  const [saveCounter, setSaveCounter] = useState(0);

  const temporalRecords = React.useMemo(() => {
    return buildTemporalRecords(officialVideos, contentItems, snapshots);
  }, [officialVideos, contentItems, snapshots, saveCounter]);

  const temporalStats = computeTemporalStats(temporalRecords);
  const durationAnalyses = computeDurationAnalysis(temporalRecords, {
    shortMax: thresholdShort,
    mediumMax: thresholdMedium,
  });

  // Selected video for the interactive SVG chart
  const [selectedChartVideoId, setSelectedChartVideoId] = useState<string>(() => {
    if (temporalRecords.length > 0) {
      const sorted = [...temporalRecords].sort((a, b) => b.currentViews - a.currentViews);
      return sorted[0].videoId;
    }
    return '';
  });

  const activeChartRecord =
    temporalRecords.find((r) => r.videoId === selectedChartVideoId) ||
    temporalRecords[0] ||
    null;

  // Tooltip & Checkpoint Logging State
  const [hoveredPoint, setHoveredPoint] = useState<{
    key: string;
    label: string;
    views: number;
    incrementalViews: number;
    recordedAt?: string;
    rate?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    x: number;
    y: number;
  } | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [targetMilestoneKey, setTargetMilestoneKey] = useState<'h1' | 'h5' | 'h24' | 'h48' | 'd7'>('h24');
  const [inputViews, setInputViews] = useState('');
  const [inputLikes, setInputLikes] = useState('');
  const [inputComments, setInputComments] = useState('');
  const [inputShares, setInputShares] = useState('');

  const categories = React.useMemo(() => {
    const uniq = Array.from(new Set(temporalRecords.map((r) => r.category).filter(Boolean)));
    return ['Toutes', ...uniq];
  }, [temporalRecords]);

  const filteredRecords = temporalRecords.filter((r) => {
    const matchesCat = categoryFilter === 'Toutes' || r.category === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      r.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.videoId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 text-white font-sans">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubTab('evolution')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedSubTab === 'evolution'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Évolution & Vitesse d'acquisition</span>
          </button>

          <button
            onClick={() => setSelectedSubTab('formats')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedSubTab === 'formats'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Étude Scientifique des Formats & Durées</span>
          </button>

          <button
            onClick={() => setSelectedSubTab('checkpoints_table')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedSubTab === 'checkpoints_table'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Graphique Comparatif (1h–7j)</span>
          </button>
        </div>

        {selectedSubTab === 'formats' && (
          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto border border-zinc-700"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Seuils de durée</span>
          </button>
        )}
      </div>

      {/* Threshold configuration panel (if open) */}
      {showThresholdConfig && selectedSubTab === 'formats' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between font-bold text-zinc-200">
            <span>Configuration des seuils de durée (Section 8)</span>
            <button
              onClick={() => setShowThresholdConfig(false)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Ajustez les durées pivots pour refléter la distribution exacte de vos créations (montages courts, moyens ou extraits longs de concerts).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">
                Plafond Format Court (en secondes) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={45}
                  value={thresholdShort}
                  onChange={(e) => setThresholdShort(Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-bold text-center"
                />
                <span className="text-zinc-400">secondes (actuel : &le; {thresholdShort}s)</span>
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">
                Plafond Format Moyen (en secondes) :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={thresholdShort + 5}
                  max={120}
                  value={thresholdMedium}
                  onChange={(e) => setThresholdMedium(Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-white font-bold text-center"
                />
                <span className="text-zinc-400">secondes (actuel : {thresholdShort}s &agrave; {thresholdMedium}s)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ÉVOLUTION DES VUES DANS LE TEMPS & MOYENNES (Section 7) */}
      {selectedSubTab === 'evolution' && (
        <div className="space-y-6">
          {/* Graphique global par palier temporel (1h -> 5h -> 24h -> 48h -> 7j) */}
          <div className="surface p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-400" />
                  <span>Graphique Global de Progression par Palier (1h &rarr; 7j)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Comparaison visuelle entre la médiane (barres rose/ambre) et la moyenne (courbe pointillée indigo) des vues cumulées du compte.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-rose-500 to-amber-400 inline-block" />
                  Médiane
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-indigo-400 inline-block" />
                  Moyenne
                </span>
              </div>
            </div>

            {(() => {
              const maxMilestoneVal = Math.max(
                100,
                ...temporalStats.map((s) => Math.max(s.medianViews || 0, s.avgViews || 0))
              );
              const svgW = 760;
              const svgH = 210;
              const padL = 62;
              const padR = 28;
              const padT = 22;
              const padB = 38;
              const innerW = svgW - padL - padR;
              const innerH = svgH - padT - padB;
              const colW = innerW / Math.max(1, temporalStats.length);

              const points = temporalStats.map((stat, idx) => {
                const cx = padL + colW * idx + colW / 2;
                const medH = stat.sampleCount > 0 ? Math.max(6, (stat.medianViews / maxMilestoneVal) * innerH) : 4;
                const medY = padT + innerH - medH;
                const avgY =
                  stat.sampleCount > 0
                    ? padT + innerH - Math.max(4, (stat.avgViews / maxMilestoneVal) * innerH)
                    : padT + innerH;
                return { stat, cx, medH, medY, avgY };
              });

              const avgCurve = points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.avgY.toFixed(1)}`)
                .join(' ');

              return (
                <div className="w-full overflow-x-auto bg-zinc-950/90 border border-zinc-800/80 rounded-2xl p-3 sm:p-4">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[540px] overflow-visible">
                    <defs>
                      <linearGradient id="milestoneBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>

                    {[0, 0.5, 1].map((frac) => {
                      const y = padT + innerH * (1 - frac);
                      const val = Math.round(maxMilestoneVal * frac);
                      return (
                        <g key={frac}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="#27272a"
                            strokeDasharray={frac === 0 ? undefined : '4 4'}
                          />
                          <text
                            x={padL - 10}
                            y={y + 3.5}
                            textAnchor="end"
                            fill="#71717a"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {val.toLocaleString('fr-FR')}
                          </text>
                        </g>
                      );
                    })}

                    {/* Median bars */}
                    {points.map((p) => (
                      <g key={p.stat.checkpoint}>
                        <rect
                          x={p.cx - 24}
                          y={p.medY}
                          width={48}
                          height={p.medH}
                          rx={8}
                          fill={p.stat.sampleCount > 0 ? 'url(#milestoneBarGrad)' : '#27272a'}
                          opacity={p.stat.sampleCount > 0 ? 0.9 : 0.45}
                        />
                        <text
                          x={p.cx}
                          y={p.medY - 7}
                          textAnchor="middle"
                          fill="#f4f4f5"
                          fontSize="10.5"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {p.stat.sampleCount > 0 ? p.stat.medianViews.toLocaleString('fr-FR') : '—'}
                        </text>
                        <text
                          x={p.cx}
                          y={padT + innerH + 17}
                          textAnchor="middle"
                          fill="#e4e4e7"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {p.stat.checkpoint}
                        </text>
                        <text
                          x={p.cx}
                          y={padT + innerH + 31}
                          textAnchor="middle"
                          fill="#a1a1aa"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {p.stat.sampleCount} vid.
                        </text>
                      </g>
                    ))}

                    {/* Average dashed trendline */}
                    {points.some((p) => p.stat.sampleCount > 0) && (
                      <>
                        <path
                          d={avgCurve}
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                          strokeLinecap="round"
                        />
                        {points.map((p) =>
                          p.stat.sampleCount > 0 ? (
                            <circle
                              key={`avg_${p.stat.checkpoint}`}
                              cx={p.cx}
                              cy={p.avgY}
                              r="4.5"
                              fill="#818cf8"
                              stroke="#09090b"
                              strokeWidth="2"
                            />
                          ) : null
                        )}
                      </>
                    )}
                  </svg>
                </div>
              );
            })()}
          </div>

          {/* Core pedagogical trajectory explanation banner */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-zinc-200">
              <Info className="w-4 h-4 text-rose-400" />
              <span>Principe fondamental du suivi temporel :</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Une vidéo TikTok ne doit jamais être jugée sur ses 60 premières minutes. Les données de votre compte démontrent que les contenus musicaux ou sportifs connaissent souvent une <strong>seconde vague de distribution</strong> entre 24 et 48 heures lorsque l'algorithme élargit la cohorte initiale auprès des passionnés.
            </p>
          </div>

          {/* VISUAL CHART SECTION: COURBE VISUELLE D'ACQUISITION DES VUES CUMULÉES */}
          <div className="surface p-6 sm:p-8 space-y-6">
            {/* Header: Title and Interactive Video Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-lg">
                  <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Courbe Visuelle d'Acquisition Temporelle des Vues
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Axe horizontal : temps écoulé (1h, 5h, 24h, 48h, 7j) &middot; Axe vertical : vues cumulées
                  </p>
                </div>
              </div>

              {/* Video Selector Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <label className="text-xs text-zinc-400 font-semibold whitespace-nowrap">
                  Sélectionner la vidéo :
                </label>
                <select
                  value={activeChartRecord?.videoId || ''}
                  onChange={(e) => setSelectedChartVideoId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 hover:border-rose-500/50 rounded-xl px-3.5 py-2 text-xs text-white max-w-sm truncate font-medium cursor-pointer shadow-inner"
                >
                  {temporalRecords.map((r) => (
                    <option key={r.videoId} value={r.videoId}>
                      {r.videoTitle} ({r.currentViews.toLocaleString('fr-FR')} vues &middot; {r.publishedDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Video Identity & Quick Stats Pill */}
            {activeChartRecord && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    <span className="font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {activeChartRecord.category}
                    </span>
                    <span className="text-zinc-400 font-mono">
                      Publiée le {activeChartRecord.publishedDate} &middot; {activeChartRecord.durationKnown ? `Durée ${activeChartRecord.duration}s` : 'Durée non fournie'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-800/60 font-bold">
                      {activeChartRecord.trajectoryType}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white truncate">{activeChartRecord.videoTitle}</h4>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
                      {activeChartRecord.currentViews.toLocaleString('fr-FR')} vues
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {activeChartRecord.currentLikes.toLocaleString('fr-FR')} likes &middot; {activeChartRecord.currentComments} comms &middot; {activeChartRecord.currentShares} part.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTargetMilestoneKey('h24');
                      setInputViews(String(activeChartRecord.currentViews));
                      setInputLikes(String(activeChartRecord.currentLikes));
                      setInputComments(String(activeChartRecord.currentComments));
                      setInputShares(String(activeChartRecord.currentShares));
                      setShowLogModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-zinc-700 hover:border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Saisir un relevé</span>
                  </button>
                </div>
              </div>
            )}

            {/* SVG Visual Canvas */}
            {(() => {
              const milestoneDefs = [
                { key: 'h1' as const, label: '1 heure', shortLabel: '1h', hours: 1, x: 195 },
                { key: 'h5' as const, label: '5 heures', shortLabel: '5h', hours: 5, x: 330 },
                { key: 'h24' as const, label: '24 heures', shortLabel: '24h', hours: 24, x: 485 },
                { key: 'h48' as const, label: '48 heures', shortLabel: '48h', hours: 48, x: 640 },
                { key: 'd7' as const, label: '7 jours', shortLabel: '7j', hours: 168, x: 790 },
              ];

              const padLeft = 75;
              const padTop = 30;
              const chartHeight = 220;
              const chartBottom = 250;

              // Compute Max scale
              const recordedViewsList = milestoneDefs
                .map((m) => activeChartRecord?.checkpoints[m.key]?.views)
                .filter((v): v is number => v !== undefined);

              const medianViewsList = temporalStats.map((s) => s.medianViews || 0);

              const maxRaw = Math.max(
                activeChartRecord?.currentViews || 0,
                ...recordedViewsList,
                ...medianViewsList,
                100
              );

              // Nice round max
              const getNiceMax = (val: number) => {
                if (val <= 200) return 300;
                if (val <= 600) return 800;
                if (val <= 1200) return 1500;
                if (val <= 2500) return 3000;
                if (val <= 6000) return 8000;
                if (val <= 12000) return 15000;
                if (val <= 30000) return 35000;
                return Math.ceil(val / 10000) * 10000;
              };
              const chartMax = getNiceMax(maxRaw);

              const getY = (views: number) =>
                chartBottom - (Math.min(views, chartMax) / chartMax) * chartHeight;

              // Median reference line
              const medianLinePoints = [
                { x: 75, views: 0 },
                { x: 195, views: temporalStats.find((s) => s.hoursKey === 'h1')?.medianViews || 0 },
                { x: 330, views: temporalStats.find((s) => s.hoursKey === 'h5')?.medianViews || 0 },
                { x: 485, views: temporalStats.find((s) => s.hoursKey === 'h24')?.medianViews || 0 },
                { x: 640, views: temporalStats.find((s) => s.hoursKey === 'h48')?.medianViews || 0 },
                { x: 790, views: temporalStats.find((s) => s.hoursKey === 'd7')?.medianViews || 0 },
              ];
              const medianPath = medianLinePoints
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${getY(p.views)}`)
                .join(' ');

              // Video Measured Curve: only connect points that ACTUALLY exist
              const measuredPoints: Array<{
                key: string;
                label: string;
                shortLabel: string;
                x: number;
                views: number;
                incrementalViews: number;
                likes?: number;
                comments?: number;
                shares?: number;
                rate?: number;
                recordedAt?: string;
              }> = [
                {
                  key: 'pub',
                  label: 'Publication (0h)',
                  shortLabel: '0h',
                  x: 75,
                  views: 0,
                  incrementalViews: 0,
                  recordedAt: activeChartRecord?.publishedAt,
                },
              ];

              let prevViews = 0;
              milestoneDefs.forEach((m) => {
                const cp = activeChartRecord?.checkpoints[m.key];
                if (cp !== undefined) {
                  const inc = Math.max(0, cp.views - prevViews);
                  prevViews = cp.views;
                  measuredPoints.push({
                    key: m.key,
                    label: m.label,
                    shortLabel: m.shortLabel,
                    x: m.x,
                    views: cp.views,
                    incrementalViews: inc,
                    likes: cp.likes,
                    comments: cp.comments,
                    shares: cp.shares,
                    rate: cp.engagementRate,
                    recordedAt: cp.recordedAt,
                  });
                }
              });

              const videoPath =
                measuredPoints.length > 1
                  ? measuredPoints
                      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${getY(p.views)}`)
                      .join(' ')
                  : '';

              const videoArea =
                measuredPoints.length > 1
                  ? `${videoPath} L ${measuredPoints[measuredPoints.length - 1].x} ${chartBottom} L ${measuredPoints[0].x} ${chartBottom} Z`
                  : '';

              // Ticks on Y axis
              const yTicks = [
                { frac: 1.0, views: chartMax },
                { frac: 0.75, views: Math.round(chartMax * 0.75) },
                { frac: 0.5, views: Math.round(chartMax * 0.5) },
                { frac: 0.25, views: Math.round(chartMax * 0.25) },
                { frac: 0, views: 0 },
              ];

              const totalCheckpointsMeasured = milestoneDefs.filter(
                (m) => activeChartRecord?.checkpoints[m.key] !== undefined
              ).length;

              return (
                <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800 p-4 sm:p-6 overflow-hidden space-y-4">
                  {/* Legend Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-2 border-b border-zinc-900">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-xs shadow-rose-500/50" />
                        <span className="font-bold text-white">Trajectoire Réelle (Vues Cumulées)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-0.5 border-t-2 border-dashed border-zinc-500 inline-block" />
                        <span className="text-zinc-400 font-medium">Médiane du Compte (Repère)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <span className="w-2.5 h-2.5 rounded-full border border-dashed border-zinc-600 inline-block" />
                        <span>Cercle ouvert = Palier non mesuré</span>
                      </div>
                    </div>

                    <div className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {totalCheckpointsMeasured} / 5 échéances mesurées
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="w-full overflow-x-auto relative">
                    <svg viewBox="0 0 840 330" className="w-full h-auto min-w-[700px] overflow-visible">
                      <defs>
                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="50%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines & Y-Axis Labels */}
                      {yTicks.map((t, idx) => {
                        const y = padTop + chartHeight * (1 - t.frac);
                        return (
                          <g key={idx}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={790}
                              y2={y}
                              stroke="#1e293b"
                              strokeDasharray={t.frac === 0 ? undefined : '4 4'}
                              strokeWidth={t.frac === 0 ? '1.5' : '1'}
                            />
                            <text
                              x={padLeft - 10}
                              y={y + 3.5}
                              textAnchor="end"
                              fill="#64748b"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {t.views.toLocaleString('fr-FR')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical Guideline for 0h */}
                      <line x1={75} y1={padTop} x2={75} y2={chartBottom} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x={75} y={chartBottom + 20} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                        0h
                      </text>
                      <text x={75} y={chartBottom + 35} textAnchor="middle" fill="#475569" fontSize="9">
                        Publi.
                      </text>

                      {/* Vertical Guidelines and X-Axis Labels for each milestone */}
                      {milestoneDefs.map((m) => {
                        const isMeasured = activeChartRecord?.checkpoints[m.key] !== undefined;
                        return (
                          <g key={m.key}>
                            <line
                              x1={m.x}
                              y1={padTop}
                              x2={m.x}
                              y2={chartBottom}
                              stroke="#1e293b"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={m.x}
                              y={chartBottom + 20}
                              textAnchor="middle"
                              fill={isMeasured ? '#f1f5f9' : '#64748b'}
                              fontSize="11"
                              fontWeight={isMeasured ? '800' : '500'}
                            >
                              {m.shortLabel}
                            </text>
                            <text
                              x={m.x}
                              y={chartBottom + 35}
                              textAnchor="middle"
                              fill={isMeasured ? '#10b981' : '#475569'}
                              fontSize="9"
                              fontWeight="600"
                            >
                              {isMeasured ? 'Mesuré' : 'Non mesuré'}
                            </text>
                          </g>
                        );
                      })}

                      {/* Account Median Reference Baseline Curve */}
                      <path
                        d={medianPath}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                        opacity="0.65"
                      />

                      {/* Video Cumulative Area Fill */}
                      {videoArea && <path key={`area_${videoArea}`} d={videoArea} fill="url(#areaGradient)" className="chart-area" />}

                      {/* Video Cumulative Line Curve */}
                      {videoPath && (
                        <path
                          key={`line_${videoPath}`}
                          d={videoPath}
                          fill="none"
                          stroke="url(#curveGradient)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          pathLength={1}
                          className="chart-line"
                          style={{ ['--len' as any]: 1, filter: 'drop-shadow(0 0 8px rgba(244,63,94,.55))' }}
                        />
                      )}

                      {/* Indicator for Unmeasured Milestones (Open circles on baseline to honor zero-extrapolation rule) */}
                      {milestoneDefs.map((m) => {
                        const isMeasured = activeChartRecord?.checkpoints[m.key] !== undefined;
                        if (isMeasured) return null;
                        return (
                          <g key={`unmeasured_${m.key}`}>
                            <circle
                              cx={m.x}
                              cy={chartBottom}
                              r="5"
                              fill="#090d16"
                              stroke="#475569"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                          </g>
                        );
                      })}

                      {/* Measured Checkpoint Dots & Pulse Halos */}
                      {measuredPoints.map((p) => {
                        const cy = getY(p.views);
                        const isHovered = hoveredPoint?.key === p.key;

                        return (
                          <g
                            key={p.key}
                            className="cursor-pointer group"
                            onMouseEnter={() =>
                              setHoveredPoint({
                                key: p.key,
                                label: p.label,
                                views: p.views,
                                incrementalViews: p.incrementalViews,
                                recordedAt: p.recordedAt,
                                rate: p.rate,
                                likes: p.likes,
                                comments: p.comments,
                                shares: p.shares,
                                x: p.x,
                                y: cy,
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          >
                            {/* Outer Pulse Ring */}
                            <circle
                              cx={p.x}
                              cy={cy}
                              r={isHovered ? '12' : '8'}
                              fill="#f43f5e"
                              fillOpacity={isHovered ? '0.35' : '0.15'}
                              className="transition-all animate-pulse"
                            />
                            {/* Inner Circle Dot */}
                            <circle
                              cx={p.x}
                              cy={cy}
                              r={isHovered ? '7' : '5'}
                              fill="#f43f5e"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="transition-all shadow-md"
                            />

                            {/* Permanent Small Value Label Above Dot */}
                            <text
                              x={p.x}
                              y={cy - 12}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {p.views > 0 ? p.views.toLocaleString('fr-FR') : '0'}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive Tooltip Card Floating on Hover */}
                    {hoveredPoint && (
                      <div
                        className="absolute z-30 pointer-events-none bg-zinc-900 border border-rose-500/50 shadow-2xl rounded-2xl p-3 text-xs space-y-1.5 animate-fadeIn min-w-[200px]"
                        style={{
                          left: `${Math.min(Math.max(hoveredPoint.x - 100, 10), 620)}px`,
                          top: `${Math.max(hoveredPoint.y - 110, 10)}px`,
                        }}
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                          <span className="font-extrabold text-white text-xs">
                            Palier {hoveredPoint.label}
                          </span>
                          <span className="text-[10px] font-mono text-rose-400 font-bold">
                            Mesure Certifiée
                          </span>
                        </div>

                        <div className="font-mono">
                          <div className="text-sm font-black text-rose-300">
                            {hoveredPoint.views.toLocaleString('fr-FR')} vues cumulées
                          </div>
                          {hoveredPoint.incrementalViews > 0 && (
                            <div className="text-[11px] text-emerald-400 font-bold">
                              +{hoveredPoint.incrementalViews.toLocaleString('fr-FR')} nouvelles vues
                            </div>
                          )}
                        </div>

                        {hoveredPoint.likes !== undefined && (
                          <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                            {hoveredPoint.likes} likes &middot; {hoveredPoint.comments || 0} comms &middot; {hoveredPoint.shares || 0} part.
                          </div>
                        )}
                        {hoveredPoint.rate !== undefined && (
                          <div className="text-[10px] text-amber-300 font-semibold">
                            Taux d'engagement : {hoveredPoint.rate}%
                          </div>
                        )}
                        {hoveredPoint.recordedAt && (
                          <div className="text-[9px] text-zinc-500 font-mono">
                            Relevé le {new Date(hoveredPoint.recordedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* DETAILED PROGRESSION BREAKDOWN TABLE */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl overflow-hidden space-y-2">
              <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    Tableau Détaillé de Progression Temporelle
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Décomposition rigoureuse entre vues cumulées et nouvelles vues incrémentales à chaque palier.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 self-start sm:self-auto">
                  Aucune extrapolation
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-[10px] text-zinc-400 uppercase font-mono border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Échéance</th>
                      <th className="px-4 py-3">Statut de Mesure</th>
                      <th className="px-4 py-3">Vues Cumulées</th>
                      <th className="px-4 py-3">Nouvelles Vues (Incrémentales)</th>
                      <th className="px-4 py-3">Likes</th>
                      <th className="px-4 py-3">Commentaires</th>
                      <th className="px-4 py-3">Partages</th>
                      <th className="px-4 py-3">Engagement</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                    {/* 0h Row */}
                    <tr className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3 font-bold text-zinc-300">Publication (0h)</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-bold">
                          Lancement
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-bold">0</td>
                      <td className="px-4 py-3 text-zinc-500">—</td>
                      <td className="px-4 py-3 text-zinc-500">0</td>
                      <td className="px-4 py-3 text-zinc-500">0</td>
                      <td className="px-4 py-3 text-zinc-500">0</td>
                      <td className="px-4 py-3 text-zinc-500">0%</td>
                      <td className="px-4 py-3 text-right text-zinc-600">—</td>
                    </tr>

                    {/* Milestones Rows: 1h, 5h, 24h, 48h, 7j */}
                    {[
                      { key: 'h1' as const, label: '1 heure', hours: 1 },
                      { key: 'h5' as const, label: '5 heures', hours: 5 },
                      { key: 'h24' as const, label: '24 heures', hours: 24 },
                      { key: 'h48' as const, label: '48 heures', hours: 48 },
                      { key: 'd7' as const, label: '7 jours', hours: 168 },
                    ].map((m, idx, arr) => {
                      const cp = activeChartRecord?.checkpoints[m.key];
                      const isMeasured = cp !== undefined;

                      // Find previous measured milestone to compute accurate incremental views
                      let prevVal = 0;
                      for (let i = idx - 1; i >= 0; i--) {
                        const prevCp = activeChartRecord?.checkpoints[arr[i].key];
                        if (prevCp !== undefined) {
                          prevVal = prevCp.views;
                          break;
                        }
                      }

                      const incremental = isMeasured ? Math.max(0, cp.views - prevVal) : null;

                      return (
                        <tr key={m.key} className="hover:bg-zinc-900/40 transition">
                          <td className="px-4 py-3 font-bold text-white">{m.label}</td>
                          <td className="px-4 py-3">
                            {isMeasured ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-bold">
                                ✓ Mesuré
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 text-[10px]">
                                Non mesuré
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isMeasured ? (
                              <span className="font-black text-rose-300">
                                {cp.views.toLocaleString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isMeasured && incremental !== null ? (
                              <span className="text-emerald-400 font-bold">
                                +{incremental.toLocaleString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {isMeasured ? cp.likes.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {isMeasured ? cp.comments.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {isMeasured ? cp.shares.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isMeasured ? (
                              <span className="text-amber-300 font-semibold">
                                {cp.engagementRate}%
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setTargetMilestoneKey(m.key);
                                setInputViews(cp ? String(cp.views) : String(activeChartRecord?.currentViews || ''));
                                setInputLikes(cp ? String(cp.likes) : String(activeChartRecord?.currentLikes || ''));
                                setInputComments(cp ? String(cp.comments) : String(activeChartRecord?.currentComments || ''));
                                setInputShares(cp ? String(cp.shares) : String(activeChartRecord?.currentShares || ''));
                                setShowLogModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-rose-300 text-[11px] font-bold transition cursor-pointer"
                            >
                              {isMeasured ? 'Modifier' : 'Saisir'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Current Age Row */}
                    {activeChartRecord && (
                      <tr className="bg-zinc-900/60 font-bold">
                        <td className="px-4 py-3 text-amber-300">
                          Actuel ({Math.max(1, Math.round((Date.now() - new Date(activeChartRecord.publishedAt).getTime()) / 3600000))}h)
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px]">
                            Certifié API
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-black text-sm">
                          {activeChartRecord.currentViews.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">Totalité</td>
                        <td className="px-4 py-3 text-zinc-300">{activeChartRecord.currentLikes.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 text-zinc-300">{activeChartRecord.currentComments}</td>
                        <td className="px-4 py-3 text-zinc-300">{activeChartRecord.currentShares}</td>
                        <td className="px-4 py-3 text-amber-300">{activeChartRecord.engagementRate}%</td>
                        <td className="px-4 py-3 text-right text-zinc-500">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MODAL POUR SAISIR OU MODIFIER UN RELEVÉ TEMPOREL */}
          {showLogModal && activeChartRecord && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
              onClick={() => setShowLogModal(false)}
            >
              <div
                className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Enregistrer un Relevé Temporel
                    </h3>
                    <p className="text-xs text-zinc-400 truncate max-w-xs">
                      {activeChartRecord.videoTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">
                      Palier temporel :
                    </label>
                    <select
                      value={targetMilestoneKey}
                      onChange={(e) => setTargetMilestoneKey(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="h1">1 heure après publication</option>
                      <option value="h5">5 heures après publication</option>
                      <option value="h24">24 heures après publication (1 jour)</option>
                      <option value="h48">48 heures après publication (2 jours)</option>
                      <option value="d7">7 jours après publication (1 semaine)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-semibold">
                      Vues cumulées atteintes à ce palier :
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={inputViews}
                      onChange={(e) => setInputViews(e.target.value)}
                      placeholder="Ex: 1250"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-semibold">Likes :</label>
                      <input
                        type="number"
                        min={0}
                        value={inputLikes}
                        onChange={(e) => setInputLikes(e.target.value)}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1 font-semibold">Comms :</label>
                      <input
                        type="number"
                        min={0}
                        value={inputComments}
                        onChange={(e) => setInputComments(e.target.value)}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1 font-semibold">Partages :</label>
                      <input
                        type="number"
                        min={0}
                        value={inputShares}
                        onChange={(e) => setInputShares(e.target.value)}
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const v = Number(inputViews) || 0;
                      const l = Number(inputLikes) || 0;
                      const c = Number(inputComments) || 0;
                      const s = Number(inputShares) || 0;
                      saveVideoCheckpoint(activeChartRecord.videoId, targetMilestoneKey, {
                        views: v,
                        likes: l,
                        comments: c,
                        shares: s,
                      });
                      setSaveCounter((cnt) => cnt + 1);
                      setShowLogModal(false);
                      if (onRefresh) onRefresh();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Enregistrer la Mesure
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Counter corrections log (if any API downward adjustment recorded) */}
          {counterCorrections.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Corrections de compteurs API détectées ({counterCorrections.length})</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Lorsqu’un compteur renvoyé par l’API TikTok diminue entre deux relevés, l’ancien relevé reste archivé et l’écart est journalisé ici de manière transparente.
              </p>
              <ul className="space-y-1 text-[11px] text-amber-100 font-mono">
                {counterCorrections.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    {c.videoTitle || c.videoId} : {c.previousValue.toLocaleString('fr-FR')} &rarr; {c.newValue.toLocaleString('fr-FR')} ({c.delta})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Video Trajectory List */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <h4 className="font-extrabold text-sm sm:text-base text-white">
                Trajectoires individuelles des vidéos ({accountHandle || 'Compte connecté'})
              </h4>
              <div className="text-xs text-zinc-400">
                {temporalRecords.length} vidéos analysées
              </div>
            </div>

            <div className="space-y-3">
              {temporalRecords.slice(0, 10).map((r) => {
                const hasH24 = r.checkpoints.h24 !== undefined;
                const hasD7 = r.checkpoints.d7 !== undefined;

                return (
                  <div
                    key={r.videoId}
                    className="bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {r.category}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Publiée le {r.publishedDate} &middot; {r.durationKnown ? `${r.duration}s` : 'Durée n/c'}
                          </span>
                        </div>
                        <h5 className="font-bold text-sm text-zinc-100 mt-1">
                          {r.videoTitle}
                        </h5>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-base font-black text-rose-400">
                            {r.currentViews.toLocaleString('fr-FR')} vues
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {r.engagementRate}% d'engagement
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedVideoDetails(r)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-rose-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Tableau de progression</span>
                          <span className="text-xs">&rarr;</span>
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-xl border ${
                          r.trajectoryType === 'Démarrage rapide'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : r.trajectoryType === 'Seconde vague tardive'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                        }`}>
                          {r.trajectoryType === 'Seconde vague tardive' ? 'Seconde vague' : r.trajectoryType === 'Progression régulière' ? 'Progression continue' : r.trajectoryType}
                        </span>
                      </div>
                    </div>

                    {/* Mini SVG Trajectory Chart for each video */}
                    {(() => {
                      const pts = [
                        { label: '1h', views: r.checkpoints.h1?.views ?? null, x: 40 },
                        { label: '5h', views: r.checkpoints.h5?.views ?? null, x: 140 },
                        { label: '24h', views: r.checkpoints.h24?.views ?? null, x: 240 },
                        { label: '48h', views: r.checkpoints.h48?.views ?? null, x: 340 },
                        { label: '7j', views: r.checkpoints.d7?.views ?? null, x: 440 },
                      ];
                      const maxV = Math.max(
                        1,
                        r.currentViews,
                        ...pts.map((p) => p.views ?? 0)
                      );
                      const measured = pts
                        .filter((p): p is { label: string; views: number; x: number } => p.views !== null)
                        .map((p) => ({
                          ...p,
                          y: 44 - Math.max(4, (p.views / maxV) * 34),
                        }));
                      const poly =
                        measured.length > 1
                          ? measured.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y.toFixed(1)}`).join(' ')
                          : '';

                      return (
                        <div className="pt-2 border-t border-zinc-900">
                          <svg viewBox="0 0 480 64" className="w-full h-16 overflow-visible">
                            <line x1="20" y1="46" x2="460" y2="46" stroke="#27272a" strokeWidth="1" />
                            {poly && (
                              <path
                                d={poly}
                                fill="none"
                                stroke="#fb7185"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            {pts.map((p) => {
                              const hasVal = p.views !== null;
                              const cy = hasVal ? 44 - Math.max(4, (p.views! / maxV) * 34) : 46;
                              return (
                                <g key={p.label}>
                                  <circle
                                    cx={p.x}
                                    cy={cy}
                                    r={hasVal ? 4 : 3}
                                    fill={hasVal ? '#fb7185' : '#09090b'}
                                    stroke={hasVal ? '#fff' : '#52525b'}
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={p.x}
                                    y={59}
                                    textAnchor="middle"
                                    fill="#71717a"
                                    fontSize="9"
                                    fontWeight="600"
                                  >
                                    {p.label}
                                  </text>
                                  {hasVal && (
                                    <text
                                      x={p.x}
                                      y={Math.max(10, cy - 7)}
                                      textAnchor="middle"
                                      fill="#e4e4e7"
                                      fontSize="9"
                                      fontFamily="monospace"
                                      fontWeight="700"
                                    >
                                      {p.views!.toLocaleString('fr-FR')}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ÉTUDE SCIENTIFIQUE DES FORMATS & DURÉES (Section 8) */}
      {selectedSubTab === 'formats' && (
        <div className="space-y-6">
          {/* Graphique comparatif des formats de durée */}
          {durationAnalyses.length > 0 && (() => {
            const maxMed = Math.max(10, ...durationAnalyses.map((d) => d.medianViews || 0));
            const maxEng = Math.max(1, ...durationAnalyses.map((d) => d.avgEngagementRate || 0));
            return (
              <div className="surface p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>Graphique Comparatif des Formats de Durée</span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Compare visuellement la médiane de vues (barre or/rose) et le taux d’engagement (barre émeraude) par durée.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {durationAnalyses.map((da) => {
                    const viewPct = Math.round(((da.medianViews || 0) / maxMed) * 100);
                    const engPct = Math.round(((da.avgEngagementRate || 0) / maxEng) * 100);
                    return (
                      <div key={`chart_${da.categoryName}`} className="bg-zinc-950/85 border border-zinc-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-white">{da.categoryName}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{da.durationLabel} · {da.videoCount} vid.</span>
                        </div>
                        <div className="space-y-2.5">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Vues médianes</span>
                              <span className="font-mono font-bold text-amber-300">{da.medianViews.toLocaleString('fr-FR')}</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                                style={{ width: `${Math.max(4, viewPct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-400">Engagement moy.</span>
                              <span className="font-mono font-bold text-emerald-300">{da.avgEngagementRate}%</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                                style={{ width: `${Math.max(4, engPct)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {durationAnalyses.map((da) => (
              <div
                key={da.categoryName}
                className="surface hover:border-zinc-700 p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-800">
                      {da.durationLabel}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      {da.videoCount} vidéos
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xl font-extrabold text-white">
                      {da.categoryName}
                    </h4>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {da.videoCount > 0 ? da.medianViews.toLocaleString('fr-FR') : '0'} <span className="text-xs text-zinc-400 font-normal">vues médianes</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Moyenne : {da.avgViews.toLocaleString('fr-FR')} vues
                    </div>
                  </div>

                  {/* Ratios d'interaction */}
                  {(() => {
                    const lk = Number(da.avgLikesPerView) || 0;
                    const cm = Number(da.avgCommentsPerView) || 0;
                    const sh = Number(da.avgSharesPerView) || 0;
                    const sc = Math.max(lk, cm, sh, 0.01) * 1.25;
                    return (
                      <div className="space-y-3 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-3.5">
                        <MeterBar label="Likes / vue" value={lk} max={sc} color="#fb7185" decimals={2} />
                        <MeterBar label="Commentaires / vue" value={cm} max={sc} color="#818cf8" decimals={3} />
                        <MeterBar label="Partages / vue" value={sh} max={sc} color="#34d399" decimals={3} />
                      </div>
                    );
                  })()}

                  {/* Scientific Verdict */}
                  <div className="bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed italic">
                    « {da.scientificVerdict} »
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <span>Confiance : {da.sampleConfidence}</span>
                  <span className="text-emerald-400 font-bold">{da.avgEngagementRate}% engage.</span>
                </div>
              </div>
            ))}
          </div>

          {/* Controlled Experiment Suggestion Box */}
          <div className="bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/40 border border-zinc-800 rounded-3xl p-6 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-zinc-200">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Protocole d'Expérimentation Contrôlée (Méthode Scientifique) :</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Pour comparer rigoureusement un format court et un format long, testez <strong>un même sujet éditorial</strong> publié sur des créneaux équivalents. C'est le seul moyen d'isoler l'impact réel de la durée sans confondre avec l'attractivité du thème.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: GRAPHIQUE COMPARATIF MULTI-VIDÉOS PAR ÂGE RÉEL (Section 6) */}
      {selectedSubTab === 'checkpoints_table' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white">
                Graphique Comparatif Multi-Vidéos (1h &middot; 5h &middot; 24h &middot; 48h &middot; 7j)
              </h4>
              <p className="text-xs text-zinc-400">
                Superpose les courbes de croissance réelles de vos principales vidéos pour repérer d’un coup d’œil démarrages rapides et secondes vagues.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Line SVG Trajectory Comparison Graph */}
          {(() => {
            const palette = ['#fb7185', '#fbbf24', '#818cf8', '#34d399', '#38bdf8', '#c084fc'];
            const topTracked = [...filteredRecords]
              .sort((a, b) => b.currentViews - a.currentViews)
              .slice(0, 6);
            const xCols = [
              { key: 'pub', label: '0h', x: 75 },
              { key: 'h1', label: '1h', x: 195 },
              { key: 'h5', label: '5h', x: 330 },
              { key: 'h24', label: '24h', x: 485 },
              { key: 'h48', label: '48h', x: 640 },
              { key: 'd7', label: '7j', x: 790 },
            ] as const;

            const maxViewsMulti = Math.max(
              100,
              ...topTracked.flatMap((r) => [
                r.checkpoints.h1?.views || 0,
                r.checkpoints.h5?.views || 0,
                r.checkpoints.h24?.views || 0,
                r.checkpoints.h48?.views || 0,
                r.checkpoints.d7?.views || 0,
                r.currentViews || 0,
              ])
            );
            const padTop = 26;
            const chartH = 210;
            const chartBottom = padTop + chartH;
            const getMultiY = (v: number) =>
              chartBottom - (Math.min(v, maxViewsMulti) / maxViewsMulti) * chartH;

            return (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                {/* Legend chips */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {topTracked.map((r, i) => (
                    <button
                      key={r.videoId}
                      type="button"
                      onClick={() => setSelectedVideoDetails(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-200 transition cursor-pointer max-w-[210px]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: palette[i % palette.length] }}
                      />
                      <span className="truncate font-semibold">{r.videoTitle}</span>
                    </button>
                  ))}
                </div>

                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 840 285" className="w-full h-auto min-w-[660px] overflow-visible">
                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                      const y = padTop + chartH * (1 - frac);
                      return (
                        <g key={frac}>
                          <line
                            x1={75}
                            y1={y}
                            x2={790}
                            y2={y}
                            stroke="#1f2937"
                            strokeDasharray={frac === 0 ? undefined : '4 4'}
                          />
                          <text
                            x={65}
                            y={y + 3.5}
                            textAnchor="end"
                            fill="#71717a"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {Math.round(maxViewsMulti * frac).toLocaleString('fr-FR')}
                          </text>
                        </g>
                      );
                    })}

                    {xCols.map((col) => (
                      <g key={col.key}>
                        <line x1={col.x} y1={padTop} x2={col.x} y2={chartBottom} stroke="#1f2937" strokeDasharray="3 3" />
                        <text
                          x={col.x}
                          y={chartBottom + 20}
                          textAnchor="middle"
                          fill="#d4d4d8"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {col.label}
                        </text>
                      </g>
                    ))}

                    {topTracked.map((r, i) => {
                      const color = palette[i % palette.length];
                      const pts: Array<{ x: number; y: number; views: number }> = [
                        { x: 75, y: getMultiY(0), views: 0 },
                      ];
                      (['h1', 'h5', 'h24', 'h48', 'd7'] as const).forEach((k) => {
                        const cp = r.checkpoints[k];
                        const col = xCols.find((c) => c.key === k)!;
                        if (cp !== undefined) {
                          pts.push({ x: col.x, y: getMultiY(cp.views), views: cp.views });
                        }
                      });
                      // If no checkpoints recorded yet, plot a clean dot at 7j representing current views
                      if (pts.length === 1 && r.currentViews > 0) {
                        pts.push({ x: 790, y: getMultiY(r.currentViews), views: r.currentViews });
                      }
                      const pathD = pts
                        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y.toFixed(1)}`)
                        .join(' ');
                      return (
                        <g key={r.videoId}>
                          <path
                            d={pathD}
                            fill="none"
                            stroke={color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.9"
                          />
                          {pts.slice(1).map((p, idx) => (
                            <circle
                              key={idx}
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              fill={color}
                              stroke="#09090b"
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* Probity Banner */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Règle de probité des données :</strong> Les paliers passés non enregistrés en direct affichent « — ». Aucun relevé n'est inventé rétroactivement.
            </span>
          </div>

          {/* Reference Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                  <th className="py-2.5 px-3">Vidéo</th>
                  <th className="py-2.5 px-3">Date & Heure réelle</th>
                  <th className="py-2.5 px-3">Durée</th>
                  <th className="py-2.5 px-3 text-right">À 1 heure</th>
                  <th className="py-2.5 px-3 text-right">À 5 heures</th>
                  <th className="py-2.5 px-3 text-right">À 24 heures</th>
                  <th className="py-2.5 px-3 text-right">À 48 heures</th>
                  <th className="py-2.5 px-3 text-right">À 7 jours</th>
                  <th className="py-2.5 px-3 text-right font-bold text-white">Vues Actuelles</th>
                  <th className="py-2.5 px-3 text-center">Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredRecords.map((r) => (
                  <tr key={r.videoId} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="font-bold text-zinc-100 truncate">{r.videoTitle}</div>
                      <div className="text-[10px] text-zinc-500">{r.category}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {r.publishedDate} à {String(r.publishedHour).padStart(2, '0')}:00
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {r.durationKnown ? `${r.duration}s` : 'Non fournie'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {r.checkpoints.h1 ? r.checkpoints.h1.views.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {r.checkpoints.h5 ? r.checkpoints.h5.views.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-300 font-semibold">
                      {r.checkpoints.h24 ? r.checkpoints.h24.views.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {r.checkpoints.h48 ? r.checkpoints.h48.views.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                      {r.checkpoints.d7 ? r.checkpoints.d7.views.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-400 font-mono text-sm">
                      {r.currentViews.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedVideoDetails(r)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-rose-300 transition cursor-pointer"
                      >
                        Tableau
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DU TABLEAU DE PROGRESSION DÉTAILLÉE PAR VIDÉO */}
      {selectedVideoDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                    {selectedVideoDetails.category}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Mise en ligne le {selectedVideoDetails.publishedDate} à {String(selectedVideoDetails.publishedHour).padStart(2, '0')}:00 &middot; {selectedVideoDetails.durationKnown ? `${selectedVideoDetails.duration}s` : 'Durée non fournie'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1.5">
                  {selectedVideoDetails.videoTitle}
                </h3>
              </div>

              <button
                onClick={() => setSelectedVideoDetails(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Trajectory Status Banner */}
            {(() => {
              const cp = selectedVideoDetails.checkpoints;
              let trajectoryBadge = 'Progression continue';
              let badgeColor = 'bg-zinc-900 text-zinc-300 border-zinc-700';

              if (cp.h1 && cp.h1.views >= 500) {
                if (cp.h5 && cp.h24 && (cp.h24.views - cp.h5.views < 150)) {
                  trajectoryBadge = 'Ralentissement';
                  badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
                } else if (cp.h48 && cp.h24 && (cp.h48.views - cp.h24.views < 10)) {
                  trajectoryBadge = 'Stagnation';
                  badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/80';
                } else {
                  trajectoryBadge = 'Démarrage rapide';
                  badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/80';
                }
              } else if (cp.h48 && cp.h24 && (cp.h48.views - cp.h24.views > cp.h24.views * 0.4)) {
                trajectoryBadge = 'Seconde vague';
                badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
              }

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Statut de Trajectoire Détecté</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl border ${badgeColor}`}>
                        {trajectoryBadge}
                      </span>
                      <span className="text-xs text-zinc-300">
                        Total actuel : <strong>{selectedVideoDetails.currentViews.toLocaleString('fr-FR')} vues</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 text-right sm:max-w-xs">
                    {trajectoryBadge === 'Démarrage rapide' && 'Forte vélocité initiale captant immédiatement le premier cercle d\'audience.'}
                    {trajectoryBadge === 'Ralentissement' && 'Le gain de vues faiblit après le pic précoce : attention au taux de complétion.'}
                    {trajectoryBadge === 'Stagnation' && 'La vidéo a cessé d\'être distribuée dans le flux Pour Toi (Situation A).'}
                    {trajectoryBadge === 'Seconde vague' && 'Rebond algorithmique à H+24/48 sur une audience affinitaire élargie.'}
                    {trajectoryBadge === 'Progression continue' && 'Croissance régulière et équilibrée sans à-coup.'}
                  </div>
                </div>
              );
            })()}

            {/* THE REQUIRED DETAILED PROGRESSION TABLE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-wider text-[11px]">Tableau de Progression Temporelle</span>
                <span className="text-[10px] italic">Mesures exactes &middot; « — » si non mesuré en direct</span>
              </div>

              <div className="overflow-x-auto border border-zinc-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                      <th className="py-3 px-3.5">Moment</th>
                      <th className="py-3 px-3.5 text-right font-bold text-white">Vues cumulées</th>
                      <th className="py-3 px-3.5 text-right text-amber-300 font-bold">Nouvelles vues depuis le point précédent</th>
                      <th className="py-3 px-3.5 text-right text-rose-300">Likes</th>
                      <th className="py-3 px-3.5 text-right text-indigo-300">Commentaires</th>
                      <th className="py-3 px-3.5 text-right text-emerald-300">Partages</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {(() => {
                      const cp = selectedVideoDetails.checkpoints;
                      const rows = [
                        {
                          moment: '1 heure',
                          views: cp.h1 ? cp.h1.views : null,
                          delta: cp.h1 ? cp.h1.views : null,
                          likes: cp.h1 ? cp.h1.likes : null,
                          comments: cp.h1 ? cp.h1.comments : null,
                          shares: cp.h1 ? cp.h1.shares : null,
                        },
                        {
                          moment: '5 heures',
                          views: cp.h5 ? cp.h5.views : null,
                          delta: cp.h5 && cp.h1 ? (cp.h5.views - cp.h1.views) : cp.h5 ? cp.h5.views : null,
                          likes: cp.h5 ? cp.h5.likes : null,
                          comments: cp.h5 ? cp.h5.comments : null,
                          shares: cp.h5 ? cp.h5.shares : null,
                        },
                        {
                          moment: '24 heures',
                          views: cp.h24 ? cp.h24.views : null,
                          delta: cp.h24 && cp.h5 ? (cp.h24.views - cp.h5.views) : cp.h24 && cp.h1 ? (cp.h24.views - cp.h1.views) : null,
                          likes: cp.h24 ? cp.h24.likes : null,
                          comments: cp.h24 ? cp.h24.comments : null,
                          shares: cp.h24 ? cp.h24.shares : null,
                        },
                        {
                          moment: '48 heures',
                          views: cp.h48 ? cp.h48.views : null,
                          delta: cp.h48 && cp.h24 ? (cp.h48.views - cp.h24.views) : null,
                          likes: cp.h48 ? cp.h48.likes : null,
                          comments: cp.h48 ? cp.h48.comments : null,
                          shares: cp.h48 ? cp.h48.shares : null,
                        },
                        {
                          moment: '7 jours',
                          views: cp.d7 ? cp.d7.views : null,
                          delta: cp.d7 && cp.h48 ? (cp.d7.views - cp.h48.views) : cp.d7 && cp.h24 ? (cp.d7.views - cp.h24.views) : null,
                          likes: cp.d7 ? cp.d7.likes : null,
                          comments: cp.d7 ? cp.d7.comments : null,
                          shares: cp.d7 ? cp.d7.shares : null,
                        },
                      ];

                      return rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3.5 font-sans font-bold text-zinc-300">{row.moment}</td>
                          <td className="py-2.5 px-3.5 text-right font-black text-white">
                            {row.views !== null ? row.views.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-amber-300 font-bold">
                            {row.delta !== null ? `+${row.delta.toLocaleString('fr-FR')}` : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-rose-300">
                            {row.likes !== null ? row.likes.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-indigo-300">
                            {row.comments !== null ? row.comments.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right text-emerald-300">
                            {row.shares !== null ? row.shares.toLocaleString('fr-FR') : '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedVideoDetails(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition cursor-pointer"
              >
                Fermer l'analyse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
