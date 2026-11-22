import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Layers,
  Save,
  HelpCircle,
  Compass,
  ArrowRight,
  BookOpen,
  FlaskConical,
  Scale,
  Sliders,
  Check,
  Info,
  Flame,
  Award,
} from 'lucide-react';
import {
  TikTokOfficialVideo,
  VideoRetentionData,
  VideoQualitativeTraits,
  VideoMemoryCard,
  PedagogicalAnalysis,
  VideoEditorialMetadata,
  ContentNature,
} from '../types';
import { computeCausalDiagnosis } from '../utils/analyticsEngine';
import {
  getVideoMemoryCard,
  saveVideoMemoryCard,
  updateVideoTestOutcome,
  generatePedagogicalAnalysis,
  findSimilarVideos,
  getAccountKnowledgeMemory,
} from '../utils/learningMemoryEngine';
import { getAllVideoEditorialMeta, saveVideoEditorialMeta } from '../services/db';
import { getCurrentUser } from '../services/firebase';

interface VideoDetailCausalModalProps {
  video: TikTokOfficialVideo | null;
  allVideos: TikTokOfficialVideo[];
  onClose: () => void;
  onMetadataUpdated?: () => void | Promise<void>;
}

type ModalTab = 'modules' | 'facts_hypotheses' | 'comparison' | 'retention_traits' | 'test_tracking';

export const VideoDetailCausalModal: React.FC<VideoDetailCausalModalProps> = ({
  video,
  allVideos,
  onClose,
  onMetadataUpdated,
}) => {
  if (!video) return null;

  const [activeTab, setActiveTab] = useState<ModalTab>('modules');

  // Load durable video memory card
  const [memoryCard, setMemoryCard] = useState<VideoMemoryCard>(() =>
    getVideoMemoryCard(video, allVideos)
  );

  // Retention state
  const [watchTimeInput, setWatchTimeInput] = useState(
    memoryCard.retention.averageWatchTimeSeconds !== undefined
      ? String(memoryCard.retention.averageWatchTimeSeconds)
      : ''
  );
  const [completionInput, setCompletionInput] = useState(
    memoryCard.retention.completionRatePercentage !== undefined
      ? String(memoryCard.retention.completionRatePercentage)
      : ''
  );
  const [retention3sInput, setRetention3sInput] = useState(
    memoryCard.retention.retentionAt3SecondsPercentage !== undefined
      ? String(memoryCard.retention.retentionAt3SecondsPercentage)
      : ''
  );
  const [isSavedRetention, setIsSavedRetention] = useState(false);

  // Qualitative Traits state
  const [traits, setTraits] = useState<VideoQualitativeTraits>(memoryCard.qualitativeTraits);
  const [isSavedTraits, setIsSavedTraits] = useState(false);

  // Test Tracking state
  const [testStatus, setTestStatus] = useState<'a_tester' | 'valide' | 'refute'>(memoryCard.testStatus || 'a_tester');
  const [testNotes, setTestNotes] = useState(memoryCard.testNotes || '');
  const [isSavedTest, setIsSavedTest] = useState(false);

  // Editorial Metadata (Central Engine Layer 1 enrichment)
  const [editorialSubject, setEditorialSubject] = useState(video.editorialMeta?.subject || '');
  const [editorialAngle, setEditorialAngle] = useState(video.editorialMeta?.angle || '');
  const [editorialHook, setEditorialHook] = useState(video.editorialMeta?.hook || '');
  const [editorialOnScreenText, setEditorialOnScreenText] = useState(video.editorialMeta?.onScreenText || '');
  const [editorialMusicName, setEditorialMusicName] = useState(video.editorialMeta?.musicName || video.soundTitle || '');
  const [editorialRhythm, setEditorialRhythm] = useState<'rapide' | 'modéré' | 'lent'>(video.editorialMeta?.rhythm || 'modéré');
  const [editorialEmotion, setEditorialEmotion] = useState(video.editorialMeta?.emotion || '');
  const [editorialNarration, setEditorialNarration] = useState(video.editorialMeta?.narration || '');
  const [editorialStructure, setEditorialStructure] = useState(video.editorialMeta?.structure || '');
  const [editorialContentNature, setEditorialContentNature] = useState<ContentNature>(video.editorialMeta?.contentNature || video.contentNature || 'creation');
  const [manualFavoritesInput, setManualFavoritesInput] = useState(
    video.editorialMeta?.manualFavoritesCount !== undefined && video.editorialMeta?.manualFavoritesCount !== null
      ? String(video.editorialMeta.manualFavoritesCount)
      : video.favoriteCount !== undefined && video.favoriteCount !== null
      ? String(video.favoriteCount)
      : ''
  );
  const [manualFollowersInput, setManualFollowersInput] = useState(
    video.editorialMeta?.manualAttributedFollowers !== undefined && video.editorialMeta?.manualAttributedFollowers !== null
      ? String(video.editorialMeta.manualAttributedFollowers)
      : video.attributedFollowers !== undefined && video.attributedFollowers !== null
      ? String(video.attributedFollowers)
      : ''
  );
  const [isSavedEditorial, setIsSavedEditorial] = useState(false);
  const [isSavingEditorial, setIsSavingEditorial] = useState(false);
  const [editorialSaveError, setEditorialSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setEditorialSubject(video.editorialMeta?.subject || '');
    setEditorialAngle(video.editorialMeta?.angle || '');
    setEditorialHook(video.editorialMeta?.hook || '');
    setEditorialOnScreenText(video.editorialMeta?.onScreenText || '');
    setEditorialMusicName(video.editorialMeta?.musicName || video.soundTitle || '');
    setEditorialRhythm(video.editorialMeta?.rhythm || 'modéré');
    setEditorialEmotion(video.editorialMeta?.emotion || '');
    setEditorialNarration(video.editorialMeta?.narration || '');
    setEditorialStructure(video.editorialMeta?.structure || '');
    setEditorialContentNature(video.editorialMeta?.contentNature || video.contentNature || 'creation');
    setManualFavoritesInput(
      video.editorialMeta?.manualFavoritesCount !== undefined && video.editorialMeta?.manualFavoritesCount !== null
        ? String(video.editorialMeta.manualFavoritesCount)
        : video.favoriteCount !== undefined && video.favoriteCount !== null
        ? String(video.favoriteCount)
        : ''
    );
    setManualFollowersInput(
      video.editorialMeta?.manualAttributedFollowers !== undefined && video.editorialMeta?.manualAttributedFollowers !== null
        ? String(video.editorialMeta.manualAttributedFollowers)
        : video.attributedFollowers !== undefined && video.attributedFollowers !== null
        ? String(video.attributedFollowers)
        : ''
    );
    setEditorialSaveError(null);

    (async () => {
      try {
        const map = await getAllVideoEditorialMeta();
        const existing = map[video.id];
        if (existing && active) {
          if (existing.subject !== undefined) setEditorialSubject(existing.subject);
          if (existing.angle !== undefined) setEditorialAngle(existing.angle);
          if (existing.hook !== undefined) setEditorialHook(existing.hook);
          if (existing.onScreenText !== undefined) setEditorialOnScreenText(existing.onScreenText);
          if (existing.musicName !== undefined) setEditorialMusicName(existing.musicName);
          if (existing.rhythm) setEditorialRhythm(existing.rhythm);
          if (existing.emotion !== undefined) setEditorialEmotion(existing.emotion);
          if (existing.narration !== undefined) setEditorialNarration(existing.narration);
          if (existing.structure !== undefined) setEditorialStructure(existing.structure);
          if (existing.contentNature) setEditorialContentNature(existing.contentNature);
          if (existing.manualFavoritesCount !== undefined && existing.manualFavoritesCount !== null) {
            setManualFavoritesInput(String(existing.manualFavoritesCount));
          }
          if (existing.manualAttributedFollowers !== undefined && existing.manualAttributedFollowers !== null) {
            setManualFollowersInput(String(existing.manualAttributedFollowers));
          }
        }
      } catch (err) {
        console.warn('Error loading editorial metadata:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [video.id]);

  // AI Refresh state
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Similar sibling videos
  const siblingVideos = findSimilarVideos(video, allVideos);
  const bestSibling = siblingVideos.length > 0 ? siblingVideos[0] : null;

  // Save manual retention from TikTok Studio
  const handleSaveRetention = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRetention: VideoRetentionData = {
      videoId: video.id,
      averageWatchTimeSeconds: watchTimeInput ? Number(watchTimeInput) : undefined,
      completionRatePercentage: completionInput ? Number(completionInput) : undefined,
      retentionAt3SecondsPercentage: retention3sInput ? Number(retention3sInput) : undefined,
      source: 'tiktok_studio_manual',
      updatedAt: new Date().toISOString(),
    };

    const newAnalysis = generatePedagogicalAnalysis(
      video,
      allVideos,
      getAccountKnowledgeMemory(),
      traits,
      updatedRetention
    );

    const updatedCard: VideoMemoryCard = {
      ...memoryCard,
      retention: updatedRetention,
      pedagogicalAnalysis: newAnalysis,
    };

    setMemoryCard(updatedCard);
    saveVideoMemoryCard(updatedCard);
    localStorage.setItem(`tiktok_retention_${video.id}`, JSON.stringify(updatedRetention));

    setIsSavedRetention(true);
    setTimeout(() => setIsSavedRetention(false), 2000);
  };

  // Save qualitative traits
  const handleSaveTraits = (e: React.FormEvent) => {
    e.preventDefault();
    const newAnalysis = generatePedagogicalAnalysis(
      video,
      allVideos,
      getAccountKnowledgeMemory(),
      traits,
      memoryCard.retention
    );

    const updatedCard: VideoMemoryCard = {
      ...memoryCard,
      qualitativeTraits: traits,
      pedagogicalAnalysis: newAnalysis,
    };

    setMemoryCard(updatedCard);
    saveVideoMemoryCard(updatedCard);

    setIsSavedTraits(true);
    setTimeout(() => setIsSavedTraits(false), 2000);
  };

  // Save editorial metadata & manual Studio counters
  const handleSaveEditorialMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEditorial(true);
    setEditorialSaveError(null);

    try {
      const user = getCurrentUser();
      const favParsed = manualFavoritesInput.trim() !== '' ? Math.max(0, Number(manualFavoritesInput)) : null;
      const follParsed = manualFollowersInput.trim() !== '' ? Math.max(0, Number(manualFollowersInput)) : null;

      const meta: VideoEditorialMetadata = {
        videoId: video.id,
        userId: user?.uid,
        subject: editorialSubject.trim() || undefined,
        angle: editorialAngle.trim() || undefined,
        hook: editorialHook.trim() || undefined,
        onScreenText: editorialOnScreenText.trim() || undefined,
        musicName: editorialMusicName.trim() || undefined,
        rhythm: editorialRhythm,
        emotion: editorialEmotion.trim() || undefined,
        narration: editorialNarration.trim() || undefined,
        structure: editorialStructure.trim() || undefined,
        contentNature: editorialContentNature,
        manualFavoritesCount: favParsed !== null && Number.isFinite(favParsed) ? favParsed : null,
        manualAttributedFollowers: follParsed !== null && Number.isFinite(follParsed) ? follParsed : null,
        updatedAt: new Date().toISOString(),
      };

      await saveVideoEditorialMeta(meta);
      setIsSavedEditorial(true);
      setTimeout(() => setIsSavedEditorial(false), 3000);
      if (onMetadataUpdated) {
        await onMetadataUpdated();
      }
    } catch (err: any) {
      console.error('Failed to save editorial metadata:', err);
      setEditorialSaveError(err?.message || 'Impossible d’enregistrer les métadonnées pour le moment.');
    } finally {
      setIsSavingEditorial(false);
    }
  };

  // Update test outcome in memory
  const handleSaveTestOutcome = (newStatus: 'a_tester' | 'valide' | 'refute') => {
    setTestStatus(newStatus);
    const { card } = updateVideoTestOutcome(video.id, allVideos, newStatus, testNotes);
    setMemoryCard(card);
    setIsSavedTest(true);
    setTimeout(() => setIsSavedTest(false), 2000);
  };

  // Request fresh AI pedagogical deepening
  const handleRefreshPedagogicalAnalysis = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/tiktok/video-causal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video,
          allVideos,
          siblingVideos: siblingVideos.slice(0, 4),
          retentionData: memoryCard.retention.averageWatchTimeSeconds ? memoryCard.retention : null,
          memory: getAccountKnowledgeMemory(),
          qualitativeTraits: traits,
        }),
      });

      const data = await res.json();
      if (res.ok && data.pedagogicalAnalysis) {
        const updatedCard: VideoMemoryCard = {
          ...memoryCard,
          pedagogicalAnalysis: data.pedagogicalAnalysis,
        };
        setMemoryCard(updatedCard);
        saveVideoMemoryCard(updatedCard);
      } else {
        // Fallback local update
        const updatedAnalysis = generatePedagogicalAnalysis(
          video,
          allVideos,
          getAccountKnowledgeMemory(),
          traits,
          memoryCard.retention
        );
        const updatedCard: VideoMemoryCard = {
          ...memoryCard,
          pedagogicalAnalysis: updatedAnalysis,
        };
        setMemoryCard(updatedCard);
        saveVideoMemoryCard(updatedCard);
      }
    } catch (err: any) {
      console.warn('Network issue on video causal analysis, using local analysis:', err);
      const updatedAnalysis = generatePedagogicalAnalysis(
        video,
        allVideos,
        getAccountKnowledgeMemory(),
        traits,
        memoryCard.retention
      );
      const updatedCard: VideoMemoryCard = {
        ...memoryCard,
        pedagogicalAnalysis: updatedAnalysis,
      };
      setMemoryCard(updatedCard);
      saveVideoMemoryCard(updatedCard);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const formattedDate = new Date(video.createTime * 1000).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const analysis = memoryCard.pedagogicalAnalysis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-amber-500 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-black/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">
                  Fiche Pédagogique & Mémoire de Publication
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-800 text-rose-300 border border-zinc-700">
                  ID: {video.id.slice(-6)}
                </span>
              </div>
              <h2 className="text-base font-bold text-white line-clamp-1">
                {video.title || video.videoDescription || 'Vidéo TikTok'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Key Metrics Ribbon */}
        <div className="bg-zinc-950/50 px-6 py-3 border-b border-zinc-800 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-zinc-400 block">Vues</span>
            <span className="text-sm font-bold text-zinc-50">
              {video.viewCount.toLocaleString('fr-FR')}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">Likes</span>
            <span className="text-sm font-bold text-rose-400">
              {video.likeCount.toLocaleString('fr-FR')}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">Commentaires</span>
            <span className="text-sm font-bold text-amber-400">
              {video.commentCount}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">Partages</span>
            <span className="text-sm font-bold text-indigo-400">
              {video.shareCount}
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">Engagement</span>
            <span className="text-sm font-bold text-emerald-400">
              {video.engagementRate.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-zinc-400 block">Durée</span>
            <span className="text-sm font-bold text-zinc-200">
              {video.duration && video.duration > 0 ? `${video.duration}s` : 'Non fournie'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900 px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'modules'
                ? 'border-indigo-600 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            1. Les 3 Modules & Format Final
          </button>

          <button
            onClick={() => setActiveTab('facts_hypotheses')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'facts_hypotheses'
                ? 'border-indigo-600 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            2. Faits vs Hypothèses
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comparison'
                ? 'border-indigo-600 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            3. Comparaison Historique ({siblingVideos.length} similaires)
          </button>

          <button
            onClick={() => setActiveTab('retention_traits')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'retention_traits'
                ? 'border-indigo-600 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            4. Rétention & Caractéristiques
          </button>

          <button
            onClick={() => setActiveTab('test_tracking')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'test_tracking'
                ? 'border-indigo-600 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            5. Suivi du Test ({testStatus === 'valide' ? 'Validé' : testStatus === 'refute' ? 'Réfuté' : 'À tester'})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/50">
          {/* TAB 1: LES 3 MODULES D'ANALYSE & FORMAT FINAL */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              {/* Quick Action Button to Refresh/Deepen */}
              <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4">
                <div>
                  <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Raisonnement Pédagogique et Causal
                  </h4>
                  <p className="text-xs text-indigo-300 mt-0.5">
                    Analyse structurée en 3 modules obligatoires : Ce qui fonctionne, Ce qui ne fonctionne pas, Les points à améliorer.
                  </p>
                </div>
                <button
                  onClick={handleRefreshPedagogicalAnalysis}
                  disabled={isLoadingAi}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm shadow-black/20 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isLoadingAi ? 'Analyse en cours...' : 'Actualiser l’Analyse'}
                </button>
              </div>

              {/* MODULE 1 — CE QUI FONCTIONNE */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-50 uppercase tracking-wide">
                        MODULE 1 — Ce qui fonctionne
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Éléments contribuant aux bonnes performances et explication causale
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {analysis.module1WhatWorks.length} point(s) identifié(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {analysis.module1WhatWorks.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 space-y-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] block">
                          Ce qui fonctionne
                        </span>
                        <p className="text-zinc-50 font-semibold text-sm mt-0.5">{item.element}</p>
                      </div>

                      <div>
                        <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] block">
                          Pourquoi cela fonctionne (Mécanisme)
                        </span>
                        <p className="text-zinc-200 leading-relaxed mt-0.5">{item.mechanism}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                          <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] block">
                            Preuve statistique
                          </span>
                          <p className="text-zinc-200 font-medium mt-0.5">{item.proof}</p>
                        </div>
                        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-emerald-500/30">
                          <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] block">
                            Comparaison historique
                          </span>
                          <p className="text-zinc-200 mt-0.5">{item.comparison}</p>
                        </div>
                      </div>

                      <div className="bg-emerald-500/15 p-2.5 rounded-lg text-emerald-950 font-medium">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-300 block">
                          Conclusion à retenir
                        </span>
                        <p className="mt-0.5">{item.conclusion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODULE 2 — CE QUI NE FONCTIONNE PAS */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-300 font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-50 uppercase tracking-wide">
                        MODULE 2 — Ce qui ne fonctionne pas
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Éléments limitant les performances (2 premières secondes, accroche, rythme, cadence)
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    {analysis.module2WhatFails.length} frein(s) identifié(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {analysis.module2WhatFails.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/30 space-y-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-rose-300 uppercase tracking-wider text-[10px] block">
                          Ce qui ne fonctionne pas
                        </span>
                        <p className="text-zinc-50 font-semibold text-sm mt-0.5">{item.problem}</p>
                      </div>

                      <div>
                        <span className="font-bold text-rose-300 uppercase tracking-wider text-[10px] block">
                          Pourquoi cela ne fonctionne pas (Mécanisme d'échec)
                        </span>
                        <p className="text-zinc-200 leading-relaxed mt-0.5">{item.mechanism}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-rose-500/30">
                          <span className="font-bold text-rose-300 uppercase tracking-wider text-[10px] block">
                            Preuve statistique
                          </span>
                          <p className="text-zinc-200 font-medium mt-0.5">{item.proof}</p>
                        </div>
                        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-rose-500/30">
                          <span className="font-bold text-rose-300 uppercase tracking-wider text-[10px] block">
                            Comparaison avec publication supérieure
                          </span>
                          <p className="text-zinc-200 mt-0.5">{item.comparison}</p>
                        </div>
                      </div>

                      <div className="bg-rose-500/15 p-2.5 rounded-lg text-rose-950 font-medium">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-rose-300 block">
                          Conclusion
                        </span>
                        <p className="mt-0.5">{item.conclusion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODULE 3 — LES POINTS À AMÉLIORER */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 font-bold flex items-center justify-center text-xs">
                      3
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-50 uppercase tracking-wide">
                        MODULE 3 — Les points à améliorer
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Améliorations concrètes découlant directement des modules 1 et 2
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {analysis.module3Improvements.length} amélioration(s)
                  </span>
                </div>

                <div className="space-y-4">
                  {analysis.module3Improvements.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-50">
                          {item.targetElement}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-zinc-900 p-3 rounded-lg border border-amber-500/30">
                          <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                            2. Comment l'améliorer
                          </span>
                          <p className="text-zinc-100 font-medium mt-1">{item.howToImprove}</p>
                        </div>
                        <div className="bg-zinc-900 p-3 rounded-lg border border-amber-500/30">
                          <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                            3. Pourquoi cette modification
                          </span>
                          <p className="text-zinc-200 mt-1">{item.whyThisModification}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-amber-500/15 p-2.5 rounded-lg border border-amber-500/30">
                          <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                            4. Sur quelle observation s'appuyer
                          </span>
                          <p className="text-zinc-200 mt-0.5">{item.groundedObservation}</p>
                        </div>
                        <div className="bg-amber-500/15 p-2.5 rounded-lg border border-amber-500/30">
                          <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">
                            5. Ce qu'il faut tester concrètement
                          </span>
                          <p className="text-zinc-50 font-semibold mt-0.5">{item.concreteTest}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMAT FINAL OBLIGATOIRE (A, B, C, D, E) */}
              <div className="bg-zinc-950/70 text-white rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Format Final de l'Analyse (A, B, C, D, E)
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5 text-xs">
                  <div className="bg-zinc-800/80 p-3.5 rounded-xl border border-zinc-700">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] block">
                      A. Ce qui fonctionne
                    </span>
                    <p className="text-zinc-300 mt-1 leading-relaxed">
                      {analysis.finalSynthesis.whatWorksSummary}
                    </p>
                  </div>

                  <div className="bg-zinc-800/80 p-3.5 rounded-xl border border-zinc-700">
                    <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] block">
                      B. Ce qui ne fonctionne pas
                    </span>
                    <p className="text-zinc-300 mt-1 leading-relaxed">
                      {analysis.finalSynthesis.whatFailsSummary}
                    </p>
                  </div>

                  <div className="bg-zinc-800/80 p-3.5 rounded-xl border border-zinc-700">
                    <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block">
                      C. Ce qui peut être amélioré
                    </span>
                    <p className="text-zinc-300 mt-1 leading-relaxed">
                      {analysis.finalSynthesis.improvementsSummary}
                    </p>
                  </div>

                  <div className="bg-indigo-950/80 p-3.5 rounded-xl border border-indigo-700/60">
                    <span className="text-indigo-300 font-bold uppercase tracking-wider text-[10px] block">
                      D. Ce que j'ai appris (Mécanisme Pédagogique Principal)
                    </span>
                    <p className="text-indigo-100 font-semibold mt-1 leading-relaxed">
                      {analysis.finalSynthesis.whatLearned}
                    </p>
                  </div>

                  <div className="bg-rose-950/80 p-3.5 rounded-xl border border-rose-700/60">
                    <span className="text-rose-300 font-bold uppercase tracking-wider text-[10px] block">
                      E. Le prochain test
                    </span>
                    <div className="mt-1 space-y-1">
                      <p className="text-white font-bold">{analysis.finalSynthesis.nextTest.experiment}</p>
                      <p className="text-rose-200 text-[11px]">
                        Métrique surveillée : {analysis.finalSynthesis.nextTest.metricToWatch}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISTINCTION FAITS VS HYPOTHÈSES */}
          {activeTab === 'facts_hypotheses' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-2">
                <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  Règle Déontologique : Distinction Stricte Faits vs Hypothèses
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  L'agent ne confond jamais corrélation et causalité. Les éléments directement observés dans les statistiques réelles sont séparés des hypothèses explicatives et des tests de vérification.
                </p>
              </div>

              {/* Data Missing Warnings */}
              {analysis.dataMissingNotices && analysis.dataMissingNotices.length > 0 && (
                <div className="space-y-2">
                  {analysis.dataMissingNotices.map((notice, idx) => (
                    <div
                      key={idx}
                      className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-300"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Données Manquantes</span>
                        <p className="mt-0.5">{notice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Strict Categorization Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* FAITS */}
                <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] tracking-wider uppercase">
                      FAIT
                    </span>
                    <h4 className="text-xs font-bold text-blue-300">
                      Directement Observable
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-100">
                    {analysis.facts.map((fact, idx) => (
                      <li key={idx} className="bg-zinc-900 p-2.5 rounded-lg border border-blue-500/30 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{fact.replace(/^FAIT\s*:\s*/i, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* OBSERVATIONS */}
                <div className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px] tracking-wider uppercase">
                      OBSERVATION
                    </span>
                    <h4 className="text-xs font-bold text-purple-300">
                      Différences constatées
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-100">
                    {analysis.observations.length > 0 ? (
                      analysis.observations.map((obs, idx) => (
                        <li key={idx} className="bg-zinc-900 p-2.5 rounded-lg border border-purple-500/30 flex items-start gap-2">
                          <Eye className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span>{obs.replace(/^OBSERVATION\s*:\s*/i, '')}</span>
                        </li>
                      ))
                    ) : (
                      <li className="bg-zinc-900 p-2.5 rounded-lg border border-purple-500/30 text-zinc-400 italic">
                        Aucun écart d'observation inhabituel par rapport à la moyenne du compte.
                      </li>
                    )}
                  </ul>
                </div>

                {/* HYPOTHÈSES */}
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[10px] tracking-wider uppercase">
                      HYPOTHÈSE
                    </span>
                    <h4 className="text-xs font-bold text-amber-300">
                      Explication possible de la différence
                    </h4>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-100">
                    {analysis.hypotheses.map((hyp, idx) => (
                      <li key={idx} className="bg-zinc-900 p-2.5 rounded-lg border border-amber-500/30 flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{hyp.replace(/^HYPOTHÈSE\s*:\s*/i, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CONCLUSIONS & TESTS */}
                <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] tracking-wider uppercase">
                      CONCLUSION & TEST
                    </span>
                    <h4 className="text-xs font-bold text-emerald-300">
                      Soutenue par l'expérience
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {analysis.conclusions.map((conc, idx) => (
                      <div key={idx} className="bg-zinc-900 p-2.5 rounded-lg border border-emerald-500/30 text-zinc-100">
                        <span className="font-bold text-emerald-300 text-[10px] uppercase block">Conclusion</span>
                        <p className="mt-0.5">{conc.replace(/^CONCLUSION\s*(SOUTENUE)?\s*:\s*/i, '')}</p>
                      </div>
                    ))}
                    {analysis.tests.map((t, idx) => (
                      <div key={idx} className="bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/30 text-zinc-100">
                        <span className="font-bold text-orange-300 text-[10px] uppercase block">Test à réaliser</span>
                        <p className="mt-0.5 font-medium">{t.replace(/^TEST\s*(CONCRET\s*PROPOSÉ)?\s*:\s*/i, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPARAISON AVEC LES DOUBLONS ET SUJETS SIMILAIRES */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-2">
                <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Comparaison avec les Publications Similaires du Compte
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  L'agent recherche les publications partageant le même sujet ou la même vidéo pour identifier les caractéristiques distinctives (durée, heure, accroche, cadence).
                </p>
              </div>

              {bestSibling ? (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Comparaison directe avec la version phare
                    </span>
                    <span className="text-xs font-bold text-rose-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-rose-500/30 shadow-sm shadow-black/20">
                      Écart de {(bestSibling.viewCount / Math.max(video.viewCount, 1)).toFixed(1)}x
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cette vidéo */}
                    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2">
                        <span className="font-bold text-zinc-50">Cette vidéo</span>
                        <span className="text-[11px] text-zinc-400">ID: {video.id.slice(-6)}</span>
                      </div>
                      <p className="font-semibold text-zinc-50 text-sm line-clamp-1">{video.title || video.videoDescription}</p>
                      <div className="grid grid-cols-2 gap-2 text-zinc-300">
                        <div>Vues : <strong className="text-zinc-50">{video.viewCount}</strong></div>
                        <div>Likes : <strong className="text-zinc-50">{video.likeCount}</strong></div>
                        <div>Durée : <strong className="text-zinc-50">{video.duration && video.duration > 0 ? `${video.duration}s` : 'Non fournie'}</strong></div>
                        <div>Engagement : <strong className="text-zinc-50">{video.engagementRate.toFixed(2)}%</strong></div>
                      </div>
                      <p className="text-[11px] text-zinc-400 pt-1">
                        Postée le : {new Date(video.createTime * 1000).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    {/* Vidéo de référence */}
                    <div className="bg-zinc-900 p-4 rounded-xl border border-indigo-500/30 space-y-2 text-xs ring-2 ring-indigo-500/20">
                      <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                        <span className="font-bold text-indigo-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          Version Phare Similaire
                        </span>
                        <span className="text-[11px] text-indigo-400">ID: {bestSibling.id.slice(-6)}</span>
                      </div>
                      <p className="font-semibold text-zinc-50 text-sm line-clamp-1">{bestSibling.title || bestSibling.videoDescription}</p>
                      <div className="grid grid-cols-2 gap-2 text-zinc-300">
                        <div>Vues : <strong className="text-indigo-300">{bestSibling.viewCount.toLocaleString('fr-FR')}</strong></div>
                        <div>Likes : <strong className="text-indigo-300">{bestSibling.likeCount.toLocaleString('fr-FR')}</strong></div>
                        <div>Durée : <strong className="text-indigo-300">{bestSibling.duration && bestSibling.duration > 0 ? `${bestSibling.duration}s` : 'Non fournie'}</strong></div>
                        <div>Engagement : <strong className="text-indigo-300">{bestSibling.engagementRate.toFixed(2)}%</strong></div>
                      </div>
                      <p className="text-[11px] text-indigo-400 pt-1">
                        Postée le : {new Date(bestSibling.createTime * 1000).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Causal Synthesis */}
                  <div className="bg-zinc-900 p-4 rounded-xl border border-indigo-500/30 text-xs space-y-1.5 text-zinc-100">
                    <span className="font-bold text-indigo-300 text-[10px] uppercase block tracking-wider">
                      Pourquoi un écart sur un thème proche ?
                    </span>
                    <p className="leading-relaxed">
                      La publication de référence ({bestSibling.viewCount.toLocaleString('fr-FR')} vues) permet de comparer objectivement créneau, durée ({bestSibling.duration && bestSibling.duration > 0 ? `${bestSibling.duration}s` : 'durée n/c'}) et accroche. Identifiez les différences concrètes plutôt que de reproduire à l’identique à intervalle rapproché.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center space-y-3">
                  <Info className="w-8 h-8 text-zinc-500 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-100">Aucun doublon direct identifié</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Cette publication semble être unique dans son thème par rapport au reste des publications analysées.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RÉTENTION & CARACTÉRISTIQUES QUALITATIVES */}
          {activeTab === 'retention_traits' && (
            <div className="space-y-6">
              {/* Form Retention TikTok Studio */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      Statistiques de Rétention (TikTok Studio)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Copiez les données réelles visibles dans l'onglet Analyse de l'application TikTok pour affiner le diagnostic.
                    </p>
                  </div>
                  {isSavedRetention && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enregistré
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveRetention} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">
                      Temps moyen de visionnage (secondes)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 14.5"
                      value={watchTimeInput}
                      onChange={(e) => setWatchTimeInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">
                      Pourcentage moyen regardé (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ex: 48"
                      value={completionInput}
                      onChange={(e) => setCompletionInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">
                      Rétention à 3 secondes (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ex: 65"
                      value={retention3sInput}
                      onChange={(e) => setRetention3sInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer la Rétention
                    </button>
                  </div>
                </form>
              </div>

              {/* Qualitative Video Characteristics */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      Caractéristiques Qualitatives Observées
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Renseignez la nature de l'accroche, de la musique et du montage pour que l'agent apprenne de vos choix artistiques.
                    </p>
                  </div>
                  {isSavedTraits && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enregistré
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveTraits} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">
                        Type d'accroche (0 - 2 secondes)
                      </label>
                      <select
                        value={traits.hookType}
                        onChange={(e) => setTraits({ ...traits, hookType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="visuelle">Visuelle (changement immédiat / action physique)</option>
                        <option value="sonore">Sonore (voix / cri / souffle brut)</option>
                        <option value="texte">Texte incitatif à l'écran</option>
                        <option value="mixte">Mixte (Texte + Action)</option>
                        <option value="inconnue">Aucune accroche franche (démarrage neutre)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">
                        Rythme du montage
                      </label>
                      <select
                        value={traits.pacing}
                        onChange={(e) => setTraits({ ...traits, pacing: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="rapide">Rapide (cut toutes les 1 à 2 secondes)</option>
                        <option value="modéré">Modéré (cut toutes les 3 à 5 secondes)</option>
                        <option value="lent">Lent / Plan continu (immersion musicale)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">
                        Extrait musical / sonore
                      </label>
                      <select
                        value={traits.musicExcerptType}
                        onChange={(e) => setTraits({ ...traits, musicExcerptType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="refrain_climax">Refrain / Climax vocal</option>
                        <option value="intro">Introduction / Début de prestation</option>
                        <option value="acoustique_brute">Son brut / Acoustique direct</option>
                        <option value="inconnu">Autre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">
                        Fin de la vidéo
                      </label>
                      <select
                        value={traits.endingType}
                        onChange={(e) => setTraits({ ...traits, endingType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="fin_brutale">Coupe brutale sans conclusion</option>
                        <option value="cta_abonne">Appel à l'action / Abonnement</option>
                        <option value="boucle_parfaite">Boucle parfaite (seamless loop)</option>
                        <option value="point_d_interrogation">Question ouverte à l'écran</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-200 mb-1">
                      Description précise de l'accroche des 2 premières secondes
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Action visuelle immédiate dès 0:00 avec titre court lisible"
                      value={traits.twoSecondsHookDescription || ''}
                      onChange={(e) => setTraits({ ...traits, twoSecondsHookDescription: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-black/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Enregistrer les Caractéristiques
                    </button>
                  </div>
                </form>
              </div>

              {/* Editorial Metadata & Optional Manual Counters (PARTIE 4.2, 4.3, 4.4, 5) */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Métadonnées Éditoriales &amp; Données Studio Complémentaires
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Alimente directement le comparateur « Niveau supérieur », la séparation Création / Repost et les indicateurs optionnels (Favoris, Abonnés attribués).
                    </p>
                  </div>
                  {isSavedEditorial && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Enregistré
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveEditorialMeta} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Nature du contenu</label>
                      <select
                        value={editorialContentNature}
                        onChange={(e) => setEditorialContentNature(e.target.value as ContentNature)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="creation">Création originale</option>
                        <option value="repost">Repost / Partage autorisé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Favoris (TikTok Studio, optionnel)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Non fourni par API"
                        value={manualFavoritesInput}
                        onChange={(e) => setManualFavoritesInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Abonnés attribués (Studio, optionnel)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="Non attribué par API"
                        value={manualFollowersInput}
                        onChange={(e) => setManualFollowersInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Sujet / Thématique</label>
                      <input
                        type="text"
                        placeholder="Ex: Acoustique voix, Sortie trail, Conseils..."
                        value={editorialSubject}
                        onChange={(e) => setEditorialSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Angle éditorial</label>
                      <input
                        type="text"
                        placeholder="Ex: Coulisses, Défi, Avant/Après..."
                        value={editorialAngle}
                        onChange={(e) => setEditorialAngle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Accroche (Hook)</label>
                      <input
                        type="text"
                        placeholder="Ex: Entrée directe sur la note haute"
                        value={editorialHook}
                        onChange={(e) => setEditorialHook(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Texte affiché à l’écran</label>
                      <input
                        type="text"
                        placeholder="Ex: Phrase d’ouverture incrustée"
                        value={editorialOnScreenText}
                        onChange={(e) => setEditorialOnScreenText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Musique / Son utilisé</label>
                      <input
                        type="text"
                        placeholder="Nom de la piste ou Son original"
                        value={editorialMusicName}
                        onChange={(e) => setEditorialMusicName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Rythme / Émotion dominante</label>
                      <div className="flex gap-2">
                        <select
                          value={editorialRhythm}
                          onChange={(e) => setEditorialRhythm(e.target.value as 'rapide' | 'modéré' | 'lent')}
                          className="w-1/2 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="rapide">Rapide</option>
                          <option value="modéré">Modéré</option>
                          <option value="lent">Lent</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Émotion (ex: Émouvant)"
                          value={editorialEmotion}
                          onChange={(e) => setEditorialEmotion(e.target.value)}
                          className="w-1/2 px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Narration</label>
                      <input
                        type="text"
                        placeholder="Ex: Voix off, Face caméra, Sans voix"
                        value={editorialNarration}
                        onChange={(e) => setEditorialNarration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-zinc-200 mb-1">Structure</label>
                      <input
                        type="text"
                        placeholder="Ex: Promesse → Preuve → Boucle"
                        value={editorialStructure}
                        onChange={(e) => setEditorialStructure(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {editorialSaveError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {editorialSaveError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {isSavedEditorial && (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Métadonnées enregistrées (
                        {editorialContentNature === 'repost' ? 'Repost' : 'Création'})
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingEditorial}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-black/20 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingEditorial ? 'Enregistrement…' : 'Enregistrer les métadonnées éditoriales'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: SUIVI DU TEST & APPRENTISSAGE DURABLE */}
          {activeTab === 'test_tracking' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-2">
                <h3 className="text-sm font-bold text-zinc-50 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-400" />
                  Cycle d'Apprentissage & Vérification des Hypothèses
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  L'agent progresse avec vous. Lorsque vous publiez une nouvelle vidéo en appliquant la recommandation issue de cette fiche, enregistrez ici le résultat pour valider ou réfuter l'hypothèse.
                </p>
              </div>

              {/* Current Hypothesis Card */}
              <div className="bg-zinc-950/70 text-white rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Hypothèse Formulee pour cette vidéo
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {analysis.finalSynthesis.nextTest.experiment}
                </p>
                <div className="flex items-center gap-4 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
                  <span>Métrique testée : <strong className="text-amber-300">{analysis.finalSynthesis.nextTest.metricToWatch}</strong></span>
                  <span>Statut actuel : <strong className="text-white capitalize">{testStatus === 'valide' ? 'Validé' : testStatus === 'refute' ? 'Réfuté' : 'À tester'}</strong></span>
                </div>
              </div>

              {/* Test Outcome Selector */}
              <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Résultat du test suite à la publication suivante
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveTestOutcome('valide')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      testStatus === 'valide'
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-zinc-800 hover:bg-zinc-800/60 text-zinc-200'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="block text-xs font-bold">Hypothèse Validée</strong>
                      <span className="text-[11px] text-zinc-400">Les performances ont augmenté</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveTestOutcome('refute')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      testStatus === 'refute'
                        ? 'border-rose-600 bg-rose-500/10 text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-zinc-800 hover:bg-zinc-800/60 text-zinc-200'
                    }`}
                  >
                    <X className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <strong className="block text-xs font-bold">Hypothèse Réfutée</strong>
                      <span className="text-[11px] text-zinc-400">Aucun impact constaté</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveTestOutcome('a_tester')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      testStatus === 'a_tester'
                        ? 'border-amber-600 bg-amber-500/10 text-amber-300 ring-2 ring-amber-500/20'
                        : 'border-zinc-800 hover:bg-zinc-800/60 text-zinc-200'
                    }`}
                  >
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <strong className="block text-xs font-bold">En attente de test</strong>
                      <span className="text-[11px] text-zinc-400">Prochaine sortie prévue</span>
                    </div>
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block font-semibold text-zinc-200">
                    Notes et observations sur le résultat
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: J'ai testé l'accroche jaune le lendemain à 07h45 et la vidéo a fait 2 400 vues en 24h avec 18 commentaires."
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {isSavedTest ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Apprentissage enregistré dans la mémoire du compte
                    </span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={() => handleSaveTestOutcome(testStatus)}
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-black/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Enregistrer la leçon
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Date de publication : <strong>{formattedDate}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition cursor-pointer"
          >
            Fermer la fiche
          </button>
        </div>
      </div>
    </div>
  );
};
