import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Target,
  MessageSquare,
  Info,
  Clock,
  Eye,
  Layers,
  Award,
  Search,
  Compass,
  ExternalLink,
  Brain,
  BookOpen,
  FlaskConical,
  Plus,
  Users,
  Music,
  Repeat,
  Trash2,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import {
  ContentItem,
  ContentMode,
  ExperimentConclusionStatus,
  ExperimentLog,
  FollowerHistoryEntry,
  TikTokAccountData,
  TikTokMetricSnapshot,
  TikTokOfficialVideo,
  StrategicAccountDiagnostic,
  VideoEditorialMetadata,
  ActiveTab,
} from '../types';
import { computeStrategicDiagnostic } from '../utils/strategeEngine';
import { TIKTOK_OFFICIAL_DOCS } from '../utils/tiktokOfficialDocsEngine';
import {
  computeCentralAccountAnalytics,
  computeFollowerGrowthAnalysis,
  inferVideoContentNature,
} from '../utils/centralDataEngine';
import { computeInterestingRemarks } from '../utils/interestingRemarksEngine';
import { compareCreationVsRepost } from '../utils/repostEngine';
import { findSimilarRefutedOrTestedExperiments } from '../utils/learningMemoryEngine';
import {
  deleteExperimentLog,
  getAllVideoEditorialMeta,
  getExperimentLogs,
  getFollowerHistory,
  saveExperimentLog,
  saveFollowerHistoryEntry,
} from '../services/db';
import {
  getTikTokSnapshotsFromFirestore,
  getTikTokVideosFromFirestore,
} from '../services/firebase';
import { StrategeChatView } from './StrategeChatView';
import { OfficialTikTokDocsModal } from './OfficialTikTokDocsModal';
import { PageOrientationSection } from './PageOrientationSection';
import { TikTokVisionnaire } from './TikTokVisionnaire';
import { TikTokAnalytics } from './TikTokAnalytics';
import { MetricDetailModal, MetricDetailKey } from './MetricDetailModal';
import { InterestingRemarksSection } from './InterestingRemarksSection';
import { MeterBar } from './ui';

export type CoachPillar = 'coach' | 'visionnaire' | 'analytics';

interface TikTokCoachProps {
  contentItems: ContentItem[];
  onRefresh: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  initialPillar?: CoachPillar;
  userId?: string;
  contentMode?: ContentMode | null;
  initialOfficialVideos?: TikTokOfficialVideo[];
  initialAccount?: TikTokAccountData | null;
  onDataMutated?: () => void;
}

const STORAGE_ACCOUNT_KEY = 'tiktok_connected_profile';

type CoachViewTab =
  | 'diagnostic'
  | 'remarques'
  | 'official_docs'
  | 'experiments'
  | 'chat'
  | 'faq'
  | 'orientation';

const CONCLUSION_BADGE_STYLES: Record<ExperimentConclusionStatus, string> = {
  Prometteur: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/70',
  Défavorable: 'bg-rose-950/70 text-rose-300 border-rose-700/70',
  Inconclusif: 'bg-amber-950/70 text-amber-300 border-amber-700/70',
  'Données insuffisantes': 'bg-zinc-900 text-zinc-300 border-zinc-700',
};

const MODIFIED_CHARACTERISTICS = [
  'Accroche (2 premières secondes)',
  'Durée du montage',
  'Rythme / transitions',
  'Sujet ou angle éditorial',
  'Musique / bande-son',
  'Texte incrusté / sous-titres',
  'Call-to-action / question en fin de vidéo',
  'Horaire ou espacement de publication',
];

export const TikTokCoach: React.FC<TikTokCoachProps> = ({
  contentItems,
  onRefresh,
  onNavigateTab,
  initialPillar = 'coach',
  userId,
  contentMode,
  initialOfficialVideos,
  initialAccount,
  onDataMutated,
}) => {
  const [primaryPillar, setPrimaryPillar] = useState<CoachPillar>(initialPillar || 'coach');
  const [activeTab, setActiveTab] = useState<CoachViewTab>('diagnostic');
  const [officialVideos, setOfficialVideos] = useState<TikTokOfficialVideo[]>(
    initialOfficialVideos || []
  );
  const [account, setAccount] = useState<TikTokAccountData | null>(() => {
    if (initialAccount?.openId) return initialAccount;
    try {
      const savedAcc = localStorage.getItem(STORAGE_ACCOUNT_KEY);
      if (savedAcc) {
        const parsed = JSON.parse(savedAcc);
        if (parsed?.openId || parsed?.username) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [activeFilterMode, setActiveFilterMode] = useState<'all' | 'creation' | 'repost'>(() =>
    contentMode === 'creation' ? 'creation' : contentMode === 'repost' ? 'repost' : 'all'
  );

  const [editorialMap, setEditorialMap] = useState<Record<string, VideoEditorialMetadata>>({});
  const [followerHistory, setFollowerHistory] = useState<FollowerHistoryEntry[]>([]);
  const [experimentLogs, setExperimentLogs] = useState<ExperimentLog[]>([]);
  const [snapshotsMap, setSnapshotsMap] = useState<Record<string, TikTokMetricSnapshot[]>>({});

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [docsModalQuery, setDocsModalQuery] = useState('');
  const [selectedSituationId, setSelectedSituationId] = useState<string>('situation_a');
  const [selectedCoachMetricKey, setSelectedCoachMetricKey] = useState<MetricDetailKey | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Follower manual log states
  const [manualFollowerInput, setManualFollowerInput] = useState('');
  const [savingFollowers, setSavingFollowers] = useState(false);
  const [followerFeedback, setFollowerFeedback] = useState<string | null>(null);

  // Experiment Lab creation form states
  const [expFormOpen, setExpFormOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpHypothesis, setNewExpHypothesis] = useState('');
  const [newExpVariable, setNewExpVariable] = useState(MODIFIED_CHARACTERISTICS[0]);
  const [newExpObjective, setNewExpObjective] = useState('');
  const [newExpVideoId, setNewExpVideoId] = useState('');
  const [overrideRefutedWarning, setOverrideRefutedWarning] = useState(false);
  const [expCreationNotice, setExpCreationNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialPillar) {
      setPrimaryPillar(initialPillar);
    }
  }, [initialPillar]);

  useEffect(() => {
    if (initialOfficialVideos && initialOfficialVideos.length > 0) {
      setOfficialVideos(initialOfficialVideos);
    }
  }, [initialOfficialVideos]);

  useEffect(() => {
    if (initialAccount?.openId) {
      setAccount(initialAccount);
    }
  }, [initialAccount]);

  useEffect(() => {
    if (contentMode === 'creation') setActiveFilterMode('creation');
    else if (contentMode === 'repost') setActiveFilterMode('repost');
    else if (contentMode === 'both') setActiveFilterMode('all');
  }, [contentMode]);

  useEffect(() => {
    if (primaryPillar === 'coach') {
      getAllVideoEditorialMeta()
        .then(setEditorialMap)
        .catch(() => {});
    }
  }, [primaryPillar]);

  const loadLocalAndRemoteStores = async (resolvedAccount?: TikTokAccountData | null) => {
    const targetAcc = resolvedAccount ?? account;
    const openId = targetAcc?.openId;

    const [edMap, logs] = await Promise.all([
      getAllVideoEditorialMeta(),
      getExperimentLogs(userId, openId),
    ]);
    setEditorialMap(edMap);
    setExperimentLogs(logs);

    if (openId) {
      const [localFollowers, snaps] = await Promise.all([
        getFollowerHistory(openId),
        getTikTokSnapshotsFromFirestore(openId),
      ]);

      // Group snapshots by videoId
      const grouped: Record<string, TikTokMetricSnapshot[]> = {};
      for (const s of snaps) {
        if (!grouped[s.videoId]) grouped[s.videoId] = [];
        grouped[s.videoId].push(s);
      }
      setSnapshotsMap(grouped);

      // Auto-record API follower count snapshot if it changed
      let mergedFollowers = localFollowers;
      if (
        targetAcc &&
        typeof targetAcc.followerCount === 'number' &&
        targetAcc.followerCount >= 0 &&
        targetAcc.source === 'official_api'
      ) {
        const last = localFollowers[localFollowers.length - 1];
        if (!last || last.followerCount !== targetAcc.followerCount) {
          const entry: FollowerHistoryEntry = {
            id: `fol_api_${openId}_${Date.now()}`,
            accountId: openId,
            recordedAt: new Date().toISOString(),
            followerCount: targetAcc.followerCount,
            source: 'tiktok_api',
            deltaSincePrevious: last ? targetAcc.followerCount - last.followerCount : null,
          };
          await saveFollowerHistoryEntry(entry).catch(() => {});
          mergedFollowers = [...localFollowers, entry];
        }
      }
      setFollowerHistory(mergedFollowers);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      let currentAcc: TikTokAccountData | null = account;
      try {
        const statusRes = await fetch('/api/tiktok/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.account) {
            currentAcc = statusData.account;
            setAccount(statusData.account);
            try {
              localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(statusData.account));
            } catch {
              // ignore
            }
          }
        }
      } catch (e) {
        console.warn('Status fetch error in Coach:', e);
      }

      try {
        const vRes = await fetch('/api/tiktok/videos');
        if (vRes.ok) {
          const vData = await vRes.json();
          if (vData.videos && vData.videos.length > 0) {
            setOfficialVideos(vData.videos);
          } else if (currentAcc?.openId) {
            const fallback = await getTikTokVideosFromFirestore(currentAcc.openId);
            setOfficialVideos(fallback);
          }
          if (Array.isArray(vData.followerHistory) && vData.followerHistory.length > 0) {
            setFollowerHistory((prev) => (prev.length >= vData.followerHistory.length ? prev : vData.followerHistory));
          }
          if (Array.isArray(vData.snapshots) && vData.snapshots.length > 0) {
            const grouped: Record<string, TikTokMetricSnapshot[]> = {};
            for (const s of vData.snapshots as TikTokMetricSnapshot[]) {
              if (!grouped[s.videoId]) grouped[s.videoId] = [];
              grouped[s.videoId].push(s);
            }
            setSnapshotsMap((prev) => (Object.keys(prev).length > 0 ? prev : grouped));
          }
        } else if (currentAcc?.openId) {
          const fallback = await getTikTokVideosFromFirestore(currentAcc.openId);
          setOfficialVideos(fallback);
        }
      } catch (e) {
        console.warn('Video load fallback:', e);
      }

      await loadLocalAndRemoteStores(currentAcc);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSyncAndRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/tiktok/sync', { method: 'POST' }).catch(() => {});
      let refreshedAcc: TikTokAccountData | null = account;
      const statusRes = await fetch('/api/tiktok/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.account) {
          refreshedAcc = statusData.account;
          setAccount(statusData.account);
          try {
            localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(statusData.account));
          } catch {
            // ignore
          }
        }
      }
      const vRes = await fetch('/api/tiktok/videos');
      if (vRes.ok) {
        const vData = await vRes.json();
        if (vData.videos && vData.videos.length > 0) {
          setOfficialVideos(vData.videos);
        }
      }
      await loadLocalAndRemoteStores(refreshedAcc);
      onRefresh();
      onDataMutated?.();
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered dataset honoring Global / Création / Repost
  const filteredVideos = useMemo(() => {
    if (activeFilterMode === 'all') return officialVideos;
    return officialVideos.filter(
      (v) => inferVideoContentNature(v, editorialMap) === activeFilterMode
    );
  }, [officialVideos, editorialMap, activeFilterMode]);

  // Layer 1 central deterministic analytics
  const centralAnalytics = useMemo(
    () =>
      computeCentralAccountAnalytics({
        videos: filteredVideos,
        account,
        filterMode: activeFilterMode === 'all' ? 'both' : activeFilterMode,
        editorialMap,
        snapshotsMap,
        followerHistory,
      }),
    [filteredVideos, account, activeFilterMode, editorialMap, snapshotsMap, followerHistory]
  );

  // Layer 2 deterministic strategic diagnostic & remarks (grounded with editorialMap)
  const diagnostic: StrategicAccountDiagnostic = useMemo(
    () => computeStrategicDiagnostic(filteredVideos, account),
    [filteredVideos, account]
  );

  const remarks = useMemo(
    () => computeInterestingRemarks(filteredVideos, account, editorialMap),
    [filteredVideos, account, editorialMap]
  );

  const followerAnalysis = useMemo(
    () => computeFollowerGrowthAnalysis(account, filteredVideos, followerHistory, editorialMap),
    [account, filteredVideos, followerHistory, editorialMap]
  );

  const creationVsRepost = useMemo(
    () => compareCreationVsRepost(officialVideos, editorialMap),
    [officialVideos, editorialMap]
  );

  const experimentMatchCheck = useMemo(
    () =>
      findSimilarRefutedOrTestedExperiments(
        `${newExpTitle} ${newExpHypothesis} ${newExpVariable}`,
        experimentLogs
      ),
    [newExpTitle, newExpHypothesis, newExpVariable, experimentLogs]
  );

  const handleOpenDocsForTopic = (query: string) => {
    setDocsModalQuery(query);
    setShowDocsModal(true);
  };

  const handleSaveManualFollowerSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(manualFollowerInput);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setFollowerFeedback('Veuillez saisir un nombre entier valide (>= 0).');
      return;
    }
    setSavingFollowers(true);
    setFollowerFeedback(null);
    const targetAccountId = account?.openId || 'local';
    try {
      const res = await fetch('/api/tiktok/follower-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerCount: Math.round(numeric),
          accountId: targetAccountId,
        }),
      });
      let entry: FollowerHistoryEntry | null = null;
      if (res.ok) {
        const data = await res.json();
        entry = data.entry || null;
      }
      if (!entry) {
        const prev = followerHistory[followerHistory.length - 1];
        entry = {
          id: `fol_manual_${targetAccountId}_${Date.now()}`,
          accountId: targetAccountId,
          recordedAt: new Date().toISOString(),
          followerCount: Math.round(numeric),
          source: 'manual_input',
          deltaSincePrevious: prev ? Math.round(numeric) - prev.followerCount : null,
        };
      }
      await saveFollowerHistoryEntry(entry);
      setFollowerHistory((prev) => [...prev, entry!]);
      setManualFollowerInput('');
      setFollowerFeedback('Relevé d’abonnés enregistré dans l’historique.');
    } catch {
      setFollowerFeedback('Impossible d’enregistrer le relevé pour le moment.');
    } finally {
      setSavingFollowers(false);
    }
  };

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpHypothesis.trim()) return;
    if (experimentMatchCheck.refutedMatches.length > 0 && !overrideRefutedWarning) {
      return;
    }

    const selectedVideo = officialVideos.find((v) => v.id === newExpVideoId);
    const now = new Date().toISOString();
    const log: ExperimentLog = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      accountId: account?.openId,
      title: newExpTitle.trim(),
      hypothesis: newExpHypothesis.trim(),
      modifiedCharacteristic: newExpVariable,
      concernedVideoIds: selectedVideo ? [selectedVideo.id] : [],
      concernedVideoTitles: selectedVideo ? [selectedVideo.title || 'Sans titre'] : [],
      objective: newExpObjective.trim() || 'Tester l’impact sur la médiane de vues ou les ratios d’engagement',
      measuredResults: '',
      baselineComparison: `Médiane actuelle du périmètre : ${centralAnalytics.medianViews.toLocaleString('fr-FR')} vues`,
      conclusion: 'Données insuffisantes',
      status: 'en_cours',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await saveExperimentLog(log);
      setExperimentLogs((prev) => [log, ...prev]);
      setNewExpTitle('');
      setNewExpHypothesis('');
      setNewExpObjective('');
      setNewExpVideoId('');
      setOverrideRefutedWarning(false);
      setExpFormOpen(false);
      setExpCreationNotice(`Expérimentation « ${log.title} » enregistrée dans votre laboratoire.`);
    } catch {
      setExpCreationNotice('Impossible d’enregistrer cette expérimentation pour le moment.');
    }
  };

  const handleLaunchProposedExperiment = async (proposal: {
    title: string;
    variableChanged: string;
    hypothesis: string;
    targetMetric: string;
  }) => {
    const check = findSimilarRefutedOrTestedExperiments(
      `${proposal.title} ${proposal.hypothesis} ${proposal.variableChanged}`,
      experimentLogs
    );

    if (check.refutedMatches.length > 0) {
      setNewExpTitle(proposal.title);
      setNewExpHypothesis(proposal.hypothesis);
      setNewExpVariable(proposal.variableChanged);
      setNewExpObjective(proposal.targetMetric);
      setExpFormOpen(true);
      setActiveTab('experiments');
      setExpCreationNotice(
        `Attention : une piste similaire (« ${check.refutedMatches[0].title} ») a été jugée Défavorable par le passé. Confirmez explicitement si vous souhaitez la re-tester.`
      );
      return;
    }

    const now = new Date().toISOString();
    const log: ExperimentLog = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      accountId: account?.openId,
      title: proposal.title,
      hypothesis: proposal.hypothesis,
      modifiedCharacteristic: proposal.variableChanged,
      concernedVideoIds: [],
      concernedVideoTitles: [],
      objective: proposal.targetMetric,
      measuredResults: '',
      baselineComparison: `Référence médiane : ${centralAnalytics.medianViews.toLocaleString('fr-FR')} vues`,
      conclusion: 'Données insuffisantes',
      status: 'en_cours',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await saveExperimentLog(log);
      setExperimentLogs((prev) => [log, ...prev]);
      setExpCreationNotice(`Expérimentation « ${proposal.title} » ajoutée au laboratoire.`);
      setActiveTab('experiments');
    } catch {
      setExpCreationNotice('Impossible d’enregistrer cette expérimentation pour le moment.');
    }
  };

  const handleUpdateExperiment = async (
    log: ExperimentLog,
    patch: Partial<ExperimentLog>
  ) => {
    const updated: ExperimentLog = {
      ...log,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveExperimentLog(updated);
      setExperimentLogs((prev) => prev.map((item) => (item.id === log.id ? updated : item)));
    } catch {
      setExpCreationNotice('Impossible de mettre à jour cette expérimentation.');
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    try {
      await deleteExperimentLog(id);
      setExperimentLogs((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setExpCreationNotice('Impossible de supprimer cette expérimentation.');
    }
  };

  const displayAccountHandle =
    account?.username ||
    (diagnostic.accountHandle !== 'Compte non connecté'
      ? diagnostic.accountHandle
      : 'votre compte TikTok');

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-rose-500/30 selection:text-white space-y-8 pb-20">
      {/* Subtle ambient light backgrounds matching Étape 1 & 2 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[32rem] h-[32rem] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[34rem] h-[34rem] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* MASTER COCKPIT SWITCHER: MON COACH | MON VISIONNAIRE | TIKTOK ANALYTICS */}
      <div className="surface relative z-20 p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-indigo-500 p-0.5 shadow-lg">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                Étape 3 &bull; Cockpit Unifié
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
                3 Outils Clés
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Mon Coach TikTok &amp; Suite Stratégique
            </h2>
          </div>
        </div>

        {/* 3 Master Switcher Buttons */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-950/90 border border-zinc-800/90 rounded-2xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setPrimaryPillar('coach')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              primaryPillar === 'coach'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-950/80 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-rose-300" />
            <span>Mon Coach TikTok</span>
          </button>

          <button
            onClick={() => setPrimaryPillar('visionnaire')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              primaryPillar === 'visionnaire'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-lg shadow-amber-950/80 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Mon Visionnaire</span>
          </button>

          <button
            onClick={() => setPrimaryPillar('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              primaryPillar === 'analytics'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 shadow-lg shadow-emerald-950/80 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>TikTok Analytics</span>
          </button>
        </div>
      </div>

      {/* PILLAR 1: MON VISIONNAIRE */}
      {primaryPillar === 'visionnaire' && (
        <div className="relative z-10 animate-fadeIn">
          <TikTokVisionnaire onNavigateTab={onNavigateTab} />
        </div>
      )}

      {/* PILLAR 2: TIKTOK ANALYTICS */}
      {primaryPillar === 'analytics' && (
        <div className="relative z-10 animate-fadeIn">
          <TikTokAnalytics
            contentItems={contentItems}
            onRefresh={handleSyncAndRefresh}
            onNavigateCoach={() => setPrimaryPillar('coach')}
            onNavigateTab={onNavigateTab}
            initialOfficialVideos={officialVideos}
            initialAccount={account}
            contentMode={activeFilterMode === 'all' ? 'both' : activeFilterMode}
            onMetadataUpdated={async () => {
              await loadLocalAndRemoteStores(account);
              onDataMutated?.();
            }}
          />
        </div>
      )}

      {/* PILLAR 3: MON COACH TIKTOK */}
      {primaryPillar === 'coach' && (
        <>
          {/* Main Top Header Banner */}
          <div className="surface relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Mon Coach TikTok &bull; Stratégie &amp; Progression</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
                <span className="gradient-text">Stratégie à adopter</span> &amp; Documentation Officielle
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Stratégie d&apos;amélioration déterministe calculée à partir des données réelles de{' '}
                <strong className="text-zinc-200">{displayAccountHandle}</strong>, des paliers de
                diffusion observés et de la documentation officielle TikTok.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSyncAndRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
                title="Synchroniser avec l'API TikTok"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshing ? 'Synchronisation...' : 'Actualiser'}</span>
              </button>

              {onNavigateTab && contentMode !== 'creation' && (
                <button
                  onClick={() => onNavigateTab('repost')}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-500/40 bg-zinc-950 hover:bg-zinc-800 text-indigo-300 font-bold text-xs transition cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Mon Repost</span>
                </button>
              )}

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('music-advisor')}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-zinc-950 hover:bg-zinc-800 text-amber-300 font-bold text-xs transition cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conseiller Musical</span>
                </button>
              )}

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('comprendre-tiktok')}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-cyan-500/40 bg-zinc-950 hover:bg-zinc-800 text-cyan-300 font-bold text-xs transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Comprendre TikTok</span>
                </button>
              )}

              <button
                onClick={() => handleOpenDocsForTopic('')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-zinc-950 hover:bg-zinc-800 text-rose-300 font-bold text-xs shadow-sm shadow-black/20 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                <span>Docs Officielles</span>
              </button>

              <button
                onClick={() => setPrimaryPillar('analytics')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>TikTok Analytics &rarr;</span>
              </button>
            </div>
          </div>

          {/* CONTENT NATURE FILTER BAR: GLOBAL / CRÉATION / REPOST */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span className="font-bold">Périmètre d&apos;analyse :</span>
              <span className="text-[11px] text-zinc-400">
                {centralAnalytics.creationCount} Création(s) &bull; {centralAnalytics.repostCount}{' '}
                Repost(s)
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              {(
                [
                  { id: 'all', label: `Global (${officialVideos.length})` },
                  { id: 'creation', label: `Création (${centralAnalytics.creationCount})` },
                  { id: 'repost', label: `Repost (${centralAnalytics.repostCount})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilterMode(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeFilterMode === opt.id
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('diagnostic')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'diagnostic'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Stratégie à adopter</span>
            </button>

            <button
              onClick={() => setActiveTab('remarques')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'remarques'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Remarque intéressante ({remarks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('official_docs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'official_docs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentation Officielle TikTok</span>
            </button>

            <button
              onClick={() => setActiveTab('experiments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'experiments'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Laboratoire d&apos;Expérimentations ({experimentLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Échanger avec Mon Coach</span>
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'faq'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Module Pédagogique</span>
            </button>

            <button
              onClick={() => setActiveTab('orientation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'orientation'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50 font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Orientation &amp; Thématiques</span>
            </button>
          </div>

          {expCreationNotice && (
            <div className="relative z-10 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-emerald-200">
              <span>{expCreationNotice}</span>
              <button
                onClick={() => setExpCreationNotice(null)}
                className="text-emerald-300 underline ml-3 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {/* VIEW 1: STRATÉGIE À ADOPTER */}
          {activeTab === 'diagnostic' && (
            <div className="relative z-10 space-y-8 animate-fadeIn">
              {/* Header Title & Intro Banner */}
              <div className="bg-zinc-900/90 border border-rose-500/30 rounded-3xl p-6 sm:p-7 space-y-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs">
                    ★
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Stratégie à adopter pour {displayAccountHandle}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
                  Feuille de route stratégique issue du moteur mathématique central et de la
                  documentation officielle TikTok : lecture par médianes et paliers, facteurs
                  distinguant vos vidéos au-dessus du palier, 6 dimensions d&apos;engagement
                  séparées et suivi transparent des abonnés.
                </p>
              </div>

              {/* Key Engagement & Diagnostic KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div
                  onClick={() => setSelectedCoachMetricKey('views')}
                  className="group bg-gradient-to-b from-cyan-950/25 to-zinc-900/90 border border-cyan-500/30 hover:border-cyan-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                  title="Cliquer pour voir la formule certifiée"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                      1. Vues Globales
                    </span>
                    <Info className="w-3 h-3 text-cyan-400/70" />
                  </div>
                  <div className="text-xl font-black text-cyan-300">
                    {centralAnalytics.totalViews.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[9px] text-cyan-200/70">Cumul du périmètre</div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('views')}
                  className="group bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-300 font-semibold uppercase tracking-wider">
                      2. Vidéos
                    </span>
                    <Info className="w-3 h-3 text-zinc-400" />
                  </div>
                  <div className="text-xl font-black text-white">{centralAnalytics.sampleSize}</div>
                  <div className="text-[9px] text-zinc-400">Échantillon réel</div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('avg_views')}
                  className="group bg-gradient-to-b from-purple-950/25 to-zinc-900/90 border border-purple-500/30 hover:border-purple-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
                      3. Vues Moyennes
                    </span>
                    <Info className="w-3 h-3 text-purple-400/70" />
                  </div>
                  <div className="text-xl font-black text-purple-300">
                    {centralAnalytics.meanViews.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[9px] text-purple-200/70">Sensible aux pics</div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('median_views')}
                  className="group bg-gradient-to-b from-amber-950/25 to-zinc-900/90 border border-amber-500/30 hover:border-amber-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                      4. Vues Médianes
                    </span>
                    <Info className="w-3 h-3 text-amber-400/70" />
                  </div>
                  <div className="text-xl font-black text-amber-400">
                    {centralAnalytics.medianViews.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-[9px] text-amber-200/70">
                    IQR : {centralAnalytics.iqrViews.toLocaleString('fr-FR')}
                  </div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('likes_ratio')}
                  className="group bg-gradient-to-b from-rose-950/25 to-zinc-900/90 border border-rose-500/30 hover:border-rose-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rose-300 font-semibold uppercase tracking-wider">
                      5. Likes / Vues
                    </span>
                    <Info className="w-3 h-3 text-rose-400/70" />
                  </div>
                  <div className="text-xl font-black text-rose-400">
                    {centralAnalytics.globalLikesRate}%
                  </div>
                  <div className="text-[9px] text-rose-200/70">
                    Méd. vidéo :{' '}
                    <strong className="text-rose-300">
                      {centralAnalytics.perVideoMedianLikesRate}%
                    </strong>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('comments_rate')}
                  className="group bg-gradient-to-b from-indigo-950/25 to-zinc-900/90 border border-indigo-500/30 hover:border-indigo-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
                      6. Commentaires
                    </span>
                    <Info className="w-3 h-3 text-indigo-400/70" />
                  </div>
                  <div className="text-xl font-black text-indigo-300">
                    {centralAnalytics.globalCommentsRate}%
                  </div>
                  <div className="text-[9px] text-indigo-200/70">
                    {centralAnalytics.totalComments.toLocaleString('fr-FR')} comms
                  </div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('shares_rate')}
                  className="group bg-gradient-to-b from-emerald-950/25 to-zinc-900/90 border border-emerald-500/30 hover:border-emerald-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                      7. Partages
                    </span>
                    <Info className="w-3 h-3 text-emerald-400/70" />
                  </div>
                  <div className="text-xl font-black text-emerald-300">
                    {centralAnalytics.globalSharesRate}%
                  </div>
                  <div className="text-[9px] text-emerald-200/70">
                    {centralAnalytics.totalShares.toLocaleString('fr-FR')} partages
                  </div>
                </div>

                <div
                  onClick={() => setSelectedCoachMetricKey('global_engagement')}
                  className="group bg-gradient-to-b from-teal-950/25 to-zinc-900/90 border border-teal-500/30 hover:border-teal-400/80 rounded-2xl p-3.5 space-y-1 shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-teal-300 font-semibold uppercase tracking-wider">
                      8. Engagement
                    </span>
                    <Info className="w-3 h-3 text-teal-400/70" />
                  </div>
                  <div className="text-xl font-black text-teal-300">
                    {centralAnalytics.globalEngagementRate}%
                  </div>
                  <div className="text-[9px] text-teal-200/70">
                    Méd. vidéo : {centralAnalytics.perVideoMedianEngagementRate}%
                  </div>
                </div>
              </div>

              {/* CLARIFICATION GLOBALE VS PAR VIDÉO + CRÉATION VS REPOST */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-teal-300">
                    Transparence des formules d&apos;engagement
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[10px] text-zinc-400">Global consolidé</div>
                      <div className="text-base font-black text-teal-300">
                        {centralAnalytics.globalEngagementRate}%
                      </div>
                      <div className="text-[9px] text-zinc-500">Σ(L+C+S) / Σ(Vues)</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[10px] text-zinc-400">Moyenne par vidéo</div>
                      <div className="text-base font-black text-purple-300">
                        {centralAnalytics.perVideoMeanEngagementRate}%
                      </div>
                      <div className="text-[9px] text-zinc-500">Poids égal / vidéo</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[10px] text-zinc-400">Médiane par vidéo</div>
                      <div className="text-base font-black text-amber-300">
                        {centralAnalytics.perVideoMedianEngagementRate}%
                      </div>
                      <div className="text-[9px] text-zinc-500">Valeur centrale</div>
                    </div>
                  </div>
                  {(() => {
                    const g = Number(centralAnalytics.globalEngagementRate) || 0;
                    const m = Number(centralAnalytics.perVideoMeanEngagementRate) || 0;
                    const d = Number(centralAnalytics.perVideoMedianEngagementRate) || 0;
                    const sc = Math.max(g, m, d, 0.01) * 1.25;
                    return (
                      <div className="space-y-3 pt-2">
                        <MeterBar label="Global consolidé" value={g} max={sc} color="#2dd4bf" />
                        <MeterBar label="Moyenne par vidéo" value={m} max={sc} color="#a78bfa" />
                        <MeterBar label="Médiane par vidéo" value={d} max={sc} color="#fbbf24" />
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {centralAnalytics.engagementReport.favoritesIncludedNotice}
                  </p>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Comparaison neutre : Création vs Repost
                    </div>
                    {onNavigateTab && contentMode !== 'creation' && (
                      <button
                        onClick={() => onNavigateTab('repost')}
                        className="text-[11px] text-indigo-300 hover:text-indigo-200 underline cursor-pointer"
                      >
                        Ouvrir Mon Repost
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="text-[10px] text-zinc-400 font-bold">
                        Créations originales ({creationVsRepost.creationCount})
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        {creationVsRepost.creationMedianViews !== null
                          ? `${creationVsRepost.creationMedianViews.toLocaleString('fr-FR')} vues méd.`
                          : 'Aucune vidéo'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Eng. global :{' '}
                        {creationVsRepost.creationGlobalEngagementRate !== null
                          ? `${creationVsRepost.creationGlobalEngagementRate}%`
                          : 'n/c'}
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="text-[10px] text-zinc-400 font-bold">
                        Reposts ({creationVsRepost.repostCount})
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">
                        {creationVsRepost.repostMedianViews !== null
                          ? `${creationVsRepost.repostMedianViews.toLocaleString('fr-FR')} vues méd.`
                          : 'Aucune vidéo'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Eng. global :{' '}
                        {creationVsRepost.repostGlobalEngagementRate !== null
                          ? `${creationVsRepost.repostGlobalEngagementRate}%`
                          : 'n/c'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {creationVsRepost.neutralObservation}
                  </p>
                </div>
              </div>

              {/* ANALYSE DES PALIERS DE VUES (PARTIE 4.1) */}
              <div className="bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                      Paliers de diffusion &amp; Valeurs atypiques
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {centralAnalytics.plateauAnalysis.trendHeadline}
                    </h3>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl border self-start ${
                      centralAnalytics.plateauAnalysis.trendStatus === 'progression_durable'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70'
                        : centralAnalytics.plateauAnalysis.trendStatus === 'pic_isole'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-700/70'
                        : centralAnalytics.plateauAnalysis.trendStatus === 'baisse_recente'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-700/70'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {centralAnalytics.plateauAnalysis.trendStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {centralAnalytics.plateauAnalysis.trendExplanation}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <div className="text-[10px] text-zinc-400">Médiane globale</div>
                    <div className="text-base font-black text-amber-300">
                      {centralAnalytics.plateauAnalysis.overallMedianViews.toLocaleString('fr-FR')}{' '}
                      vues
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <div className="text-[10px] text-zinc-400">Écart interquartile (IQR)</div>
                    <div className="text-base font-black text-white">
                      {centralAnalytics.plateauAnalysis.overallIqrViews.toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <div className="text-[10px] text-zinc-400">Dispersion robuste (MAD)</div>
                    <div className="text-base font-black text-white">
                      {centralAnalytics.plateauAnalysis.overallMadViews.toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <div className="text-[10px] text-zinc-400">Seuil pic isolé</div>
                    <div className="text-base font-black text-cyan-300">
                      {centralAnalytics.plateauAnalysis.outlierThreshold > 0
                        ? `≥ ${centralAnalytics.plateauAnalysis.outlierThreshold.toLocaleString('fr-FR')}`
                        : 'n/c'}
                    </div>
                  </div>
                </div>

                {centralAnalytics.plateauAnalysis.periods.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {centralAnalytics.plateauAnalysis.periods.map((period) => (
                      <div
                        key={period.periodLabel}
                        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-1.5 text-xs"
                      >
                        <div className="font-black text-white">{period.periodLabel}</div>
                        <div className="text-[11px] text-zinc-400">
                          {period.videoCount} vidéo(s) &bull; {period.outlierCount} pic(s) isolé(s)
                        </div>
                        <div className="text-sm font-bold text-amber-300">
                          Médiane hors pics :{' '}
                          {period.medianWithoutOutliers.toLocaleString('fr-FR')} vues
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Moyenne brute : {period.meanViews.toLocaleString('fr-FR')} &bull; Médiane
                          brute : {period.medianViews.toLocaleString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {centralAnalytics.plateauAnalysis.outlierVideos.length > 0 && (
                  <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="text-[11px] font-bold text-cyan-300">
                      Vidéos exceptionnelles isolées du calcul de palier typique :
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {centralAnalytics.plateauAnalysis.outlierVideos.map((ov) => (
                        <span
                          key={ov.id}
                          className="text-[11px] bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-xl text-zinc-200"
                        >
                          {ov.title} &bull;{' '}
                          <strong className="text-cyan-300">
                            {ov.views.toLocaleString('fr-FR')} vues
                          </strong>{' '}
                          ({ov.dateLabel})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* COMMENT PASSER AU NIVEAU SUPÉRIEUR ? (PARTIE 4.2) */}
              <div className="bg-zinc-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400">
                    Analyse différentielle prudente
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Comment passer au niveau supérieur ?
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Comparaison entre vos vidéos dépassant nettement le palier médian (
                    {centralAnalytics.levelUpReport.abovePlateauThreshold.toLocaleString('fr-FR')}+
                    vues) et votre socle habituel (
                    {centralAnalytics.levelUpReport.baselineMedianViews.toLocaleString('fr-FR')} vues).
                  </p>
                </div>

                {!centralAnalytics.levelUpReport.hasSufficientData ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-300">
                    Données insuffisantes pour isoler deux groupes comparables (publiez davantage ou
                    synchronisez plus de vidéos pour dépasser le seuil comparatif).
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {centralAnalytics.levelUpReport.factorComparisons.map((fc) => (
                        <div
                          key={fc.dimension}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-white">{fc.dimension}</span>
                            {fc.isManualDataNeeded && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                Saisie requise
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-300">
                            Au-dessus palier ({fc.sampleAboveCount}) :{' '}
                            <strong>{fc.abovePlateauValue}</strong>
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            Socle ({fc.sampleBaselineCount}) : <strong>{fc.baselineValue}</strong>
                          </div>
                          <p className="text-[11px] text-zinc-300 leading-relaxed pt-1">
                            {fc.observation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {centralAnalytics.levelUpReport.missingManualFieldsNotice && (
                      <div className="bg-amber-950/30 border border-amber-700/50 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{centralAnalytics.levelUpReport.missingManualFieldsNotice}</span>
                      </div>
                    )}

                    <div className="bg-zinc-950 border border-indigo-800/50 rounded-2xl p-3.5 text-xs text-indigo-200 flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{centralAnalytics.levelUpReport.correlationWarning}</span>
                    </div>

                    {centralAnalytics.levelUpReport.proposedExperiments.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                          Expérimentations suggérées (1 variable à la fois) :
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {centralAnalytics.levelUpReport.proposedExperiments.map((prop, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-indigo-300">
                                  Variable : {prop.variableChanged}
                                </span>
                                <div className="font-bold text-white">{prop.title}</div>
                                <p className="text-[11px] text-zinc-300">{prop.hypothesis}</p>
                                <div className="text-[10px] text-emerald-300">
                                  Cible : {prop.targetMetric}
                                </div>
                              </div>
                              <button
                                onClick={() => handleLaunchProposedExperiment(prop)}
                                className="mt-2 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition cursor-pointer"
                              >
                                <FlaskConical className="w-3.5 h-3.5" />
                                <span>Tester cette hypothèse</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* NOUVEAUX ABONNÉS GÉNÉRÉS (PARTIE 4.3) */}
              <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
                      Conversion &amp; Croissance d&apos;audience
                    </span>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" />
                      <span>Nouveaux abonnés générés</span>
                    </h3>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs">
                    <span className="text-zinc-400">Abonnés actuels : </span>
                    <strong className="text-emerald-300">
                      {followerAnalysis.currentFollowers.value !== null
                        ? followerAnalysis.currentFollowers.value.toLocaleString('fr-FR')
                        : 'Non renseigné'}
                    </strong>
                    {followerAnalysis.netFollowerChangeObserved !== null && (
                      <span className="ml-2 text-[11px] text-cyan-300">
                        ({followerAnalysis.netFollowerChangeObserved >= 0 ? '+' : ''}
                        {followerAnalysis.netFollowerChangeObserved} observés)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-950 border border-amber-700/50 rounded-2xl p-4 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{followerAnalysis.apiAttributionNote}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Manual Follower Count Entry & History */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-white">
                      Historique du nombre total d&apos;abonnés du compte
                    </div>
                    <form onSubmit={handleSaveManualFollowerSnapshot} className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={manualFollowerInput}
                        onChange={(e) => setManualFollowerInput(e.target.value)}
                        placeholder="Relevé TikTok Studio (ex. 520)"
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={savingFollowers}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        {savingFollowers ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </form>
                    {followerFeedback && (
                      <div className="text-[11px] text-emerald-300">{followerFeedback}</div>
                    )}

                    {followerAnalysis.accountHistory.length === 0 ? (
                      <p className="text-[11px] text-zinc-400">
                        Aucun relevé enregistré pour le moment. Connectez le compte ou saisissez un
                        relevé pour suivre la variation nette d&apos;abonnés entre deux dates.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {followerAnalysis.accountHistory
                          .slice()
                          .reverse()
                          .slice(0, 8)
                          .map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between text-[11px] bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg"
                            >
                              <span className="text-zinc-400">
                                {new Date(h.recordedAt).toLocaleString('fr-FR')} ({h.source === 'tiktok_api' ? 'API' : 'Saisie'})
                              </span>
                              <span className="font-bold text-white">
                                {h.followerCount.toLocaleString('fr-FR')} abonnés
                                {h.deltaSincePrevious !== null && (
                                  <span className="ml-1.5 text-emerald-300">
                                    ({h.deltaSincePrevious >= 0 ? '+' : ''}
                                    {h.deltaSincePrevious})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Videos with Manually Attributed Followers */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-bold text-white">
                      Vidéos avec nouveaux abonnés saisis (via TikTok Studio)
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {followerAnalysis.topReachVsTopConversionComparison}
                    </p>
                    {followerAnalysis.manuallyAttributedVideos.length > 0 && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {followerAnalysis.manuallyAttributedVideos.map((mv) => (
                          <div
                            key={mv.videoId}
                            className="flex items-center justify-between text-[11px] bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg gap-2"
                          >
                            <span className="text-zinc-200 truncate">{mv.title}</span>
                            <span className="text-emerald-300 font-bold shrink-0">
                              +{mv.attributedFollowers} ({mv.conversionRatePct}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 6 DIMENSIONS D'ENGAGEMENT SÉPARÉES (PARTIE 4.4) */}
              <div className="surface p-6 sm:p-8 space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-rose-400">
                    Architecture d&apos;interaction complète
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Les 6 Dimensions d&apos;Engagement Séparées
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Chaque signal est analysé indépendamment avec son statut réel de collecte, ses
                    leviers concrets et les fausses croyances à éviter.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {centralAnalytics.engagementReport.dimensions.map((dim) => (
                    <div
                      key={dim.dimension}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2.5 flex flex-col justify-between text-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-white">{dim.dimension}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md border ${
                              dim.availabilityStatus === 'measured'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-zinc-900 text-amber-300 border-amber-800/60'
                            }`}
                          >
                            {dim.availabilityStatus === 'measured' ? 'Mesuré' : 'Non fourni / Partiel'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-rose-300">
                          {dim.consolidatedRateLabel}
                        </div>
                        {(dim.perVideoMeanRateLabel || dim.perVideoMedianRateLabel) && (
                          <div className="text-[11px] text-zinc-400">
                            {[dim.perVideoMeanRateLabel, dim.perVideoMedianRateLabel]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          {dim.interpretation}
                        </p>
                        <ul className="space-y-1 text-[11px] text-emerald-200 list-disc pl-4">
                          {dim.tacticalStrategies.map((st, idx) => (
                            <li key={idx}>{st}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-zinc-900 text-[10px] text-amber-300/90">
                        Vigilance : {dim.misconceptionWarning}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RUBRIQUE : REMARQUE INTÉRESSANTE */}
              <InterestingRemarksSection
                remarks={remarks}
                sampleSize={filteredVideos.length}
                accountHandle={diagnostic.accountHandle}
              />

              {/* SECTION A : RECOMMANDATIONS STRUCTURÉES EN 5 POINTS */}
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                  <div>
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-rose-400" />
                      <span>Plan d&apos;Action Stratégique Priorisé (5 Points Clés par Mesure)</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Chaque recommandation associe constat chiffré, mécanisme officiel, action
                      concrète, objectif ciblé et mesure de résultat.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {diagnostic.actionRecommendations?.map((rec) => (
                    <div
                      key={rec.id}
                      className={`bg-zinc-900/90 border rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl transition hover:border-zinc-700 ${
                        rec.priority === 'Élevée'
                          ? 'border-rose-500/40'
                          : rec.priority === 'Moyenne'
                          ? 'border-amber-500/40'
                          : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${
                              rec.priority === 'Élevée'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                                : rec.priority === 'Moyenne'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            Priorité {rec.priority}
                          </span>
                          {rec.themeTag && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-zinc-950 text-zinc-400 border border-zinc-800">
                              {rec.themeTag}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400 font-bold">
                          Cible : {rec.targetMetric}
                        </div>
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-white">{rec.title}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1 text-xs">
                        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                              1. Le constat
                            </div>
                            <p className="text-zinc-300 leading-relaxed mt-1 text-[11px]">
                              {rec.constat}
                            </p>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            Observation chiffrée
                          </span>
                        </div>

                        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                              2. L&apos;explication
                            </div>
                            <p className="text-zinc-300 leading-relaxed mt-1 text-[11px]">
                              {rec.explication}
                            </p>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            Documentation TikTok
                          </span>
                        </div>

                        <div className="bg-zinc-950/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                              3. L&apos;action à adopter
                            </div>
                            <p className="text-zinc-200 leading-relaxed mt-1 text-[11px] font-medium">
                              {rec.action}
                            </p>
                          </div>
                          <span className="text-[9px] text-amber-400/80 font-mono">
                            Action concrète
                          </span>
                        </div>

                        <div className="bg-zinc-950/90 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                              4. L&apos;objectif
                            </div>
                            <p className="text-zinc-300 leading-relaxed mt-1 text-[11px]">
                              {rec.objectif}
                            </p>
                          </div>
                          <span className="text-[9px] text-emerald-400/80 font-mono">
                            Comportement visé
                          </span>
                        </div>

                        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                              5. La mesure
                            </div>
                            <p className="text-zinc-300 leading-relaxed mt-1 text-[11px]">
                              {rec.mesure}
                            </p>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            Validation du résultat
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B : INTERPRÉTATION INTELLIGENTE DES SITUATIONS STATISTIQUES */}
              <div className="surface p-6 sm:p-8 space-y-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Interprétation Intelligente des Statistiques Réelles</span>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    Comprendre la dynamique de vos publications (Situations A à E)
                  </h3>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {diagnostic.statisticalSituations?.map((sit) => {
                    const isSelected = selectedSituationId === sit.id;
                    return (
                      <button
                        key={sit.id}
                        onClick={() => setSelectedSituationId(sit.id)}
                        className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 border ${
                          isSelected
                            ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white border-transparent shadow-lg shadow-rose-950/80 font-black'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <span>{sit.code}</span>
                        <span className="hidden sm:inline font-normal opacity-80">
                          &bull; {sit.title.slice(0, 22)}...
                        </span>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeSit =
                    diagnostic.statisticalSituations?.find((s) => s.id === selectedSituationId) ||
                    diagnostic.statisticalSituations?.[0];
                  if (!activeSit) return null;

                  return (
                    <div className="space-y-5 bg-zinc-950 p-5 sm:p-7 rounded-2xl border border-zinc-800 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-rose-400">
                            {activeSit.code}
                          </div>
                          <h4 className="text-lg font-black text-white mt-0.5">{activeSit.title}</h4>
                          <p className="text-xs text-zinc-400 mt-1 italic">
                            {activeSit.scenarioDescription}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-zinc-200 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>1. Faits observés</span>
                          </div>
                          <div className="space-y-2 pt-1">
                            {activeSit.observedFacts.map((fact, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-zinc-300 text-[11px] leading-relaxed"
                              >
                                <span className="text-emerald-400 font-bold mt-0.5">&bull;</span>
                                <span>{fact}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                            <Brain className="w-4 h-4 text-indigo-400" />
                            <span>2. Hypothèses explicatives</span>
                          </div>
                          <div className="space-y-2 pt-1">
                            {activeSit.plausibleHypotheses.map((hyp, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-zinc-300 text-[11px] leading-relaxed"
                              >
                                <span className="text-indigo-400 font-bold mt-0.5">&bull;</span>
                                <span>{hyp}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-zinc-900/70 border border-amber-500/30 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>3. Action concrète à tester</span>
                          </div>
                          <p className="text-zinc-200 text-[11px] leading-relaxed pt-1">
                            {activeSit.actionToTest}
                          </p>
                        </div>
                      </div>

                      {activeSit.suggestedCallToActions &&
                        activeSit.suggestedCallToActions.length > 0 && (
                          <div className="bg-gradient-to-r from-indigo-950/40 to-zinc-900 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                            <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Formules et questions prêtes à tester :</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {activeSit.suggestedCallToActions.map((cta, idx) => (
                                <div
                                  key={idx}
                                  className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-200 italic font-medium"
                                >
                                  {cta}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {activeSit.matchedRealVideos && activeSit.matchedRealVideos.length > 0 && (
                        <div className="pt-2 border-t border-zinc-900">
                          <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">
                            Vidéos réelles de votre compte correspondant à cette dynamique :
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeSit.matchedRealVideos.map((mv, idx) => (
                              <div
                                key={idx}
                                className="bg-zinc-900/60 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-zinc-200 truncate pr-2">
                                  {mv.title}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                                  <span className="text-rose-400 font-bold">
                                    {mv.views.toLocaleString('fr-FR')} vues
                                  </span>
                                  <span className="text-zinc-400">
                                    Ratio : {mv.likesToViewsRatio}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* SECTION C : VERDICT SUR LES FORMATS ET LA DURÉE */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Verdict du Coach sur la durée et le format de vos vidéos</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                  « {diagnostic.durationAnalysis.verdict} »
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
                    <div className="text-zinc-400 font-bold">Formats Courts (&lt; 30s)</div>
                    <div className="text-xl font-black text-zinc-200">
                      {diagnostic.durationAnalysis.shortUnder30s.medianViews.toLocaleString('fr-FR')}{' '}
                      vues méd.
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {diagnostic.durationAnalysis.shortUnder30s.count} vidéos
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
                    <div className="text-zinc-400 font-bold">Formats Moyens (30s à 60s)</div>
                    <div className="text-xl font-black text-zinc-200">
                      {diagnostic.durationAnalysis.medium30to60s.medianViews.toLocaleString('fr-FR')}{' '}
                      vues méd.
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {diagnostic.durationAnalysis.medium30to60s.count} vidéos
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1">
                    <div className="text-zinc-400 font-bold">Formats Longs (&gt; 60s)</div>
                    <div className="text-xl font-black text-amber-400">
                      {diagnostic.durationAnalysis.longOver60s.medianViews.toLocaleString('fr-FR')}{' '}
                      vues méd.
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {diagnostic.durationAnalysis.longOver60s.count} vidéos
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1B: REMARQUE INTÉRESSANTE */}
          {activeTab === 'remarques' && (
            <div className="relative z-10 space-y-6 animate-fadeIn">
              <InterestingRemarksSection
                remarks={remarks}
                sampleSize={filteredVideos.length}
                accountHandle={diagnostic.accountHandle}
              />
            </div>
          )}

          {/* VIEW 2: BASE DOCUMENTAIRE OFFICIELLE TIKTOK */}
          {activeTab === 'official_docs' && (
            <div className="relative z-10 space-y-6 animate-fadeIn">
              <div className="surface p-6 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-rose-400" />
                      <span>Base Documentaire Officielle TikTok</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Les connaissances du Coach s&apos;appuient sur les publications officielles et
                      les directives certifiées de TikTok.
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenDocsForTopic('')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Rechercher dans toute la documentation</span>
                  </button>
                </div>

                <div className="space-y-4 pt-4">
                  {TIKTOK_OFFICIAL_DOCS.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-3 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-lg text-[10px]">
                            {doc.sourceName}
                          </span>
                          <span className="text-zinc-400">{doc.category}</span>
                        </div>
                        <a
                          href={doc.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 underline"
                        >
                          <span>Lien officiel source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <h4 className="text-base font-extrabold text-white">{doc.title}</h4>

                      <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 italic">
                        « {doc.officialExcerpt} »
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3">
                          <div className="font-bold text-emerald-400 text-[10px] uppercase mb-1">
                            Confirmé par TikTok :
                          </div>
                          <ul className="text-emerald-200 text-[11px] space-y-1 list-disc pl-3">
                            {doc.confirmedByTikTok.slice(0, 2).map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3">
                          <div className="font-bold text-indigo-400 text-[10px] uppercase mb-1">
                            Observé sur votre compte :
                          </div>
                          <ul className="text-indigo-200 text-[11px] space-y-1 list-disc pl-3">
                            {(
                              doc.observedByAccountData || [
                                'Vérification croisée avec vos données réelles synchronisées.',
                              ]
                            ).map((o, i) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                          <div className="font-bold text-zinc-400 text-[10px] uppercase mb-1">
                            Inconnu / Non documenté :
                          </div>
                          <ul className="text-zinc-400 text-[11px] space-y-1 list-disc pl-3">
                            {doc.unknownOrUndocumented.slice(0, 2).map((u, i) => (
                              <li key={i}>{u}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: LABORATOIRE D'EXPÉRIMENTATIONS SCIENTIFIQUES PERSISTANT */}
          {activeTab === 'experiments' && (
            <div className="relative z-10 space-y-6 animate-fadeIn">
              <div className="surface p-6 sm:p-8 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-amber-400" />
                      <span>Laboratoire d&apos;Expérimentations Scientifiques</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Suivez chaque test réel avec son hypothèse, la variable modifiée, la vidéo
                      concernée, les résultats mesurés par rapport à la référence et la conclusion
                      (Prometteur, Défavorable, Inconclusif ou Données insuffisantes).
                    </p>
                  </div>

                  <button
                    onClick={() => setExpFormOpen((o) => !o)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer transition self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{expFormOpen ? 'Masquer le formulaire' : 'Nouvelle expérimentation'}</span>
                  </button>
                </div>

                {expFormOpen && (
                  <form
                    onSubmit={handleCreateExperiment}
                    className="bg-zinc-950 border border-amber-500/40 rounded-2xl p-5 space-y-4 text-xs"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300 block">
                          Titre du test *
                        </label>
                        <input
                          required
                          value={newExpTitle}
                          onChange={(e) => setNewExpTitle(e.target.value)}
                          placeholder="Ex. : Accroche visuelle directe à 0s sans intro parlée"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300 block">
                          Caractéristique modifiée *
                        </label>
                        <select
                          value={newExpVariable}
                          onChange={(e) => setNewExpVariable(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                        >
                          {MODIFIED_CHARACTERISTICS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-300 block">
                        Hypothèse testée *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={newExpHypothesis}
                        onChange={(e) => setNewExpHypothesis(e.target.value)}
                        placeholder="Ex. : Entrer immédiatement sur l'action réduit les abandons précoces et élève la médiane."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300 block">
                          Objectif mesuré
                        </label>
                        <input
                          value={newExpObjective}
                          onChange={(e) => setNewExpObjective(e.target.value)}
                          placeholder="Ex. : Dépasser la médiane actuelle ou augmenter le taux de partage"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-300 block">
                          Vidéo associée (optionnel)
                        </label>
                        <select
                          value={newExpVideoId}
                          onChange={(e) => setNewExpVideoId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-white"
                        >
                          <option value="">-- Aucune vidéo liée pour l&apos;instant --</option>
                          {officialVideos.map((v) => (
                            <option key={v.id} value={v.id}>
                              {(v.title || 'Sans titre').slice(0, 60)} (
                              {v.viewCount.toLocaleString('fr-FR')} vues)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {experimentMatchCheck.refutedMatches.length > 0 && (
                      <div className="bg-rose-950/50 border border-rose-700 rounded-xl p-3.5 space-y-2 text-rose-200">
                        <div className="font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>
                            Alerte mémoire : une expérimentation similaire a déjà donné un résultat
                            Défavorable (« {experimentMatchCheck.refutedMatches[0].title} »).
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={overrideRefutedWarning}
                            onChange={(e) => setOverrideRefutedWarning(e.target.checked)}
                          />
                          <span>
                            Je confirme vouloir re-tester cette piste avec un protocole ajusté.
                          </span>
                        </label>
                      </div>
                    )}

                    {experimentMatchCheck.activeMatches.length > 0 && (
                      <div className="bg-indigo-950/40 border border-indigo-700/60 rounded-xl p-3 text-indigo-200">
                        Rappel : {experimentMatchCheck.activeMatches.length} test(s) proche(s)
                        figure(nt) déjà dans votre historique («{' '}
                        {experimentMatchCheck.activeMatches[0].title} »).
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setExpFormOpen(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={
                          experimentMatchCheck.refutedMatches.length > 0 && !overrideRefutedWarning
                        }
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-40"
                      >
                        Enregistrer le test
                      </button>
                    </div>
                  </form>
                )}

                {experimentLogs.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-xs text-zinc-300">
                      Aucune expérimentation enregistrée pour ce compte.
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Créez un test ci-dessus ou cliquez sur « Tester cette hypothèse » depuis la
                      rubrique « Comment passer au niveau supérieur ? ».
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {experimentLogs.map((exp) => (
                      <div
                        key={exp.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between text-xs"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              {exp.modifiedCharacteristic}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                CONCLUSION_BADGE_STYLES[exp.conclusion]
                              }`}
                            >
                              {exp.conclusion}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-white">{exp.title}</h4>
                          <p className="text-zinc-300 leading-relaxed">
                            <strong>Hypothèse : </strong>
                            {exp.hypothesis}
                          </p>
                          <div className="text-[11px] text-zinc-400">
                            Objectif : <span className="text-amber-300">{exp.objective}</span>
                          </div>
                          {exp.concernedVideoTitles.length > 0 && (
                            <div className="text-[11px] text-zinc-400">
                              Vidéo liée :{' '}
                              <span className="text-zinc-200">
                                {exp.concernedVideoTitles.join(', ')}
                              </span>
                            </div>
                          )}
                          <div className="text-[11px] text-zinc-400">
                            Référence : <span className="text-zinc-300">{exp.baselineComparison}</span>
                          </div>

                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Résultats mesurés
                            </label>
                            <textarea
                              rows={2}
                              value={exp.measuredResults}
                              onChange={(e) =>
                                handleUpdateExperiment(exp, { measuredResults: e.target.value })
                              }
                              placeholder="Notez les chiffres réels observés après publication..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-white"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={exp.conclusion}
                              onChange={(e) =>
                                handleUpdateExperiment(exp, {
                                  conclusion: e.target.value as ExperimentConclusionStatus,
                                  status:
                                    e.target.value === 'Données insuffisantes'
                                      ? 'en_cours'
                                      : 'cloturée',
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-white"
                            >
                              <option value="Données insuffisantes">Données insuffisantes</option>
                              <option value="Prometteur">Prometteur</option>
                              <option value="Inconclusif">Inconclusif</option>
                              <option value="Défavorable">Défavorable</option>
                            </select>
                            <span className="text-[10px] text-zinc-500">
                              {exp.createdAt.slice(0, 10)}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteExperiment(exp.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 cursor-pointer"
                            title="Supprimer ce test"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: CHAT AVEC MON COACH TIKTOK */}
          {activeTab === 'chat' && (
            <div className="relative z-10 animate-fadeIn">
              <StrategeChatView diagnostic={diagnostic} officialVideos={officialVideos} />
            </div>
          )}

          {/* VIEW 5: MODULE PÉDAGOGIQUE VISUEL 100% DYNAMIQUE */}
          {activeTab === 'faq' && (
            <div className="relative z-10 space-y-8 animate-fadeIn">
              <div className="bg-zinc-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-2 shadow-2xl backdrop-blur-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Module Pédagogique Visuel &bull; Données Réelles</span>
                </div>
                <h3 className="text-xl sm:text-3xl font-black text-white">
                  Comprendre les Mécanismes, l&apos;Engagement et la Progression
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
                  5 piliers pédagogiques alimentés directement par vos chiffres actuels (
                  {centralAnalytics.sampleSize} vidéo(s) dans le périmètre sélectionné) et la
                  documentation officielle TikTok.
                </p>
              </div>

              <div className="space-y-6">
                {/* PILL 1 */}
                <div className="surface p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center font-black text-rose-400 text-sm">
                      01
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white">Comprendre mes performances</h4>
                      <span className="text-xs text-zinc-400">
                        Médiane vs Moyenne &amp; Palier de distribution
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        Pourquoi la médiane ?
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Votre moyenne actuelle ({centralAnalytics.meanViews.toLocaleString('fr-FR')}{' '}
                        vues) peut être tirée par des valeurs atypiques (
                        {centralAnalytics.plateauAnalysis.outlierVideos.length} pic(s) détecté(s)).
                        Votre médiane de{' '}
                        <strong>
                          {centralAnalytics.medianViews.toLocaleString('fr-FR')} vues
                        </strong>{' '}
                        reflète votre performance typique.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">
                        État du palier observé
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {centralAnalytics.plateauAnalysis.trendExplanation}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Objectif mesurable
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        Cherchez à élever votre médiane hors pics (actuellement{' '}
                        {centralAnalytics.plateauAnalysis.currentTypicalViews !== null
                          ? `${centralAnalytics.plateauAnalysis.currentTypicalViews.toLocaleString('fr-FR')} vues`
                          : 'en cours de mesure'}
                        ) en ne modifiant qu&apos;une variable à la fois.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PILL 2 */}
                <div className="surface p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm">
                      02
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white">Comprendre mon engagement</h4>
                      <span className="text-xs text-zinc-400">
                        Global consolidé vs Moyenne/Médiane par vidéo
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-rose-300">
                        Ratios actuels sur ce périmètre
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Engagement global consolidé :{' '}
                        <strong>{centralAnalytics.globalEngagementRate}%</strong> (Likes :{' '}
                        {centralAnalytics.globalLikesRate}%, Commentaires :{' '}
                        {centralAnalytics.globalCommentsRate}%, Partages :{' '}
                        {centralAnalytics.globalSharesRate}%). Médiane vidéo par vidéo :{' '}
                        <strong>{centralAnalytics.perVideoMedianEngagementRate}%</strong>.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-indigo-400">
                        Hiérarchie officielle des signaux
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        TikTok Newsroom indique que la durée de visionnage et la complétion, les
                        partages et les discussions authentiques pèsent bien davantage que de
                        simples likes passifs.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Données non fournies par l&apos;API
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        Les favoris, la rétention seconde par seconde et les abonnés générés par
                        vidéo proviennent de TikTok Studio et restent saisis manuellement dans «
                        Détails ».
                      </p>
                    </div>
                  </div>
                </div>

                {/* PILL 3 */}
                <div className="surface p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm">
                      03
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white">
                        Progression temporelle &amp; Snapshots
                      </h4>
                      <span className="text-xs text-zinc-400">
                        Mesure incrémentale sans interpolation artificielle
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        Points mesurés uniquement
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Les courbes temporelles utilisent uniquement vos synchronisations réelles.
                        Si un jalon n&apos;a pas été relevé au bon âge de la vidéo, il reste marqué
                        non collecté.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">
                        Corrections de compteurs API
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Si TikTok corrige à la baisse un compteur (filtrage anti-bot/cache),
                        l&apos;application enregistre la correction sans écraser les relevés
                        antérieurs.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Accès rapide
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        Ouvrez l&apos;onglet <strong>Suivi temporel</strong> dans TikTok Analytics
                        pour comparer vos vidéos à âge équivalent.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PILL 4 */}
                <div className="surface p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-sm">
                      04
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white">
                        Améliorer mes contenus concrètement
                      </h4>
                      <span className="text-xs text-zinc-400">
                        Verdict de format &amp; hypothèses testables
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-rose-400">
                        Comparatif durées observé
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {diagnostic.durationAnalysis.verdict}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">
                        Rétention &amp; accroche
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Complétez vos fiches vidéo dans « Détails » (accroche, sujet, musique,
                        rythme) pour permettre au moteur différentiel d&apos;isoler vos leviers.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Corrélation != Causalité
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        Validez toujours une intuition avec un test dédié dans le Laboratoire
                        d&apos;Expérimentations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PILL 5 */}
                <div className="surface p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-sm">
                      05
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white">
                        Mécanismes officiels &amp; cadence
                      </h4>
                      <span className="text-xs text-zinc-400">
                        Indépendance des vidéos &amp; originalité
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-rose-400">
                        Évaluation par vidéo
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        Chaque vidéo est évaluée individuellement sur ses signaux propres dans le
                        flux Pour toi, sans pénalité automatique liée au thème précédent.
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400">
                        Cadence observée
                      </span>
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {diagnostic.cadenceWarning}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Conformité &amp; droits
                      </span>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        Consultez « Comprendre TikTok » pour vérifier vos contenus avant
                        publication (originalité, droits musicaux et prévention des restrictions).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 6: ORIENTATION DE LA PAGE */}
          {activeTab === 'orientation' && (
            <div className="relative z-10 space-y-6 animate-fadeIn">
              <PageOrientationSection videos={filteredVideos} />
            </div>
          )}
        </>
      )}

      {/* Official Documentation Full-Screen Modal */}
      <OfficialTikTokDocsModal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
        initialQuery={docsModalQuery}
      />

      {/* Educational Metric & Formula Modal */}
      {selectedCoachMetricKey && (
        <MetricDetailModal
          metricKey={selectedCoachMetricKey}
          onClose={() => setSelectedCoachMetricKey(null)}
          accountHandle={displayAccountHandle}
          accountFollowers={account?.followerCount ?? 0}
          totalViews={centralAnalytics.totalViews}
          totalLikes={centralAnalytics.totalLikes}
          totalComments={centralAnalytics.totalComments}
          totalShares={centralAnalytics.totalShares}
          totalVideos={centralAnalytics.sampleSize}
          medianViews={centralAnalytics.medianViews}
          avgViews={centralAnalytics.meanViews}
          medianLikesRatio={centralAnalytics.perVideoMedianLikesRate}
          medianCommentsRatio={centralAnalytics.perVideoMeanCommentsRate}
          medianSharesRatio={centralAnalytics.perVideoMeanSharesRate}
          medianEngagementRate={centralAnalytics.perVideoMedianEngagementRate}
        />
      )}
    </div>
  );
};
