import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Film,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Music,
  Hash,
  Award,
  Sliders,
  Eye,
  Play,
  RotateCcw,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Brain,
  Info,
  Layers,
  Search,
  Flame,
  HelpCircle,
  Video,
} from 'lucide-react';
import {
  VisionnaireImportedVideo,
  VisionnaireAnalysisResult,
  AccountKnowledgeMemory,
} from '../types';
import {
  getStoredVisionnaireVideos,
  saveVisionnaireVideos,
  analyzeVideoPrePublication,
  rankVisionnaireVideos,
  captureVideoFrame,
} from '../utils/visionnaireEngine';
import { getAccountKnowledgeMemory } from '../utils/learningMemoryEngine';
import { MeterBar, Sparkline } from './ui';

interface TikTokVisionnaireProps {
  onNavigateTab?: (tab: any) => void;
}

export const TikTokVisionnaire: React.FC<TikTokVisionnaireProps> = ({
  onNavigateTab,
}) => {
  // Stored Visionnaire videos
  const [videos, setVideos] = useState<VisionnaireImportedVideo[]>(() =>
    getStoredVisionnaireVideos()
  );

  // Selected video for detail view
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Filter tabs: all, recommended, to_modify, pending
  const [filterTab, setFilterTab] = useState<'all' | 'recommended' | 'modify' | 'pending'>('all');

  // Loading / analyzing state
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);

  // Copied caption state
  const [hasCopiedCaption, setHasCopiedCaption] = useState(false);

  // Hidden video element for capturing thumbnails and metadata
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize memory from Mon Coach TikTok
  const [accountMemory] = useState<AccountKnowledgeMemory>(() =>
    getAccountKnowledgeMemory()
  );

  // Set initial selected video
  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos, selectedVideoId]);

  // Persist to localStorage whenever videos change
  useEffect(() => {
    saveVisionnaireVideos(videos);
  }, [videos]);

  // Real, exact counters (zero fake data)
  const totalImported = videos.length;
  const analyzedCount = videos.filter((v) => v.analysisStatus === 'analyzed' && v.analysis).length;
  const pendingCount = videos.filter((v) => v.analysisStatus === 'pending' || !v.analysis).length;
  const recommendedCount = videos.filter((v) => v.analysis?.recommendation === 'PUBLIER').length;

  // Selected video object
  const selectedVideo = videos.find((v) => v.id === selectedVideoId) || videos[0] || null;

  // Handle multi-file video import
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newVideos: VisionnaireImportedVideo[] = [];

    Array.from(files).forEach((file, index) => {
      // Validate that it is a video
      if (!file.type.startsWith('video/')) return;

      const videoUrl = URL.createObjectURL(file);
      const videoId = `vis_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;

      const importedItem: VisionnaireImportedVideo = {
        id: videoId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileSize: file.size,
        duration: 30, // Default duration, will be refined when metadata loads
        width: 1080,
        height: 1920,
        videoUrl,
        importedAt: new Date().toISOString(),
        analysisStatus: 'pending',
      };

      // Extract duration and thumbnail using a temporary video element
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = videoUrl;
      tempVideo.onloadedmetadata = () => {
        importedItem.duration = Math.round(tempVideo.duration) || 30;
        importedItem.width = tempVideo.videoWidth || 1080;
        importedItem.height = tempVideo.videoHeight || 1920;

        // Seek slightly to capture a non-black thumbnail
        tempVideo.currentTime = Math.min(1, tempVideo.duration / 2);
      };

      tempVideo.onseeked = () => {
        const frame = captureVideoFrame(tempVideo);
        if (frame) {
          importedItem.thumbnailUrl = frame;
        }
        // Trigger re-render with enriched metadata
        setVideos((prev) =>
          prev.map((v) => (v.id === importedItem.id ? { ...importedItem } : v))
        );
      };

      newVideos.push(importedItem);
    });

    if (newVideos.length > 0) {
      setVideos((prev) => {
        const updated = [...newVideos, ...prev];
        return updated;
      });
      setSelectedVideoId(newVideos[0].id);
    }
  };

  // Analyze a single video
  const handleAnalyzeSingleVideo = async (videoItem: VisionnaireImportedVideo) => {
    setAnalyzingVideoId(videoItem.id);
    try {
      // Analyze with the pre-publication engine
      const analysis = analyzeVideoPrePublication(
        {
          id: videoItem.id,
          name: videoItem.name,
          duration: videoItem.duration,
          width: videoItem.width,
          height: videoItem.height,
          userCaption: videoItem.userCaption,
        },
        accountMemory
      );

      setVideos((prev) => {
        const updated = prev.map((v) =>
          v.id === videoItem.id
            ? { ...v, analysisStatus: 'analyzed' as const, analysis }
            : v
        );
        return rankVisionnaireVideos(updated);
      });
    } catch (err: any) {
      console.error('Error analyzing video:', err);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoItem.id
            ? { ...v, analysisStatus: 'error' as const, analysisError: err.message }
            : v
        )
      );
    } finally {
      setAnalyzingVideoId(null);
    }
  };

  // Batch analyze all pending videos
  const handleAnalyzeAllPending = async () => {
    const pendings = videos.filter((v) => v.analysisStatus === 'pending' || !v.analysis);
    if (pendings.length === 0) return;

    setIsAnalyzingAll(true);
    let currentList = [...videos];

    for (const item of pendings) {
      setAnalyzingVideoId(item.id);
      // Small simulated delay for realistic feel
      await new Promise((r) => setTimeout(r, 250));
      const analysis = analyzeVideoPrePublication(
        {
          id: item.id,
          name: item.name,
          duration: item.duration,
          width: item.width,
          height: item.height,
          userCaption: item.userCaption,
        },
        accountMemory
      );

      currentList = currentList.map((v) =>
        v.id === item.id ? { ...v, analysisStatus: 'analyzed' as const, analysis } : v
      );
      setVideos(rankVisionnaireVideos([...currentList]));
    }

    setIsAnalyzingAll(false);
    setAnalyzingVideoId(null);
  };

  // Delete a video from Visionnaire
  const handleDeleteVideo = (id: string) => {
    const updated = videos.filter((v) => v.id !== id);
    setVideos(updated);
    if (selectedVideoId === id) {
      setSelectedVideoId(updated[0]?.id || null);
    }
  };

  // Clear all videos
  const handleClearAll = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les vidéos importées dans Mon Visionnaire ?')) {
      setVideos([]);
      setSelectedVideoId(null);
      localStorage.removeItem('tiktok_visionnaire_imported_videos_v1');
    }
  };

  // Copy caption
  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    setHasCopiedCaption(true);
    setTimeout(() => setHasCopiedCaption(false), 2000);
  };

  // Filtered videos for list
  const filteredVideos = videos.filter((v) => {
    if (filterTab === 'recommended') return v.analysis?.recommendation === 'PUBLIER';
    if (filterTab === 'modify') return v.analysis?.recommendation === 'MODIFIER';
    if (filterTab === 'pending') return v.analysisStatus === 'pending' || !v.analysis;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden elements for processing */}
      <video ref={hiddenVideoRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Main Hero Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Agent Pré-Publication • Stratégie & Potentiel
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mon Visionnaire TikTok
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Analysez vos brouillons et montages <strong>AVANT</strong> de les publier sur TikTok. Identifiez les meilleures vidéos, testez la rétention estimée, trouvez la musique tendance idéale et optimisez vos hashtags avec Creator Search Insights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-zinc-950 font-extrabold text-xs sm:text-sm shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-zinc-950" />
              Importer mes brouillons (.mp4)
            </button>

            {pendingCount > 0 && (
              <button
                onClick={handleAnalyzeAllPending}
                disabled={isAnalyzingAll}
                className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm border border-zinc-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {isAnalyzingAll ? 'Analyse en cours...' : `Analyser (${pendingCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Real Exact Counters Ribbon */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-800/60 rounded-2xl p-4 border border-zinc-700/60">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Total Importées
            </span>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {totalImported}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Vidéos de vos brouillons</span>
          </div>

          <div className="bg-zinc-800/60 rounded-2xl p-4 border border-zinc-700/60">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
              Analysées
            </span>
            <div className="text-2xl font-black text-indigo-300 mt-1 font-mono">
              {analyzedCount}
            </div>
            <span className="text-[11px] text-indigo-200/80 mt-0.5 block">Diagnostics complets</span>
          </div>

          <div className="bg-zinc-800/60 rounded-2xl p-4 border border-zinc-700/60">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              En attente
            </span>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
              {pendingCount}
            </div>
            <span className="text-[11px] text-amber-200/80 mt-0.5 block">Prêtes pour évaluation</span>
          </div>

          <div className="bg-zinc-800/60 rounded-2xl p-4 border border-zinc-700/60">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Recommandées
            </span>
            <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
              {recommendedCount}
            </div>
            <span className="text-[11px] text-emerald-200/80 mt-0.5 block">Statut « PUBLIER »</span>
          </div>
        </div>
      </div>

      {/* Cross-module Banner: Connection to Mon Coach TikTok */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-950">
              Connexion Active avec « Mon Coach TikTok »
            </h4>
            <p className="text-indigo-300 mt-0.5">
              Le Visionnaire applique automatiquement les <strong>{accountMemory.verifiedRules.length} règles validées</strong> et les <strong>{accountMemory.activeHypotheses.length} hypothèses</strong> issues de vos 93 publications publiées sur @good.story__5.
            </p>
          </div>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('coach')}
            className="text-xs font-bold text-indigo-300 hover:text-indigo-300 underline whitespace-nowrap cursor-pointer"
          >
            Voir les règles du Coach →
          </button>
        )}
      </div>

      {/* Main Workspace Area */}
      {videos.length === 0 ? (
        /* Empty State & Upload Dropzone */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-3xl p-12 bg-zinc-900/70 text-center space-y-4 transition cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100">
              Glissez-déposez vos vidéos de brouillons TikTok ici
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Sélectionnez une ou plusieurs vidéos préparées dans TikTok (.mp4, .mov, .webm) pour que le Visionnaire évalue leur potentiel avant publication.
            </p>
          </div>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Film className="w-4 h-4" />
            Parcourir mes fichiers
          </button>
        </div>
      ) : (
        /* 2-Column Interface: Left Video List / Right Video Detail */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Video List & Ranking (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Classement des Brouillons ({filteredVideos.length})
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer"
                    title="Ajouter d'autres vidéos"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                    title="Effacer la liste"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub Filter Tabs */}
              <div className="flex gap-1 bg-zinc-800 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                    filterTab === 'all' ? 'bg-zinc-900/70 text-zinc-50 shadow-sm shadow-black/20' : 'text-zinc-400'
                  }`}
                >
                  Tous ({totalImported})
                </button>
                <button
                  onClick={() => setFilterTab('recommended')}
                  className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                    filterTab === 'recommended' ? 'bg-zinc-900/70 text-emerald-300 shadow-sm shadow-black/20' : 'text-zinc-400'
                  }`}
                >
                  Publier ({recommendedCount})
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                    filterTab === 'pending' ? 'bg-zinc-900/70 text-amber-300 shadow-sm shadow-black/20' : 'text-zinc-400'
                  }`}
                >
                  En attente ({pendingCount})
                </button>
              </div>

              {/* Video Cards List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredVideos.map((item) => {
                  const isSelected = item.id === selectedVideo?.id;
                  const analysis = item.analysis;
                  const rank = analysis?.rank;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedVideoId(item.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex gap-3 text-xs relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-500/10 ring-1 ring-indigo-500/20 shadow-sm shadow-black/20'
                          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/70'
                      }`}
                    >
                      {/* Video Thumbnail */}
                      <div className="w-16 h-20 bg-zinc-950 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center text-zinc-400">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="w-6 h-6 text-zinc-300" />
                        )}
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 text-white px-1 rounded-sm">
                          {item.duration}s
                        </span>
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            {rank ? (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-zinc-800 text-amber-400">
                                #{rank}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500">Brouillon</span>
                            )}

                            {analysis ? (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                  analysis.recommendation === 'PUBLIER'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : analysis.recommendation === 'MODIFIER'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-rose-500/15 text-rose-300'
                                }`}
                              >
                                {analysis.recommendation}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                En attente
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-zinc-50 line-clamp-1 leading-snug">
                            {item.name}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/70">
                          {analysis ? (
                            <span className="font-extrabold text-indigo-400 text-sm">
                              {analysis.scoreTotal}<span className="text-[10px] text-zinc-500">/100</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeSingleVideo(item);
                              }}
                              disabled={analyzingVideoId === item.id}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                            >
                              {analyzingVideoId === item.id ? 'Analyse...' : 'Analyser →'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(item.id);
                            }}
                            className="text-zinc-500 hover:text-rose-400 transition p-1"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Deep Video Detail View (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedVideo ? (
              <div className="space-y-6">
                {/* Top Card: Video Player + Big Verdict */}
                <div className="bg-zinc-900/70 rounded-3xl p-6 border border-zinc-800 shadow-sm shadow-black/20 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Native HTML5 Video Player */}
                    <div className="md:col-span-5 bg-black rounded-2xl overflow-hidden aspect-[9/14] max-h-72 flex items-center justify-center relative shadow-inner">
                      {selectedVideo.videoUrl ? (
                        <video
                          src={selectedVideo.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4 text-zinc-400">
                          <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Aperçu vidéo disponible</p>
                        </div>
                      )}
                    </div>

                    {/* Verdict & Score */}
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                            Fichier Brouillon
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            ({selectedVideo.duration}s • {(selectedVideo.fileSize / (1024 * 1024)).toFixed(1)} Mo)
                          </span>
                        </div>
                        <h2 className="text-lg font-extrabold text-zinc-50 leading-snug">
                          {selectedVideo.name}
                        </h2>
                      </div>

                      {selectedVideo.analysis ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col items-center justify-center shrink-0">
                              <span className="text-xl font-black text-indigo-950 font-mono">
                                {selectedVideo.analysis.scoreTotal}
                              </span>
                              <span className="text-[9px] font-bold text-indigo-400 uppercase">
                                Potentiel
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    selectedVideo.analysis.recommendation === 'PUBLIER'
                                      ? 'bg-emerald-600 text-white'
                                      : selectedVideo.analysis.recommendation === 'MODIFIER'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  Recommandation : {selectedVideo.analysis.recommendation}
                                </span>
                                {selectedVideo.analysis.rank && (
                                  <span className="text-xs font-bold text-zinc-400">
                                    Rang #{selectedVideo.analysis.rank}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-300 leading-snug">
                                {selectedVideo.analysis.recommendationReason}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 text-xs text-amber-300">
                          <p className="font-semibold">
                            Cette vidéo n'a pas encore été analysée par Mon Visionnaire.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAnalyzeSingleVideo(selectedVideo)}
                            disabled={analyzingVideoId === selectedVideo.id}
                            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            {analyzingVideoId === selectedVideo.id ? 'Analyse en cours...' : 'Lancer l’Analyse Intelligente'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* If analyzed, render all deep sections */}
                {selectedVideo.analysis && (
                  <div className="space-y-6">
                    {/* The 5 Sub-Scores Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">Accroche 2s</span>
                        <div className="text-xl font-black text-zinc-50 mt-1 font-mono">
                          {selectedVideo.analysis.subScores.hookScore}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">Rétention Estimée</span>
                        <div className="text-xl font-black text-zinc-50 mt-1 font-mono">
                          {selectedVideo.analysis.subScores.retentionScore}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">Potentiel Émotion</span>
                        <div className="text-xl font-black text-zinc-50 mt-1 font-mono">
                          {selectedVideo.analysis.subScores.emotionScore}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">Cohérence Musique</span>
                        <div className="text-xl font-black text-zinc-50 mt-1 font-mono">
                          {selectedVideo.analysis.subScores.musicScore}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 shadow-sm shadow-black/20 col-span-2 sm:col-span-1">
                        <span className="text-zinc-500 text-[10px] font-bold uppercase block">SEO & Recherche</span>
                        <div className="text-xl font-black text-zinc-50 mt-1 font-mono">
                          {selectedVideo.analysis.subScores.seoSearchScore}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Accroche & 2 Premières Secondes */}
                    <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2.5">
                        <h3 className="font-bold text-zinc-50 uppercase tracking-wide flex items-center gap-2">
                          <Eye className="w-4 h-4 text-indigo-400" />
                          A. Accroche et 2 Premières Secondes
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          selectedVideo.analysis.hookAnalysis.isCatchy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {selectedVideo.analysis.hookAnalysis.isCatchy ? 'Accroche Efficace' : 'À Renforcer'}
                        </span>
                      </div>

                      <p className="text-zinc-200 leading-relaxed">
                        {selectedVideo.analysis.hookAnalysis.twoSecondsVerdict}
                      </p>

                      <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800 space-y-1.5">
                        <span className="font-bold text-zinc-100 text-[10px] uppercase block">
                          Conseils d'amélioration de l'accroche :
                        </span>
                        <ul className="space-y-1 text-zinc-300">
                          {selectedVideo.analysis.hookAnalysis.improvements.map((imp, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Section 2: Rétention Prédictive */}
                    <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2.5">
                        <h3 className="font-bold text-zinc-50 uppercase tracking-wide flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-400" />
                          B. Rétention de l'Attention (Estimation Pré-Publication)
                        </h3>
                        <span className="text-zinc-400 text-[11px]">
                          Complétion estimée : <strong>{selectedVideo.analysis.retentionAnalysis.estimatedCompletionRate}%</strong>
                        </span>
                      </div>

                      {/* Explicit Notice (Distinction estimation vs réalité) */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-amber-300">
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="leading-snug">
                          {selectedVideo.analysis.retentionAnalysis.notice}
                        </p>
                      </div>

                      {/* Visual Retention Curve Points */}
                      <div className="bg-zinc-950/70 text-white rounded-xl p-4 space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                          Projection de Rétention par Seconde
                        </span>
                        <MeterBar
                          label="Complétion estimée"
                          value={Number(selectedVideo.analysis.retentionAnalysis.estimatedCompletionRate) || 0}
                          max={100}
                          color="#fbbf24"
                          decimals={0}
                        />
                        <Sparkline
                          data={selectedVideo.analysis.retentionAnalysis.curvePoints.map((pt) => Number(pt.estimatedRetentionPct) || 0)}
                          labels={selectedVideo.analysis.retentionAnalysis.curvePoints.map((pt) => `${pt.second}s`)}
                          color="#fbbf24"
                          height={110}
                          formatValue={(v) => `${v} % de rétention`}
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center pt-1">
                          {selectedVideo.analysis.retentionAnalysis.curvePoints.map((pt, i) => (
                            <div key={i} className="bg-zinc-800 p-2 rounded-lg border border-zinc-700/60">
                              <span className="text-[10px] text-zinc-500 block">{pt.second}s</span>
                              <strong className="text-sm text-amber-400 font-mono block mt-0.5">
                                {pt.estimatedRetentionPct}%
                              </strong>
                              <span className="text-[9px] text-zinc-400 line-clamp-1 mt-0.5">
                                {pt.phaseLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Drop Moments */}
                      <div className="space-y-1">
                        <span className="font-bold text-zinc-100 text-[10px] uppercase block">
                          Moments critiques où le spectateur risque de décrocher :
                        </span>
                        <ul className="space-y-1 text-zinc-300">
                          {selectedVideo.analysis.retentionAnalysis.estimatedDropMoments.map((dm, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>{dm}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Section 3: Musiques Adaptées & Tendances TikTok */}
                    <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2.5">
                        <h3 className="font-bold text-zinc-50 uppercase tracking-wide flex items-center gap-2">
                          <Music className="w-4 h-4 text-rose-400" />
                          C. Recherche de Musiques Adaptées
                        </h3>
                        <span className="text-zinc-400 text-[11px]">
                          Vérifiées & Pertinentes
                        </span>
                      </div>

                      <div className="space-y-3">
                        {selectedVideo.analysis.musicRecommendations.map((music, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">
                                  {i + 1}
                                </span>
                                <h4 className="font-bold text-zinc-50 text-sm">
                                  {music.soundName} — <span className="text-zinc-300 font-semibold">{music.artist}</span>
                                </h4>
                                <span className="px-2 py-0.5 rounded-md bg-zinc-900/70 border border-zinc-800 text-zinc-300 text-[10px] font-bold">
                                  {music.genre}
                                </span>
                              </div>
                              <p className="text-zinc-300 leading-snug pl-7">
                                {music.whyItImproves}
                              </p>
                              {music.currentSoundVerdict && (
                                <p className="text-emerald-300 font-medium text-[11px] pl-7 pt-1">
                                  ★ {music.currentSoundVerdict}
                                </p>
                              )}
                            </div>

                            <a
                              href={music.tiktokSearchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-zinc-900/70 hover:bg-zinc-800/80 text-zinc-100 font-bold text-[11px] rounded-lg border border-zinc-800 transition flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer shadow-sm shadow-black/20"
                            >
                              <span>Trouver sur TikTok</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 4: Creator Search Insights (Hashtags & SEO Caption) */}
                    <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-zinc-800/70 pb-2.5">
                        <h3 className="font-bold text-zinc-50 uppercase tracking-wide flex items-center gap-2">
                          <Hash className="w-4 h-4 text-indigo-400" />
                          D. Hashtags & Creator Search Insights
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
                          Forte Demande / Recherche
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">Requête clé identifiée :</span>
                          <strong className="text-zinc-50 bg-zinc-800 px-2.5 py-0.5 rounded-md font-mono">
                            {selectedVideo.analysis.creatorSearchInsights.highDemandQuery}
                          </strong>
                          <span className="text-zinc-500 text-[11px]">
                            (Concurrence : {selectedVideo.analysis.creatorSearchInsights.competitionLevel})
                          </span>
                        </div>
                      </div>

                      {/* Hashtags list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedVideo.analysis.creatorSearchInsights.recommendedHashtags.map((h, i) => (
                          <div key={i} className="p-2.5 rounded-xl border border-zinc-800/70 bg-zinc-950/50 flex flex-col justify-between space-y-1">
                            <span className="font-bold text-indigo-300 font-mono text-sm">{h.tag}</span>
                            <p className="text-zinc-300 text-[11px] leading-snug">{h.explanation}</p>
                          </div>
                        ))}
                      </div>

                      {/* Optimized Caption Proposal */}
                      <div className="bg-zinc-950/70 text-white rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            Proposition de Légende Optimisée
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCaption(selectedVideo.analysis?.creatorSearchInsights.optimizedCaption || '')}
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            {hasCopiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {hasCopiedCaption ? 'Copié !' : 'Copier'}
                          </button>
                        </div>
                        <p className="text-zinc-300 text-xs font-medium leading-relaxed font-sans">
                          {selectedVideo.analysis.creatorSearchInsights.optimizedCaption}
                        </p>
                      </div>
                    </div>

                    {/* Section 5: Checklist Avant Publication */}
                    <div className="bg-zinc-900/70 rounded-2xl p-5 border border-zinc-800 shadow-sm shadow-black/20 space-y-3 text-xs">
                      <h3 className="font-bold text-zinc-50 uppercase tracking-wide flex items-center gap-2 border-b border-zinc-800/70 pb-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        E. Checklist des Modifications Recommandées
                      </h3>

                      <ul className="space-y-2">
                        {selectedVideo.analysis.actionableChecklist.map((act, i) => (
                          <li key={i} className="p-2.5 rounded-xl border border-zinc-800/70 bg-zinc-950/50 flex items-start gap-2 text-zinc-100">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/70 p-12 rounded-3xl border border-zinc-800 text-center space-y-3">
                <Film className="w-10 h-10 text-zinc-500 mx-auto" />
                <h4 className="font-bold text-zinc-100">Sélectionnez une vidéo pour afficher l'analyse</h4>
                <p className="text-xs text-zinc-400">
                  Importez ou choisissez une vidéo dans la liste de gauche pour explorer son diagnostic pré-publication.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
