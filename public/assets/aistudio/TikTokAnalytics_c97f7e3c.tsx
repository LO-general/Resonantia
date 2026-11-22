import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Calendar,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Award,
  Zap,
  Info,
  Sliders,
  Check,
  ShieldCheck,
  User,
  ExternalLink,
  Layers,
  ArrowUpRight,
  ArrowRight,
  Filter,
  History,
  Tag,
  Video,
  Compass,
  Bookmark,
  Users,
  X,
} from 'lucide-react';
import {
  ContentItem,
  ContentMode,
  ContentNature,
  CounterCorrectionLog,
  TikTokAccountData,
  TikTokOfficialVideo,
  TikTokMetricSnapshot,
  VideoEditorialMetadata,
} from '../types';
import {
  getAllVideoEditorialMeta,
  getCounterCorrectionLogs,
  saveVideoEditorialMeta,
} from '../services/db';
import {
  saveTikTokSnapshotToFirestore,
  getTikTokSnapshotsFromFirestore,
  getTikTokVideosFromFirestore,
} from '../services/firebase';
import { TikTokAccountConnector, TikTokProfile } from './TikTokAccountConnector';
import {
  unifyVideoData,
  computeFairComparisons,
} from '../utils/analyticsEngine';
import {
  computeCentralAccountAnalytics,
  computeMean,
  computeMedian,
  inferVideoContentNature,
  safePercent,
} from '../utils/centralDataEngine';
import { VideoDetailCausalModal } from './VideoDetailCausalModal';
import { PageOrientationSection } from './PageOrientationSection';
import { WeeklyScheduleAgenda } from './WeeklyScheduleAgenda';
import { TemporalTrackingSection } from './TemporalTrackingSection';
import { MetricDetailModal, MetricDetailKey } from './MetricDetailModal';
import { AnimatedNumber, BarChart, DonutChart, MeterBar, Reveal, Sparkline } from './ui';

interface TikTokAnalyticsProps {
  contentItems: ContentItem[];
  onRefresh: () => void;
  onNavigateCoach?: () => void;
  onNavigateTab?: (tab: any) => void;
  initialOfficialVideos?: TikTokOfficialVideo[];
  initialAccount?: TikTokAccountData | null;
  contentMode?: ContentMode | null;
  onMetadataUpdated?: () => void | Promise<void>;
}

const STORAGE_KEY = 'tiktok_connected_profile';

type AnalyticsTab = 'dashboard' | 'agenda' | 'temporal_duration' | 'orientation' | 'fair_comparisons' | 'video_list';

export const TikTokAnalytics: React.FC<TikTokAnalyticsProps> = ({
  contentItems,
  onRefresh,
  onNavigateCoach,
  onNavigateTab,
  initialOfficialVideos,
  initialAccount,
  contentMode,
  onMetadataUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsTab>('dashboard');

  // Connected account state (can be official TikTokAccountData or manual TikTokProfile)
  const [connectedAccount, setConnectedAccount] = useState<TikTokAccountData | null>(() => {
    if (initialAccount?.openId) return initialAccount;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.openId ? parsed : null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [connectedProfile, setConnectedProfile] = useState<TikTokProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !parsed.openId && parsed.handle ? parsed : null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  // Official TikTok API Videos (from video.list)
  const [officialVideos, setOfficialVideos] = useState<TikTokOfficialVideo[]>(() => {
    return initialOfficialVideos && initialOfficialVideos.length > 0 ? initialOfficialVideos : [];
  });
  const [metricSnapshots, setMetricSnapshots] = useState<TikTokMetricSnapshot[]>([]);

  // Keep state synchronized with parent props
  useEffect(() => {
    if (initialOfficialVideos && initialOfficialVideos.length > 0) {
      setOfficialVideos(initialOfficialVideos);
    }
  }, [initialOfficialVideos]);

  useEffect(() => {
    if (initialAccount?.openId) {
      setConnectedAccount(initialAccount);
    }
  }, [initialAccount]);

  // Source Filter: 'all' | 'official' | 'manual'
  const [sourceFilter, setSourceFilter] = useState<'all' | 'official' | 'manual'>('all');
  // Creation / Repost / Global filter
  const [contentFilter, setContentFilter] = useState<ContentMode>(() => contentMode || 'both');
  const [editorialMap, setEditorialMap] = useState<Record<string, VideoEditorialMetadata>>({});
  const [counterCorrections, setCounterCorrections] = useState<CounterCorrectionLog[]>([]);
  const [metaRefreshTick, setMetaRefreshTick] = useState(0);
  const [quickSavedVideoId, setQuickSavedVideoId] = useState<string | null>(null);

  // Explicit Video Sort Option
  const [videoSortBy, setVideoSortBy] = useState<
    | 'views_desc'
    | 'views_asc'
    | 'ratio_likes_desc'
    | 'ratio_likes_asc'
    | 'ratio_comments_desc'
    | 'ratio_shares_desc'
    | 'date_desc'
    | 'date_asc'
  >('views_desc');

  // Refresh state
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Selected video for deep causal analysis modal
  const [selectedCausalVideo, setSelectedCausalVideo] = useState<TikTokOfficialVideo | null>(null);

  // Selected KPI metric for educational formula & definition modal
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<MetricDetailKey | null>(null);

  // Granular Time Slot and Comparison UI State
  const [fairSortBy, setFairSortBy] = useState<'velocity' | 'views' | 'engagement' | 'recent'>('velocity');
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';

  const [syncNotice, setSyncNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
    action?: 'reconnect';
  } | null>(null);

  useEffect(() => {
    if (contentMode) {
      setContentFilter(contentMode);
    }
  }, [contentMode]);

  useEffect(() => {
    getAllVideoEditorialMeta().then(setEditorialMap);
  }, [metaRefreshTick, officialVideos.length]);

  const handleQuickNatureChange = async (videoId: string, nextNature: ContentNature) => {
    const existing = editorialMap[videoId];
    const updated: VideoEditorialMetadata = {
      ...(existing || {}),
      videoId,
      contentNature: nextNature,
      updatedAt: new Date().toISOString(),
    };
    setEditorialMap((prev) => ({ ...prev, [videoId]: updated }));
    await saveVideoEditorialMeta(updated);
    setQuickSavedVideoId(videoId);
    setTimeout(() => {
      setQuickSavedVideoId((curr) => (curr === videoId ? null : curr));
    }, 2000);
    setMetaRefreshTick((t) => t + 1);
    if (onMetadataUpdated) {
      await onMetadataUpdated();
    }
  };

  // Load official videos and snapshots on mount with server session fallback
  useEffect(() => {
    const initData = async () => {
      let openId = connectedAccount?.openId;

      if (!openId) {
        try {
          const statusRes = await fetch('/api/tiktok/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.account) {
              setConnectedAccount(statusData.account);
              openId = statusData.account.openId;
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(statusData.account));
              } catch (e) {}
            }
          }
        } catch (e) {
          console.warn('Status check failed:', e);
        }
      }

      try {
        const videoEndpoint = openId
          ? `/api/tiktok/videos?open_id=${encodeURIComponent(openId)}`
          : '/api/tiktok/videos';
        const vRes = await fetch(videoEndpoint);
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.videos && vData.videos.length > 0) {
            setOfficialVideos(vData.videos);
          } else if (openId) {
            const fallbackVideos = await getTikTokVideosFromFirestore(openId);
            setOfficialVideos(fallbackVideos);
          }
        } else if (openId) {
          const fallbackVideos = await getTikTokVideosFromFirestore(openId);
          setOfficialVideos(fallbackVideos);
        }

        if (openId) {
          const [fallbackSnaps, corrections] = await Promise.all([
            getTikTokSnapshotsFromFirestore(openId),
            getCounterCorrectionLogs(openId),
          ]);
          setMetricSnapshots(fallbackSnaps);
          setCounterCorrections(corrections);
        }
      } catch (err) {
        console.error('Failed to load official TikTok data:', err);
      }
    };

    initData();
  }, [connectedAccount?.openId]);

  const loadOfficialData = async (openId: string) => {
    try {
      const vRes = await fetch(`/api/tiktok/videos?open_id=${encodeURIComponent(openId)}`);
      if (vRes.ok) {
        const vData = await vRes.json();
        setOfficialVideos(vData.videos || []);
      }
      const [snaps, corrections] = await Promise.all([
        getTikTokSnapshotsFromFirestore(openId),
        getCounterCorrectionLogs(openId),
      ]);
      setMetricSnapshots(snaps);
      setCounterCorrections(corrections);
    } catch (err) {
      console.error('Failed to load official videos:', err);
    }
  };

  const handleAccountConnected = (account: TikTokAccountData | TikTokProfile | null) => {
    if (!account) {
      setConnectedAccount(null);
      setConnectedProfile(null);
      setOfficialVideos([]);
      setMetricSnapshots([]);
      return;
    }

    if ('openId' in account && account.openId) {
      setConnectedAccount(account as TikTokAccountData);
      setConnectedProfile(null);
      loadOfficialData(account.openId);
    } else {
      setConnectedProfile(account as TikTokProfile);
      setConnectedAccount(null);
      setOfficialVideos([]);
    }
  };

  const handleSyncComplete = async (videos: TikTokOfficialVideo[], summary: any) => {
    if (!videos || videos.length === 0) return;
    setOfficialVideos(videos);

    if (connectedAccount?.openId && videos.length > 0) {
      const fetchDate = new Date().toISOString();
      for (const v of videos) {
        const snap: TikTokMetricSnapshot = {
          id: `snap_${v.id}_${Date.now()}`,
          accountId: connectedAccount.openId,
          videoId: v.id,
          videoTitle: v.title,
          fetchDate,
          views: v.viewCount,
          likes: v.likeCount,
          comments: v.commentCount,
          shares: v.shareCount,
          engagementRate: v.engagementRate,
          source: 'official_api',
          checkpointType: 'current',
        };
        await saveTikTokSnapshotToFirestore(snap);
      }

      const updatedSnapshots = await getTikTokSnapshotsFromFirestore(connectedAccount.openId);
      setMetricSnapshots(updatedSnapshots);
    }
  };

  // Refresh action with live TikTok background sync
  const handleRefreshClick = async () => {
    setIsRefreshingStats(true);
    setSyncNotice(null);
    onRefresh();

    try {
      const syncRes = await fetch('/api/tiktok/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.videos && syncData.videos.length > 0) {
          await handleSyncComplete(syncData.videos, syncData.summary);
          setSyncNotice({
            type: 'success',
            message: `Actualisation réussie : ${syncData.videos.length} vidéos TikTok synchronisées avec leurs dernières vues !`,
          });
          setIsRefreshingStats(false);
          return;
        }
      } else {
        const errJson = await syncRes.json().catch(() => ({}));
        if (errJson.requiresReauth) {
          setSyncNotice({
            type: 'warning',
            message: 'Votre session TikTok a expiré. Cliquez ci-dessous pour reconnecter votre compte.',
            action: 'reconnect',
          });
        }
      }
    } catch (err) {
      console.warn('Live sync fallback:', err);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  // Layer 1 Central Calculations (Creation / Repost / Global scoped)
  const snapshotsMap = useMemo(() => {
    const map: Record<string, TikTokMetricSnapshot[]> = {};
    for (const s of metricSnapshots) {
      if (!map[s.videoId]) map[s.videoId] = [];
      map[s.videoId].push(s);
    }
    return map;
  }, [metricSnapshots]);

  const centralAnalytics = useMemo(
    () =>
      computeCentralAccountAnalytics({
        videos: officialVideos,
        account: connectedAccount,
        filterMode: contentFilter,
        editorialMap,
        snapshotsMap,
      }),
    [officialVideos, connectedAccount, contentFilter, editorialMap, snapshotsMap]
  );

  const filteredOfficialVideos = useMemo(() => {
    if (contentFilter === 'both') return officialVideos;
    return officialVideos.filter(
      (v) => inferVideoContentNature(v, editorialMap) === contentFilter
    );
  }, [officialVideos, contentFilter, editorialMap]);

  const unifiedVideos = useMemo(
    () => unifyVideoData(filteredOfficialVideos, contentItems),
    [filteredOfficialVideos, contentItems]
  );

  const totalVideosCount = unifiedVideos.length;
  const totalViews = unifiedVideos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalLikes = unifiedVideos.reduce((acc, v) => acc + v.likeCount, 0);
  const totalComments = unifiedVideos.reduce((acc, v) => acc + v.commentCount, 0);
  const totalShares = unifiedVideos.reduce((acc, v) => acc + v.shareCount, 0);
  const totalInteractions = totalLikes + totalComments + totalShares;
  const averageEngagementRate = safePercent(totalInteractions, totalViews, 2) ?? 0;
  const followerCount = connectedAccount?.followerCount ?? 0;

  // Global consolidated vs per-video median & mean calculations
  const likesToViewsRatio = safePercent(totalLikes, totalViews, 2) ?? 0;
  const commentsToViewsRatio = safePercent(totalComments, totalViews, 3) ?? 0;
  const sharesToViewsRatio = safePercent(totalShares, totalViews, 3) ?? 0;

  const viewsArray = unifiedVideos.map((v) => v.viewCount);
  const avgViews = Math.round(computeMean(viewsArray));
  const medianViews = Math.round(computeMedian(viewsArray));

  const perVideoRates = unifiedVideos
    .filter((v) => v.viewCount > 0)
    .map((v) => ({
      like: (v.likeCount / v.viewCount) * 100,
      comment: (v.commentCount / v.viewCount) * 100,
      share: (v.shareCount / v.viewCount) * 100,
      eng: ((v.likeCount + v.commentCount + v.shareCount) / v.viewCount) * 100,
    }));

  const medianLikesToViewsRatio = Number(computeMedian(perVideoRates.map((r) => r.like)).toFixed(2));
  const medianCommentsToViewsRatio = Number(computeMedian(perVideoRates.map((r) => r.comment)).toFixed(2));
  const medianSharesToViewsRatio = Number(computeMedian(perVideoRates.map((r) => r.share)).toFixed(2));
  const perVideoMeanEngagementRate = Number(computeMean(perVideoRates.map((r) => r.eng)).toFixed(2));
  const perVideoMedianEngagementRate = Number(computeMedian(perVideoRates.map((r) => r.eng)).toFixed(2));

  const followersEngagementRate = safePercent(totalInteractions, followerCount, 1) ?? 0;

  // Filter and sort publications actively based on explicit direction labels
  const filteredAndSortedVideos = useMemo(() => {
    const list = unifiedVideos.filter((v) => {
      if (sourceFilter === 'official') return v.source === 'official_api';
      if (sourceFilter === 'manual') return v.source === 'manual';
      return true;
    });

    return [...list].sort((a, b) => {
      const aLikeRatio = a.viewCount > 0 ? a.likeCount / a.viewCount : 0;
      const bLikeRatio = b.viewCount > 0 ? b.likeCount / b.viewCount : 0;
      const aCommRatio = a.viewCount > 0 ? a.commentCount / a.viewCount : 0;
      const bCommRatio = b.viewCount > 0 ? b.commentCount / b.viewCount : 0;
      const aShareRatio = a.viewCount > 0 ? a.shareCount / a.viewCount : 0;
      const bShareRatio = b.viewCount > 0 ? b.shareCount / b.viewCount : 0;

      switch (videoSortBy) {
        case 'views_desc':
          return b.viewCount - a.viewCount;
        case 'views_asc':
          return a.viewCount - b.viewCount;
        case 'ratio_likes_desc':
          return bLikeRatio - aLikeRatio;
        case 'ratio_likes_asc':
          return aLikeRatio - bLikeRatio;
        case 'ratio_comments_desc':
          return bCommRatio - aCommRatio;
        case 'ratio_shares_desc':
          return bShareRatio - aShareRatio;
        case 'date_desc':
          return b.timestampMs - a.timestampMs;
        case 'date_asc':
          return a.timestampMs - b.timestampMs;
        default:
          return b.viewCount - a.viewCount;
      }
    });
  }, [unifiedVideos, sourceFilter, videoSortBy]);

  const fairComparisons = computeFairComparisons(unifiedVideos, metricSnapshots, userTimeZone);
  const sortedFairComparisons = [...fairComparisons].sort((a, b) => {
    if (fairSortBy === 'velocity') return b.viewsPerDay - a.viewsPerDay;
    if (fairSortBy === 'views') return b.views - a.views;
    if (fairSortBy === 'engagement') return b.engagementRate - a.engagementRate;
    return b.viewsPerHour - a.viewsPerHour;
  });

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-rose-500/30 selection:text-white space-y-8 pb-16">
      {/* Subtle ambient light backgrounds matching Étape 1 & 2 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[32rem] h-[32rem] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Top Header Banner */}
      <div className="surface relative z-10 overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tableau de Bord &bull; TikTok Analytics &bull; Données Réelles</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
            Observation des <span className="gradient-text">Performances Réelles</span> du Compte
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            Consultez vos statistiques globales, votre ratio likes/vues, l'évolution temporelle de vos publications (1h, 5h, 24h, 48h, 7j)
            et l'agenda hebdomadaire des créneaux qualifiés <strong>« POSTER ICI »</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshingStats}
            title="Actualiser les données en direct"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 font-bold text-xs bg-zinc-950 hover:bg-zinc-800 text-zinc-200 shadow-sm shadow-black/20 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshingStats ? 'animate-spin' : ''}`} />
            <span>{isRefreshingStats ? 'Actualisation...' : 'Actualiser les données'}</span>
          </button>

          {onNavigateCoach && (
            <button
              onClick={onNavigateCoach}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 font-bold text-xs text-white shadow-md shadow-rose-950 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Consulter Mon Coach TikTok</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sync Notice Alert */}
      {syncNotice && (
        <div
          className={`relative z-10 p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn ${
            syncNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{syncNotice.message}</span>
          </div>
          <button
            onClick={() => setSyncNotice(null)}
            className="text-xs underline opacity-70 hover:opacity-100 cursor-pointer self-end sm:self-auto"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Creation / Repost / Global Neutral Segmented Filter Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-300">Périmètre d’analyse :</span>
          <div className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            {(
              [
                { key: 'both', label: `Global (${officialVideos.length})` },
                { key: 'creation', label: `Création (${centralAnalytics.creationCount})` },
                { key: 'repost', label: `Repost (${centralAnalytics.repostCount})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setContentFilter(opt.key)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  contentFilter === opt.key
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-2 font-mono tabular-nums">
          <span>
            Favoris :{' '}
            <strong className="text-zinc-200">
              {centralAnalytics.totalFavorites !== null
                ? `${centralAnalytics.totalFavorites.toLocaleString('fr-FR')} (${centralAnalytics.favoritesAvailableCount} vid.)`
                : 'Non fourni par l’API'}
            </strong>
          </span>
        </div>
      </div>

      {/* Global Metrics Bar with Multi-Color Theming & Interactive Definition Modals */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 tabular-nums">
        {/* Metric 1: Vues Globales (Cyan) */}
        <div
          onClick={() => setSelectedMetricDetail('views')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-cyan-950/25 to-zinc-900/90 border border-cyan-500/30 hover:border-cyan-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-cyan-300">
            <span className="font-semibold">Vues globales</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-cyan-400/70 group-hover:text-cyan-300 transition" />
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-2">
            <AnimatedNumber value={totalViews} />
          </div>
          <div className="text-[10px] text-cyan-200/70 mt-1 flex items-center justify-between">
            <span>{totalVideosCount} vidéos analysées</span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>

        {/* Metric 2: Ratio Likes / Vues (Rose) */}
        <div
          onClick={() => setSelectedMetricDetail('likes_ratio')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-rose-950/25 to-zinc-900/90 border border-rose-500/30 hover:border-rose-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="font-semibold">Ratio Likes / Vues</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-rose-400/70 group-hover:text-rose-300 transition" />
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-2">
            <AnimatedNumber value={Number(likesToViewsRatio) || 0} decimals={2} suffix="%" />
          </div>
          <div className="text-[10px] text-rose-200/70 mt-1 flex items-center justify-between">
            <span>Méd. : <strong className="text-rose-300">{medianLikesToViewsRatio}%</strong></span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>

        {/* Metric 3: Taux Commentaires (Indigo) */}
        <div
          onClick={() => setSelectedMetricDetail('comments_rate')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-indigo-950/25 to-zinc-900/90 border border-indigo-500/30 hover:border-indigo-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span className="font-semibold">Taux Commentaires</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-400/70 group-hover:text-indigo-300 transition" />
              <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-2">
            <AnimatedNumber value={Number(commentsToViewsRatio) || 0} decimals={2} suffix="%" />
          </div>
          <div className="text-[10px] text-indigo-200/70 mt-1 flex items-center justify-between">
            <span>{totalComments.toLocaleString('fr-FR')} comms</span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>

        {/* Metric 4: Taux de Partages (Emerald) */}
        <div
          onClick={() => setSelectedMetricDetail('shares_rate')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-emerald-950/25 to-zinc-900/90 border border-emerald-500/30 hover:border-emerald-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-semibold">Taux de Partages</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-emerald-400/70 group-hover:text-emerald-300 transition" />
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-2">
            <AnimatedNumber value={Number(sharesToViewsRatio) || 0} decimals={2} suffix="%" />
          </div>
          <div className="text-[10px] text-emerald-200/70 mt-1 flex items-center justify-between">
            <span>{totalShares.toLocaleString('fr-FR')} partages</span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>

        {/* Metric 5: Abonnés (Amber) */}
        <div
          onClick={() => setSelectedMetricDetail('followers')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-amber-950/25 to-zinc-900/90 border border-amber-500/30 hover:border-amber-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="font-semibold">Abonnés</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-amber-400/70 group-hover:text-amber-300 transition" />
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 mt-2">
            <AnimatedNumber value={followerCount} />
          </div>
          <div className="text-[10px] text-amber-200/70 mt-1 flex items-center justify-between">
            <span>Compte vérifié</span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>

        {/* Metric 6: Engagement Global (Purple) */}
        <div
          onClick={() => setSelectedMetricDetail('global_engagement')}
          className="group hover:-translate-y-1 hover:shadow-xl bg-gradient-to-b from-purple-950/25 to-zinc-900/90 border border-purple-500/30 hover:border-purple-400/80 rounded-2xl p-4 shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02]"
          title="Cliquer pour afficher la formule et la définition certifiée"
        >
          <div className="flex items-center justify-between text-xs text-purple-300">
            <span className="font-semibold">Engagement Global</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-purple-400/70 group-hover:text-purple-300 transition" />
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 mt-2">
            <AnimatedNumber value={Number(averageEngagementRate) || 0} decimals={2} suffix="%" />
          </div>
          <div className="text-[10px] text-purple-200/70 mt-1 flex items-center justify-between">
            <span>{followersEngagementRate}% sur abonnés</span>
            <span className="text-[9px] underline underline-offset-2 opacity-80 group-hover:opacity-100">Fiche (i)</span>
          </div>
        </div>
      </div>

      {/* Aperçu vivant : tendance des vues + top vidéos (données réelles uniquement) */}
      {unifiedVideos.length > 1 && (() => {
        const chrono = [...unifiedVideos]
          .sort((a, b) => Number((a as any).createTime || 0) - Number((b as any).createTime || 0))
          .slice(-20);
        const trendData = chrono.map((v) => v.viewCount || 0);
        const trendLabels = chrono.map((v) => {
          const ct = Number((v as any).createTime || 0);
          return ct ? new Date(ct * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
        });
        const top = [...unifiedVideos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 8);
        return (
          <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="surface p-5 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <TrendingUp className="h-4 w-4 text-rose-400" />
                  <span>Tes vues, vidéo après vidéo</span>
                </div>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-2.5 py-0.5 text-[11px] text-zinc-400">
                  {chrono.length} dernières
                </span>
              </div>
              <Sparkline data={trendData} labels={trendLabels} color="#fb7185" height={130} formatValue={(v) => `${v.toLocaleString('fr-FR')} vues`} />
              <p className="mt-2 text-[11px] text-zinc-500">Survole la courbe pour voir chaque vidéo. Médiane : {medianViews.toLocaleString('fr-FR')} vues.</p>
            </div>
            <div className="surface p-5 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Ton top {top.length}</span>
              </div>
              <BarChart
                data={top.map((v, i) => ({ label: `#${i + 1}`, value: v.viewCount || 0 }))}
                height={130}
                formatValue={(v) => `${v.toLocaleString('fr-FR')} vues`}
              />
            </div>
          </div>
        );
      })()}

      {/* Lecture visuelle des pourcentages : répartition des interactions + trois lectures de l'engagement */}
      {totalViews > 0 && totalInteractions > 0 && (() => {
        const eg = Number(averageEngagementRate) || 0;
        const em = Number(perVideoMeanEngagementRate) || 0;
        const ed = Number(perVideoMedianEngagementRate) || 0;
        const scaleEng = Math.max(eg, em, ed, 0.01) * 1.25;
        const lk = Number(likesToViewsRatio) || 0;
        const cm = Number(commentsToViewsRatio) || 0;
        const sh = Number(sharesToViewsRatio) || 0;
        const scaleRatio = Math.max(lk, cm, sh, 0.01) * 1.25;
        return (
          <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="surface p-5">
              <div className="mb-4 text-sm font-bold text-white">Répartition des interactions</div>
              <DonutChart
                segments={[
                  { label: 'Likes', value: totalLikes, color: '#fb7185' },
                  { label: 'Commentaires', value: totalComments, color: '#818cf8' },
                  { label: 'Partages', value: totalShares, color: '#34d399' },
                ]}
                centerValue={`${eg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`}
                centerLabel="engagement global"
              />
            </div>
            <div className="surface space-y-5 p-5">
              <div className="text-sm font-bold text-white">Engagement : trois lectures</div>
              <div className="space-y-4">
                <MeterBar label="Global consolidé" value={eg} max={scaleEng} color="#fbbf24" hint="Toutes vidéos confondues" />
                <MeterBar label="Moyenne par vidéo" value={em} max={scaleEng} color="#a78bfa" hint="Chaque vidéo pèse pareil" />
                <MeterBar label="Médiane par vidéo" value={ed} max={scaleEng} color="#34d399" hint="La vidéo « du milieu »" />
              </div>
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                <MeterBar label="Likes / vues" value={lk} max={scaleRatio} color="#fb7185" decimals={2} />
                <MeterBar label="Commentaires / vues" value={cm} max={scaleRatio} color="#818cf8" decimals={3} />
                <MeterBar label="Partages / vues" value={sh} max={scaleRatio} color="#34d399" decimals={3} />
              </div>
              <p className="text-[10px] text-zinc-500">Les barres d'un même groupe partagent la même échelle : elles se comparent entre elles.</p>
            </div>
          </div>
        );
      })()}

      {/* Sub-Navigation Tabs (Multi-Color Harmonious Accents: Emerald, Amber, Rose, Indigo, Purple, Cyan) */}
      <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 backdrop-blur-md">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Vue Synthétique</span>
        </button>

        <button
          onClick={() => setActiveSubTab('agenda')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'agenda'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Agenda Hebdomadaire (POSTER ICI)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('temporal_duration')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'temporal_duration'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Suivi Temporel (1h-7j) &amp; Formats</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orientation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'orientation'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Orientation de la Page (Musique vs Sport)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fair_comparisons')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'fair_comparisons'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Vélocité &amp; Comparaisons Équitables</span>
        </button>

        <button
          onClick={() => setActiveSubTab('video_list')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubTab === 'video_list'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Publications ({unifiedVideos.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: SYNTHÈSE & VUE SIMPLIFIÉE */}
      {activeSubTab === 'dashboard' && (
        <div className="relative z-10 space-y-8 animate-fadeIn">
          {/* SECTION 1 : OBSERVATION DES PERFORMANCES RÉELLES DU COMPTE & FORMULE OFFICIELLE */}
          <div className="surface p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Observation des Performances Réelles du Compte ({connectedAccount?.username || connectedProfile?.handle || 'Compte connecté'})
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Statistiques consolidées sur {totalVideosCount} publications &middot; Médiane {medianViews.toLocaleString('fr-FR')} vues (Moy. {avgViews.toLocaleString('fr-FR')})
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 self-start sm:self-auto">
                Calcul central unifié
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs tabular-nums">
              {/* Ratio likes/vues */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-300">Ratio Likes / Vues</span>
                  <span className="text-[10px] text-zinc-400">Formule explicite</span>
                </div>
                <div className="font-mono text-[11px] text-rose-200 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
                  <code>(Total likes / Total vues) &times; 100 = {likesToViewsRatio}%</code>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Taux global consolidé : <strong>{likesToViewsRatio}%</strong> &middot; Médiane par vidéo : <strong>{medianLikesToViewsRatio}%</strong>. Comparé exclusivement à l’historique de votre propre compte.
                </p>
              </div>

              {/* Engagement global vs moyenne/médiane vidéo par vidéo */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Taux d’Engagement (3 lectures)</span>
                  <span className="text-[10px] text-zinc-400">Anti-confusion</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-indigo-200 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
                  <div>Global consolidé : <strong>{averageEngagementRate}%</strong></div>
                  <div>Moyenne par vidéo : <strong>{perVideoMeanEngagementRate}%</strong></div>
                  <div>Médiane par vidéo : <strong>{perVideoMedianEngagementRate}%</strong></div>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Ratio sur abonnés : <strong>{followersEngagementRate}%</strong> ({followerCount.toLocaleString('fr-FR')} abonnés). Vues globales &ne; spectateurs uniques.
                </p>
              </div>

              {/* Ratios secondaires + Favoris optionnels */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Interactions Secondaires &amp; Favoris</span>
                  <span className="text-[10px] text-zinc-400">Transparence</span>
                </div>
                <div className="space-y-1 text-[11px] text-zinc-200 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
                  <div>Commentaires/Vue : <strong className="text-indigo-300">{commentsToViewsRatio}%</strong> ({totalComments.toLocaleString('fr-FR')} comms)</div>
                  <div>Partages/Vue : <strong className="text-emerald-300">{sharesToViewsRatio}%</strong> ({totalShares.toLocaleString('fr-FR')} partages)</div>
                  <div>
                    Favoris :{' '}
                    <strong className="text-amber-300">
                      {centralAnalytics.totalFavorites !== null
                        ? `${centralAnalytics.totalFavorites.toLocaleString('fr-FR')} (hors taux standard)`
                        : 'Non fourni par API video.list'}
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  La formule standard exclut les favoris lorsqu’ils ne sont pas disponibles pour éviter d’introduire de faux zéros.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2 : BANDEAU INTÉGRATION OFFICIELLE TIKTOK */}
          <div id="tiktok-connector-root">
            <TikTokAccountConnector
              onAccountChange={handleAccountConnected}
              onSyncComplete={handleSyncComplete}
            />
          </div>

          {/* SECTION 3 : ACCÈS DIRECT ÉPURÉ AUX 4 MODULES D'ANALYSE */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Modules Stratégiques d'Analyse Approfondie
              </h3>
              <p className="text-xs text-zinc-400">
                Accédez directement aux analyses détaillées pour planifier, comparer et optimiser vos publications.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Module 1: Agenda */}
              <div className="surface hover:border-amber-500/50 p-5 space-y-3 flex flex-col justify-between transition">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white">Agenda Hebdomadaire</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Affiche uniquement les jours pour lesquels un créneau pertinent « POSTER ICI » a été scientifiquement identifié.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('agenda')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-amber-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Ouvrir l'agenda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 2: Suivi temporel & Durées */}
              <div className="surface hover:border-rose-500/50 p-5 space-y-3 flex flex-col justify-between transition">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4 text-rose-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white">Suivi Temporel &amp; Formats</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Tableau complet de progression des vues (1h, 5h, 24h, 48h, 7j), deltas incrémentaux et verdict sur les formats &gt; 60s.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('temporal_duration')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-rose-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Explorer le suivi temporel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 3: Orientation & Cohabitation */}
              <div className="surface hover:border-indigo-500/50 p-5 space-y-3 flex flex-col justify-between transition">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                    <Compass className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white">Orientation de la Page</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Stratégie multi-thématiques : cohabitation équilibrée de vos différents univers éditoriaux sans perte d’engagement.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('orientation')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-indigo-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Voir l'orientation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Module 4: Comparaisons & Vélocité */}
              <div className="surface hover:border-emerald-500/50 p-5 space-y-3 flex flex-col justify-between transition">
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-extrabold text-sm text-white">Vélocité &amp; Comparaisons</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Comparaison équitable par âge de publication (vues/jour et vues/heure) pour neutraliser l'avantage de l'ancienneté.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('fair_comparisons')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-emerald-300 transition flex items-center justify-between cursor-pointer"
                >
                  <span>Comparer les vidéos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AGENDA HEBDOMADAIRE (Section 5) */}
      {activeSubTab === 'agenda' && (
        <div className="relative z-10 space-y-6 animate-fadeIn">
          <WeeklyScheduleAgenda
            contentItems={contentItems}
            officialVideos={filteredOfficialVideos}
            accountHandle={connectedAccount?.username || connectedProfile?.handle}
            onSelectSlotToSchedule={() => {
              if (onNavigateTab) onNavigateTab('visionnaire');
            }}
            onNavigateTab={onNavigateTab}
            onRefreshData={onRefresh}
          />
        </div>
      )}

      {/* SUB-TAB 3: SUIVI TEMPOREL & ÉTUDE SCIENTIFIQUE DES FORMATS (Section 6, 7 & 8) */}
      {activeSubTab === 'temporal_duration' && (
        <div className="relative z-10 space-y-6 animate-fadeIn">
          <TemporalTrackingSection
            contentItems={contentItems}
            officialVideos={filteredOfficialVideos}
            snapshots={metricSnapshots}
            accountHandle={connectedAccount?.username || connectedProfile?.handle}
            counterCorrections={counterCorrections}
            onRefresh={handleRefreshClick}
          />
        </div>
      )}

      {/* SUB-TAB 4: ORIENTATION DE LA PAGE */}
      {activeSubTab === 'orientation' && (
        <div className="relative z-10 space-y-6 animate-fadeIn">
          <PageOrientationSection
            videos={filteredOfficialVideos}
            onSelectVideoForModal={(video) => setSelectedCausalVideo(video)}
          />
        </div>
      )}

      {/* SUB-TAB 5: COMPARAISONS ÉQUITABLES & VÉLOCITÉ */}
      {activeSubTab === 'fair_comparisons' && (
        <div className="surface relative z-10 p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-400" />
                <span>Vélocité &amp; Comparaison Équitable par Âge de Vidéo</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Neutralise l'avantage des vidéos publiées il y a plusieurs mois en comparant le rythme d'acquisition (vues/jour et vues/heure).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Trier par :</span>
              <select
                value={fairSortBy}
                onChange={(e) => setFairSortBy(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="velocity">Vélocité (Vues / Jour)</option>
                <option value="views">Vues totales</option>
                <option value="engagement">Taux d'engagement</option>
                <option value="recent">Plus récentes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedFairComparisons.slice(0, 8).map((v) => (
              <div
                key={v.id}
                className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                      Âge : {v.ageDays} jours ({v.ageHours}h)
                    </span>
                    <h4 className="font-bold text-sm text-white mt-1.5 line-clamp-2">
                      {v.title}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-rose-400">
                      {v.viewsPerDay.toLocaleString('fr-FR')}
                    </div>
                    <div className="text-[10px] text-zinc-400">vues / jour</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 bg-zinc-900/60 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-semibold">Vues totales</div>
                    <div className="font-bold text-zinc-200 mt-0.5">{v.views.toLocaleString('fr-FR')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-semibold">Likes</div>
                    <div className="font-bold text-rose-300 mt-0.5">{v.likes.toLocaleString('fr-FR')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-rose-400 font-semibold">Ratio L/V</div>
                    <div className="font-bold text-rose-300 mt-0.5">
                      {v.views > 0 ? Number(((v.likes / v.views) * 100).toFixed(1)) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-semibold">Engagement</div>
                    <div className="font-bold text-amber-300 mt-0.5">{v.engagementRate}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: LISTE DES VIDÉOS OFFICIELLES & MANUELLES */}
      {activeSubTab === 'video_list' && (
        <div className="surface relative z-10 p-6 sm:p-8 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-white">Publications associées au compte</h3>
              <p className="text-xs text-zinc-400">
                {officialVideos.length} vidéos TikTok officielles synchronisées &middot; {contentItems.filter((i) => i.status === 'published').length} publications locales
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="all">Toutes les sources</option>
                <option value="official">API TikTok uniquement</option>
                <option value="manual">Publications locales</option>
              </select>

              <select
                value={videoSortBy}
                onChange={(e) => setVideoSortBy(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-700 hover:border-rose-500/50 rounded-xl px-3 py-1.5 text-xs text-white font-medium cursor-pointer"
                title="Critère de tri directionnel des publications"
              >
                <option value="views_desc">Nombre de vues : du plus élevé au plus faible</option>
                <option value="views_asc">Nombre de vues : du plus faible au plus élevé</option>
                <option value="ratio_likes_desc">Ratio likes / vues : du plus élevé au plus faible</option>
                <option value="ratio_likes_asc">Ratio likes / vues : du plus faible au plus élevé</option>
                <option value="ratio_comments_desc">Ratio de commentaires : du plus élevé au plus faible</option>
                <option value="ratio_shares_desc">Ratio de partages : du plus élevé au plus faible</option>
                <option value="date_desc">Date de publication : de la plus récente à la plus ancienne</option>
                <option value="date_asc">Date de publication : de la plus ancienne à la plus récente</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {filteredAndSortedVideos.map((v) => {
              const videoRatio = v.viewCount > 0 ? Number(((v.likeCount / v.viewCount) * 100).toFixed(2)) : 0;
              const ratioDiff = Number((videoRatio - medianLikesToViewsRatio).toFixed(1));
              const rawOfficial = officialVideos.find((ov) => ov.id === v.id);
              const nature = rawOfficial ? inferVideoContentNature(rawOfficial, editorialMap) : 'creation';

              return (
                <div
                  key={v.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/30 px-3 rounded-2xl transition"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        {v.source === 'official_api' ? 'API TikTok' : 'Local'}
                      </span>
                      {v.source === 'official_api' ? (
                        <select
                          aria-label="Nature de la publication"
                          value={nature}
                          onChange={(e) =>
                            handleQuickNatureChange(v.id, e.target.value as ContentNature)
                          }
                          className="font-bold px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-zinc-200 cursor-pointer focus:outline-none"
                          title="Classer en Création originale ou Repost"
                        >
                          <option value="creation">Création</option>
                          <option value="repost">Repost</option>
                        </select>
                      ) : (
                        <span className="font-bold px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-300">
                          {nature === 'repost' ? 'Repost' : 'Création'}
                        </span>
                      )}
                      {quickSavedVideoId === v.id && (
                        <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700 text-emerald-300 inline-flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Enregistré
                        </span>
                      )}
                      <span className="text-zinc-500 font-mono">
                        {new Date(v.timestampMs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-zinc-400 font-mono">
                        {v.duration && v.duration > 0 ? `${v.duration}s` : 'Durée n/c'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/60">
                        Ratio likes/vues : <strong>{videoRatio}%</strong> ({ratioDiff >= 0 ? `+${ratioDiff}%` : `${ratioDiff}%`} vs méd.)
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-100">{v.title}</h4>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-base text-rose-400">
                        {v.viewCount.toLocaleString('fr-FR')} vues
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {v.likeCount} likes &middot; {v.commentCount} comms &middot; {v.shareCount} part.
                      </div>
                    </div>

                    {v.source === 'official_api' && (
                      <button
                        onClick={() => {
                          if (rawOfficial) setSelectedCausalVideo(rawOfficial);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Détails
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Detail Modal if selected */}
      {selectedCausalVideo && (
        <VideoDetailCausalModal
          video={{
            ...selectedCausalVideo,
            editorialMeta: editorialMap[selectedCausalVideo.id] || selectedCausalVideo.editorialMeta,
          }}
          allVideos={officialVideos}
          onClose={() => setSelectedCausalVideo(null)}
          onMetadataUpdated={async () => {
            setMetaRefreshTick((t) => t + 1);
            if (onMetadataUpdated) {
              await onMetadataUpdated();
            }
          }}
        />
      )}

      {/* KPI Definition & Formula Modal */}
      {selectedMetricDetail && (
        <MetricDetailModal
          metricKey={selectedMetricDetail}
          onClose={() => setSelectedMetricDetail(null)}
          accountHandle={connectedAccount?.username || connectedProfile?.handle}
          accountFollowers={followerCount}
          totalViews={totalViews}
          totalLikes={totalLikes}
          totalComments={totalComments}
          totalShares={totalShares}
          totalVideos={totalVideosCount}
          medianViews={medianViews}
          avgViews={avgViews}
          medianLikesRatio={medianLikesToViewsRatio}
          medianCommentsRatio={medianCommentsToViewsRatio}
          medianSharesRatio={medianSharesToViewsRatio}
          medianEngagementRate={perVideoMedianEngagementRate}
        />
      )}
    </div>
  );
};
