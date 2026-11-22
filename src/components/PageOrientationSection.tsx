import React, { useState } from 'react';
import {
  Compass,
  Music,
  Activity,
  Flame,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  Share2,
  Eye,
  Heart,
  MessageCircle,
  Sliders,
  ChevronDown,
  RotateCcw,
  Check,
  Bookmark,
  Info,
} from 'lucide-react';
import {
  TikTokOfficialVideo,
  PageUniverseId,
  PageOrientationReport,
  PageUniverseStats,
} from '../types';
import {
  computePageOrientationAnalysis,
  getCategoryOverrides,
  saveCategoryOverride,
} from '../utils/orientationEngine';
import { StackedBar } from './ui';

interface PageOrientationSectionProps {
  videos: TikTokOfficialVideo[];
  onSelectVideoForModal?: (video: TikTokOfficialVideo) => void;
}

export const PageOrientationSection: React.FC<PageOrientationSectionProps> = ({
  videos,
  onSelectVideoForModal,
}) => {
  const [overrides, setOverrides] = useState<Record<string, PageUniverseId>>(() =>
    getCategoryOverrides()
  );

  const [activeTab, setActiveTab] = useState<'comparison' | 'editorial' | 'bridges' | 'schedule' | 'qa'>(
    'comparison'
  );

  // Compute the comprehensive orientation report first
  const report: PageOrientationReport = computePageOrientationAnalysis(videos, overrides);
  const nonEmptyUniverses = report.universes.filter((u) => u.videoCount > 0);
  const firstActiveUniverseId = nonEmptyUniverses[0]?.id || report.universes[0]?.id || 'general_mindset';

  const [selectedUniverseId, setSelectedUniverseId] = useState<PageUniverseId>(firstActiveUniverseId);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  // Handle category override
  const handleUpdateCategory = (videoId: string, newCat: PageUniverseId) => {
    saveCategoryOverride(videoId, newCat);
    setOverrides((prev) => ({ ...prev, [videoId]: newCat }));
    setEditingVideoId(null);
  };

  const selectedUniverse =
    report.universes.find((u) => u.id === selectedUniverseId) ||
    nonEmptyUniverses[0] ||
    report.universes[0];

  const leadUniverse = nonEmptyUniverses[0];
  const highestEngUniverse = nonEmptyUniverses.slice().sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0];
  const secondaryUniverse = nonEmptyUniverses[1];

  return (
    <div className="bg-zinc-900/70 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/70 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            Stratégie Éditoriale Multi-Passions
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-50 tracking-tight">
            Orientation de la page
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Analysez les performances réelles de vos différents univers thématiques et organisez leur cohabitation sur un même compte sans perdre la lisibilité éditoriale.
          </p>
        </div>

        {/* Global Feasibility Badge */}
        <div className="bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 rounded-2xl shadow-sm self-start md:self-auto">
          <div className="bg-zinc-900/70 rounded-[14px] px-4 py-2.5 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Verdict éditorial
            </span>
            <span className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1 justify-center mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {report.canCohabitVerdict}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              {report.editorialStrategy.recommendedSplitRatio}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Macro KPI Ribbon computed dynamically from real universes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-rose-300 font-bold uppercase tracking-wider text-[10px]">
            <span>Univers Leader (Vues)</span>
            <Music className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm sm:text-base font-black text-rose-950 mt-1 line-clamp-1">
            {leadUniverse ? leadUniverse.name : 'Aucune donnée'}
          </div>
          <p className="text-[11px] text-rose-300 mt-0.5 font-medium tabular-nums">
            {leadUniverse
              ? `Médiane ${leadUniverse.medianViews.toLocaleString('fr-FR')} vues · ${leadUniverse.shareOfAccountViewsPct}% des vues`
              : 'Synchronisez des vidéos'}
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-emerald-300 font-bold uppercase tracking-wider text-[10px]">
            <span>Meilleur Engagement</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-950 mt-1 line-clamp-1">
            {highestEngUniverse ? highestEngUniverse.name : 'Aucune donnée'}
          </div>
          <p className="text-[11px] text-emerald-300 mt-0.5 font-medium tabular-nums">
            {highestEngUniverse
              ? `${highestEngUniverse.avgEngagementRate}% global · ${highestEngUniverse.videoCount} vidéo(s)`
              : 'Synchronisez des vidéos'}
          </p>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-sky-300 font-bold uppercase tracking-wider text-[10px]">
            <span>Univers Secondaire</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-sm sm:text-base font-black text-sky-950 mt-1 line-clamp-1">
            {secondaryUniverse ? secondaryUniverse.name : 'Mono-univers actuel'}
          </div>
          <p className="text-[11px] text-sky-300 mt-0.5 font-medium tabular-nums">
            {secondaryUniverse
              ? `Médiane ${secondaryUniverse.medianViews.toLocaleString('fr-FR')} vues · ${secondaryUniverse.videoCount} vidéo(s)`
              : 'Classez vos vidéos dans Détails'}
          </p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-purple-300 font-bold uppercase tracking-wider text-[10px]">
            <span>Univers Actifs</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-black text-purple-950 mt-1 tabular-nums">
            {nonEmptyUniverses.length} / {report.universes.length}
          </div>
          <p className="text-[11px] text-purple-300 mt-0.5 font-medium">
            Basé sur {videos.length} publication(s) réelle(s)
          </p>
        </div>
      </div>

      {/* Internal Navigation Subtabs */}
      <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'comparison' as const, label: '1. Analyse par Univers', icon: Layers },
          { id: 'editorial' as const, label: '2. Stratégie de Cohabitation', icon: Compass },
          { id: 'bridges' as const, label: '3. Passerelles & Idées Hybrides', icon: Sparkles, badge: '4 idées' },
          { id: 'schedule' as const, label: '4. Planning de Publication', icon: Calendar },
          { id: 'qa' as const, label: '5. Bilan IA & 6 Questions Clés', icon: Award, badge: 'Recommandé' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-500/15 text-indigo-300' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PERFORMANCES COMPARÉES PAR UNIVERS */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Comparison Table */}
          <div className="border border-zinc-800 rounded-2xl overflow-hidden shadow-sm shadow-black/20">
            <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Tableau de Bord Comparatif des Univers
              </span>
              <span className="text-[11px] text-zinc-400">
                Ne compare pas uniquement les vues totales : analyse médiane & régularité
              </span>
            </div>

            <div className="mb-5 space-y-2.5 px-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Répartition des vues par univers</div>
              <StackedBar
                parts={report.universes
                  .filter((u) => u.totalViews > 0)
                  .map((u) => ({
                    label: u.name,
                    value: u.totalViews,
                    color: u.badgeColor.includes('rose') ? '#fb7185' : u.badgeColor.includes('emerald') ? '#34d399' : u.badgeColor.includes('sky') ? '#38bdf8' : '#a78bfa',
                  }))}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/70">
                    <th className="py-3 px-4">Univers Thématique</th>
                    <th className="py-3 px-3">Vidéos</th>
                    <th className="py-3 px-3">Vues Totales</th>
                    <th className="py-3 px-3">Moyenne</th>
                    <th className="py-3 px-3 font-bold text-zinc-50">Médiane</th>
                    <th className="py-3 px-3">Likes</th>
                    <th className="py-3 px-3">Comms</th>
                    <th className="py-3 px-3">Partages</th>
                    <th className="py-3 px-3">Engagement</th>
                    <th className="py-3 px-3">Part Trafic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 bg-zinc-900/70">
                  {report.universes.map((u) => {
                    const isSelected = selectedUniverseId === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUniverseId(u.id)}
                        className={`hover:bg-zinc-800/60 transition cursor-pointer ${
                          isSelected ? 'bg-indigo-500/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-zinc-50 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${u.badgeColor.includes('rose') ? 'bg-rose-500' : u.badgeColor.includes('emerald') ? 'bg-emerald-500' : u.badgeColor.includes('sky') ? 'bg-sky-500' : 'bg-purple-500'}`} />
                          <span>{u.name}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-zinc-200">{u.videoCount}</td>
                        <td className="py-3 px-3 font-bold text-zinc-50">{u.totalViews.toLocaleString('fr-FR')}</td>
                        <td className="py-3 px-3 text-zinc-300">{u.avgViews.toLocaleString('fr-FR')}</td>
                        <td className="py-3 px-3 font-black text-indigo-400 font-mono text-sm">{u.medianViews.toLocaleString('fr-FR')}</td>
                        <td className="py-3 px-3 text-rose-400 font-medium">{u.totalLikes.toLocaleString('fr-FR')}</td>
                        <td className="py-3 px-3 text-amber-400 font-medium">{u.totalComments}</td>
                        <td className="py-3 px-3 text-indigo-400 font-medium">{u.totalShares}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">{u.avgEngagementRate}%</td>
                        <td className="py-3 px-3">
                          <div className="flex min-w-[120px] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${Math.min(100, Number(u.shareOfAccountViewsPct) || 0)}%` }} />
                            </div>
                            <span className="text-[11px] font-bold tabular-nums text-zinc-200">{u.shareOfAccountViewsPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Universe Detailed Inspection & Video Re-categorization */}
          <div className="bg-zinc-950/50 rounded-2xl p-5 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedUniverse.badgeColor}`}>
                    {selectedUniverse.name}
                  </span>
                  <span className="text-xs text-zinc-400">
                    ({selectedUniverse.videoCount} publications réelles)
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  <strong>Régularité observée :</strong> {selectedUniverse.regularityDescription}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Top Publication</span>
                <span className="text-xs font-bold text-zinc-50 line-clamp-1 max-w-xs">
                  {selectedUniverse.topVideo.title} ({selectedUniverse.topVideo.views.toLocaleString('fr-FR')} vues)
                </span>
              </div>
            </div>

            {/* Video List of this Universe with Manual Override Option */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Publications classées dans cet univers (Cliquez sur la catégorie pour modifier) :
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {selectedUniverse.sampleVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs flex flex-col justify-between space-y-2 shadow-sm shadow-black/20"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                        <span>{new Date(vid.createTime * 1000).toLocaleDateString('fr-FR')}</span>
                        <span>{vid.duration > 0 ? `${vid.duration}s` : 'Durée n/c'}</span>
                      </div>
                      <h5 className="font-bold text-zinc-50 line-clamp-2 leading-snug">
                        {vid.title}
                      </h5>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">{vid.views.toLocaleString('fr-FR')} vues</span>
                        <span className="text-rose-400 font-semibold">{vid.likes} likes</span>
                      </div>

                      {editingVideoId === vid.id ? (
                        <select
                          value={selectedUniverse.id}
                          onChange={(e) => handleUpdateCategory(vid.id, e.target.value as PageUniverseId)}
                          className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5"
                          autoFocus
                          onBlur={() => setEditingVideoId(null)}
                        >
                          <option value="musique_starac">Musique / Star Ac</option>
                          <option value="running_trail">Trail & Running</option>
                          <option value="cyclisme_velo">Cyclisme & Vélo</option>
                          <option value="general_mindset">Mindset / Autre</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingVideoId(vid.id)}
                          className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
                          title="Modifier la catégorie de cette vidéo"
                        >
                          Changer univers
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STRATÉGIE DE COHABITATION ÉDITORIALE */}
      {activeTab === 'editorial' && (
        <div className="space-y-6 text-xs">
          {/* Main Philosophy Card */}
          <div className="bg-indigo-950 text-white rounded-2xl p-6 border border-indigo-900 shadow-md space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Principe Fondateur du Conseiller Éditorial
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              « Ne sacrifiez aucun de vos centres d'intérêt : organisez leur cohabitation. »
            </h3>
            <p className="text-zinc-400 leading-relaxed text-xs sm:text-sm">
              Ne sacrifiez pas un thème secondaire au profit exclusif d’un seul pic de vues isolé. Une chaîne mono-sujet devient vulnérable à la saisonnalité ; l’important est de garder une promesse lisible sur votre profil et de comparer chaque vidéo à la médiane de sa propre catégorie.
            </p>
          </div>

          {/* Editorial Strategy Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Répartition Cible
              </span>
              <h4 className="font-extrabold text-sm text-zinc-50">
                {report.editorialStrategy.recommendedSplitRatio}
              </h4>
              <p className="text-zinc-300 leading-relaxed">
                {report.editorialStrategy.alternationPattern}
              </p>
            </div>

            <div className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-2.5">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Stratégie de Transition
              </span>
              <h4 className="font-extrabold text-sm text-zinc-50">
                La Musique comme Vecteur d'Immersion
              </h4>
              <p className="text-zinc-300 leading-relaxed">
                {report.editorialStrategy.transitionStrategy}
              </p>
            </div>
          </div>

          {/* Audience Preservation Tips */}
          <div className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h4 className="font-bold text-zinc-50 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Règles Pratiques pour Ne Pas Faire Fuir Vos Abonnés
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.editorialStrategy.audiencePreservationTips.map((tip, i) => (
                <div key={i} className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex items-start gap-2 text-zinc-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PASSERELLES & IDÉES HYBRIDES */}
      {activeTab === 'bridges' && (
        <div className="space-y-6 text-xs">
          <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800 space-y-1">
            <h3 className="font-bold text-zinc-50 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Créer des Passerelles Naturelles Entre Vos Passions
            </h3>
            <p className="text-zinc-300">
              Des concepts de vidéos conçus spécifiquement pour plaire <strong>à la fois</strong> aux amateurs de musique et aux passionnés d'endurance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.bridgeIdeas.map((idea, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/70 p-5 rounded-2xl border border-zinc-800 hover:border-indigo-500/30 shadow-sm shadow-black/20 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-bold text-[10px] uppercase">
                      Passerelle #{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 capitalize">
                      {idea.bridgeType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-50">
                    {idea.title}
                  </h4>

                  <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 text-amber-950 font-medium">
                    <span className="text-[10px] font-bold uppercase text-amber-300 block">Accroche recommandée :</span>
                    <p className="mt-0.5">{idea.hookConcept}</p>
                  </div>

                  <p className="text-zinc-300 leading-relaxed pt-1">
                    {idea.whyItWorks}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-zinc-400 text-[11px]">
                  <span>Son conseillé : <strong className="text-zinc-100">{idea.recommendedSound}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PLANNING HEBDOMADAIRE & PROTOCOLE DE TEST */}
      {activeTab === 'schedule' && (
        <div className="space-y-6 text-xs">
          <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h3 className="font-bold text-zinc-50 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Proposition de Rythme Éditorial Hebdomadaire
            </h3>
            <p className="text-zinc-300">
              Une alternance calculée pour maximiser la découverte sans créer de lassitude.
            </p>

            <div className="space-y-2 pt-2">
              {report.publicationRoadmap.weeklyScheduleSuggestion.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-zinc-300">
                  Aucun créneau fixe n’est inventé ici : consultez l’onglet <strong>Agenda</strong> dans <strong>Analytics</strong> pour voir uniquement les jours qualifiés par vos données réelles.
                </div>
              ) : (
                report.publicationRoadmap.weeklyScheduleSuggestion.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-24 font-bold text-zinc-50">{item.day}</span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900/70 border border-zinc-800 font-bold text-indigo-300 text-[10px]">
                        {item.universe}
                      </span>
                      <span className="text-zinc-200">{item.focusFormat}</span>
                    </div>

                    <span className="text-zinc-400 font-mono text-[11px] bg-zinc-800 px-2 py-0.5 rounded self-start sm:self-auto">
                      Créneau : {item.slot}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-emerald-950 mt-4">
              <span className="font-bold text-[10px] uppercase text-emerald-300 block">
                Protocole de Test Progressif (3 semaines)
              </span>
              <p className="mt-0.5 leading-relaxed">
                {report.publicationRoadmap.progressiveTestProtocol}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BILAN STRATÉGIQUE DE L'IA (LES 6 QUESTIONS OBLIGATOIRES) */}
      {activeTab === 'qa' && (
        <div className="space-y-4 text-xs">
          <div className="bg-zinc-950/70 text-white rounded-2xl p-5 border border-zinc-800 space-y-1">
            <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block">
              Synthèse Déontologique du Coach
            </span>
            <h3 className="text-base font-bold text-white">
              Réponses Argumentées aux 6 Questions Clés de votre Ligne Éditoriale
            </h3>
            <p className="text-zinc-400 text-xs">
              Distinction rigoureuse des faits statistiques réels, des observations constatées et des recommandations actionnables.
            </p>
          </div>

          <div className="space-y-3">
            {/* Q1 */}
            <div className="bg-zinc-900/70 p-4.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 font-bold text-[10px] uppercase tracking-wider">
                1. Univers le Plus Performant (Volume Brut)
              </span>
              <p className="text-zinc-100 leading-relaxed font-medium">
                {report.answersToMandatoryQuestions.q1_top_performer}
              </p>
            </div>

            {/* Q2 */}
            <div className="bg-zinc-900/70 p-4.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
                2. Univers à Plus Fort Potentiel de Développement & Régularité
              </span>
              <p className="text-zinc-100 leading-relaxed font-medium">
                {report.answersToMandatoryQuestions.q2_growth_potential}
              </p>
            </div>

            {/* Q3 */}
            <div className="bg-zinc-900/70 p-4.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
                3. Cohabitation sur une Seule Page ?
              </span>
              <p className="text-zinc-100 leading-relaxed font-medium">
                {report.answersToMandatoryQuestions.q3_can_cohabit}
              </p>
            </div>

            {/* Q4 */}
            <div className="bg-zinc-900/70 p-4.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 font-bold text-[10px] uppercase tracking-wider">
                4. Risques de la Stratégie Actuelle
              </span>
              <p className="text-zinc-100 leading-relaxed font-medium">
                {report.answersToMandatoryQuestions.q4_current_risks}
              </p>
            </div>

            {/* Q5 */}
            <div className="bg-zinc-900/70 p-4.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                5. Développer le 2e Univers Sans Perdre le 1er
              </span>
              <p className="text-zinc-100 leading-relaxed font-medium">
                {report.answersToMandatoryQuestions.q5_develop_second_without_losing_first}
              </p>
            </div>

            {/* Q6 */}
            <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30 shadow-sm shadow-black/20 space-y-2.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
                6. Les Trois Prochaines Actions Recommandées
              </span>
              <ul className="space-y-2">
                {report.answersToMandatoryQuestions.q6_three_next_actions.map((act, i) => (
                  <li key={i} className="bg-zinc-900/70 p-3 rounded-xl border border-emerald-500/30 font-semibold text-zinc-50 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
