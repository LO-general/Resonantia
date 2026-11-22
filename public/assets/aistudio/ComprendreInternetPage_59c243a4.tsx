import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Film,
  Layers,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  InternetPrincipleCard,
  PedagogicalUserProgress,
  PedagogicalVideoCategory,
  PedagogicalVideoLesson,
  UserProfile,
} from '../types';
import { INTERNET_PRINCIPLES } from '../utils/internetKnowledgeEngine';
import { ScrollProgress, useScrollReveal } from './ui';
import {
  PEDAGOGICAL_VIDEO_CATEGORIES,
  formatFileSize,
  formatVideoDuration,
  sortPedagogicalVideos,
  validatePedagogicalVideoFile,
  validatePedagogicalVideoMetadata,
} from '../utils/pedagogicalVideosLogic';
import {
  deletePedagogicalVideo,
  fetchPedagogicalUserProgress,
  fetchPedagogicalVideos,
  replacePedagogicalVideoFile,
  resolvePedagogicalAdminStatus,
  updatePedagogicalUserProgress,
  updatePedagogicalVideoMetadata,
  uploadPedagogicalVideo,
} from '../services/pedagogicalVideosService';

interface ComprendreInternetPageProps {
  currentUser?: UserProfile | null;
  onNavigateNext: () => void;
  onNavigateBack: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const ComprendreInternetPage: React.FC<ComprendreInternetPageProps> = ({
  currentUser,
  onNavigateNext,
  onNavigateBack,
}) => {
  const userId = currentUser?.uid || 'guest';

  // --- Shared Video Library State ---
  const [videos, setVideos] = useState<PedagogicalVideoLesson[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Per-User Learning Progress ---
  const [progress, setProgress] = useState<PedagogicalUserProgress>({
    userId,
    watchedLessonIds: [],
    completedAtByLessonId: {},
    updatedAt: new Date().toISOString(),
  });

  // --- Player & Filter State ---
  const [selectedCategory, setSelectedCategory] = useState<'Toutes' | PedagogicalVideoCategory>('Toutes');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // --- Admin Modal State (Add / Edit / Replace) ---
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingLesson, setEditingLesson] = useState<PedagogicalVideoLesson | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<PedagogicalVideoCategory>('Émotion & Connexion');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number | undefined>(undefined);
  const [uploadProgressPct, setUploadProgressPct] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- In-App Delete Confirmation Modal ---
  const [lessonToDelete, setLessonToDelete] = useState<PedagogicalVideoLesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Written Foundational Principles (Preserved Progressive Transition) ---
  const [showWrittenPrinciples, setShowWrittenPrinciples] = useState<boolean>(true);
  const [selectedPrinciple, setSelectedPrinciple] = useState<InternetPrincipleCard | null>(null);
  const [exploredIds, setExploredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`tiktok_explored_principles_${userId}`);
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('tiktok_explored_principles');
      return legacy ? JSON.parse(legacy) : [];
    } catch {
      return [];
    }
  });

  // Load permissions, shared videos, and per-user learning progress
  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      setIsLoadingVideos(true);
      setVideosError(null);
      try {
        const [adminStatus, loadedVideos, userProgress] = await Promise.all([
          resolvePedagogicalAdminStatus(currentUser),
          fetchPedagogicalVideos(),
          fetchPedagogicalUserProgress(userId),
        ]);
        if (!active) return;
        setIsAdmin(adminStatus);
        const sorted = sortPedagogicalVideos(loadedVideos);
        setVideos(sorted);
        setProgress(userProgress);

        if (sorted.length > 0) {
          const resumed =
            userProgress.lastLessonId && sorted.some((v) => v.id === userProgress.lastLessonId)
              ? userProgress.lastLessonId
              : sorted[0].id;
          setActiveLessonId(resumed);
        } else {
          setActiveLessonId(null);
        }
      } catch (err: any) {
        if (!active) return;
        setVideosError(err?.message || 'Erreur lors du chargement du parcours vidéo.');
      } finally {
        if (active) setIsLoadingVideos(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [currentUser?.uid, currentUser?.email]);

  // Clean up object URLs on preview change/unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredVideos = useMemo(() => {
    const sorted = sortPedagogicalVideos(videos);
    if (selectedCategory === 'Toutes') return sorted;
    return sorted.filter((v) => v.category === selectedCategory);
  }, [videos, selectedCategory]);

  const activeLesson = useMemo(() => {
    if (filteredVideos.length === 0) return null;
    const found = filteredVideos.find((v) => v.id === activeLessonId);
    return found || filteredVideos[0];
  }, [filteredVideos, activeLessonId]);

  const activeIndex = useMemo(() => {
    if (!activeLesson) return -1;
    return filteredVideos.findIndex((v) => v.id === activeLesson.id);
  }, [filteredVideos, activeLesson]);

  const watchedCount = useMemo(() => {
    const validIds = new Set(videos.map((v) => v.id));
    return progress.watchedLessonIds.filter((id) => validIds.has(id)).length;
  }, [videos, progress.watchedLessonIds]);

  const videoProgressPct = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    updatePedagogicalUserProgress({
      userId,
      lastLessonId: lessonId,
    })
      .then((updated) => setProgress(updated))
      .catch(() => {});
  };

  const handleStepLesson = (direction: 'prev' | 'next') => {
    if (filteredVideos.length === 0 || activeIndex < 0) return;
    const targetIdx =
      direction === 'next'
        ? Math.min(filteredVideos.length - 1, activeIndex + 1)
        : Math.max(0, activeIndex - 1);
    if (targetIdx !== activeIndex) {
      selectLesson(filteredVideos[targetIdx].id);
    }
  };

  const handleToggleWatched = async (lessonId: string, forceState?: boolean) => {
    const currentlyWatched = progress.watchedLessonIds.includes(lessonId);
    const nextWatched = forceState !== undefined ? forceState : !currentlyWatched;
    const updated = await updatePedagogicalUserProgress({
      userId,
      lessonId,
      watched: nextWatched,
      lastLessonId: lessonId,
    });
    setProgress(updated);
  };

  const handleCompleteAndAdvance = async () => {
    if (!activeLesson) return;
    await handleToggleWatched(activeLesson.id, true);
    if (activeIndex < filteredVideos.length - 1) {
      selectLesson(filteredVideos[activeIndex + 1].id);
    }
  };

  const handleVideoEnded = () => {
    if (activeLesson && !progress.watchedLessonIds.includes(activeLesson.id)) {
      handleToggleWatched(activeLesson.id, true).catch(() => {});
    }
  };

  // --- Admin Modal Handlers ---
  const resetModalState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setModalMode(null);
    setEditingLesson(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Émotion & Connexion');
    setFormOrder(videos.length + 1);
    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectedDuration(undefined);
    setUploadProgressPct(0);
    setIsSubmitting(false);
    setFormError(null);
  };

  const openAddModal = () => {
    if (!isAdmin) return;
    resetModalState();
    setFormOrder(videos.length + 1);
    setModalMode('add');
  };

  const openEditModal = (lesson: PedagogicalVideoLesson) => {
    if (!isAdmin) return;
    resetModalState();
    setEditingLesson(lesson);
    setFormTitle(lesson.title);
    setFormDescription(lesson.description);
    setFormCategory(lesson.category);
    setFormOrder(lesson.order);
    setDetectedDuration(lesson.durationSeconds);
    setModalMode('edit');
  };

  const handleFileChosen = (file: File | null) => {
    setFormError(null);
    if (!file) return;
    const check = validatePedagogicalVideoFile({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!check.valid) {
      setFormError(check.error || 'Fichier vidéo invalide.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!formTitle.trim()) {
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      if (baseName.length >= 2) setFormTitle(baseName);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentUser) return;

    setFormError(null);
    const metaCheck = validatePedagogicalVideoMetadata({
      title: formTitle,
      description: formDescription,
      category: formCategory,
      order: formOrder,
    });
    if (!metaCheck.valid) {
      setFormError(metaCheck.error || 'Champs invalides.');
      return;
    }

    if (modalMode === 'add' && !selectedFile) {
      setFormError('Veuillez sélectionner un fichier vidéo (MP4 recommandé) avant de valider.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgressPct(0);

    try {
      if (modalMode === 'add' && selectedFile) {
        const created = await uploadPedagogicalVideo({
          user: currentUser,
          file: selectedFile,
          title: metaCheck.cleaned.title,
          description: metaCheck.cleaned.description,
          category: metaCheck.cleaned.category,
          order: metaCheck.cleaned.order,
          durationSeconds: detectedDuration,
          onProgress: (pct) => setUploadProgressPct(pct),
        });
        const nextList = sortPedagogicalVideos([...videos, created]);
        setVideos(nextList);
        setSelectedCategory('Toutes');
        setActiveLessonId(created.id);
        resetModalState();
      } else if (modalMode === 'edit' && editingLesson) {
        let updatedLesson = await updatePedagogicalVideoMetadata({
          user: currentUser,
          id: editingLesson.id,
          title: metaCheck.cleaned.title,
          description: metaCheck.cleaned.description,
          category: metaCheck.cleaned.category,
          order: metaCheck.cleaned.order,
        });

        if (selectedFile) {
          updatedLesson = await replacePedagogicalVideoFile({
            user: currentUser,
            id: editingLesson.id,
            file: selectedFile,
            durationSeconds: detectedDuration,
            onProgress: (pct) => setUploadProgressPct(pct),
          });
        }

        const nextList = sortPedagogicalVideos(
          videos.map((v) => (v.id === updatedLesson.id ? updatedLesson : v))
        );
        setVideos(nextList);
        setActiveLessonId(updatedLesson.id);
        resetModalState();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Une erreur est survenue lors de l’enregistrement.');
      setIsSubmitting(false);
    }
  };

  const handleQuickReorder = async (lesson: PedagogicalVideoLesson, delta: -1 | 1) => {
    if (!isAdmin || !currentUser) return;
    const sorted = sortPedagogicalVideos(videos);
    const idx = sorted.findIndex((v) => v.id === lesson.id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const currentItem = sorted[idx];
    const targetItem = sorted[swapIdx];

    const currentOrder = idx + 1;
    const targetOrder = swapIdx + 1;

    try {
      const [u1, u2] = await Promise.all([
        updatePedagogicalVideoMetadata({
          user: currentUser,
          id: currentItem.id,
          title: currentItem.title,
          description: currentItem.description,
          category: currentItem.category,
          order: targetOrder,
        }),
        updatePedagogicalVideoMetadata({
          user: currentUser,
          id: targetItem.id,
          title: targetItem.title,
          description: targetItem.description,
          category: targetItem.category,
          order: currentOrder,
        }),
      ]);
      setVideos(
        sortPedagogicalVideos(
          sorted.map((v) => (v.id === u1.id ? u1 : v.id === u2.id ? u2 : v))
        )
      );
    } catch (err: any) {
      setVideosError(err?.message || 'Impossible de réordonner les vidéos.');
    }
  };

  const confirmDeleteLesson = async () => {
    if (!isAdmin || !currentUser || !lessonToDelete) return;
    setIsDeleting(true);
    try {
      await deletePedagogicalVideo({ user: currentUser, id: lessonToDelete.id });
      const remaining = sortPedagogicalVideos(
        videos.filter((v) => v.id !== lessonToDelete.id)
      );
      setVideos(remaining);
      if (activeLessonId === lessonToDelete.id) {
        setActiveLessonId(remaining[0]?.id || null);
      }
      setLessonToDelete(null);
    } catch (err: any) {
      setVideosError(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPrinciple = (card: InternetPrincipleCard) => {
    setSelectedPrinciple(card);
    if (!exploredIds.includes(card.id)) {
      const updated = [...exploredIds, card.id];
      setExploredIds(updated);
      try {
        localStorage.setItem(`tiktok_explored_principles_${userId}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const activeCategoriesInUse = useMemo(() => {
    const present = new Set(videos.map((v) => v.category));
    return PEDAGOGICAL_VIDEO_CATEGORIES.filter((cat) => present.has(cat));
  }, [videos]);

  const pageRef = useRef<HTMLDivElement | null>(null);
  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="relative min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-grid" />
      </div>
      <ScrollProgress />
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Re-build</span>
            </button>
            <div className="hidden sm:block h-4 w-px bg-zinc-800" />
            <span className="text-xs font-semibold tracking-[0.14em] uppercase text-amber-400">
              Étape 2 &middot; Parcours Vidéo
            </span>
          </div>

          <div className="flex items-center gap-3">
            {videos.length > 0 && (
              <div className="hidden md:flex items-center gap-3 text-xs text-zinc-400 pr-2">
                <span className="font-mono text-zinc-200 font-semibold">
                  {watchedCount}/{videos.length}
                </span>
                <span>comprises</span>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                    style={{ width: `${videoProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                data-testid="admin-add-video-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une vidéo</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition cursor-pointer"
            >
              <span>Mon Coach</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Intro */}
        <section className="max-w-3xl space-y-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
            Apprendre en format court &amp; vertical
          </div>
          <h1 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.12]">
            Comprendre ce qui retient vraiment l’attention humaine.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
            Les explications exclusivement théoriques laissent la place à un véritable parcours de
            leçons vidéo courtes. Regardez chaque séquence dans l’ordre prévu, observez les
            détails de rythme et de cadrage, puis validez votre progression étape par étape.
          </p>
        </section>

        {videosError && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center justify-between gap-3">
            <span>{videosError}</span>
            <button
              type="button"
              onClick={() => setVideosError(null)}
              className="text-red-300 hover:text-white cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Primary Vertical Video Learning Journey */}
        <section className="space-y-6">
          {/* Functional Category Filter Tabs */}
          {videos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Toutes')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === 'Toutes'
                      ? 'bg-white text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  Toutes les leçons ({videos.length})
                </button>
                {activeCategoriesInUse.map((cat) => {
                  const count = videos.filter((v) => v.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="md:hidden text-xs font-mono text-zinc-400">
                Progression : {watchedCount}/{videos.length} ({videoProgressPct}%)
              </div>
            </div>
          )}

          {isLoadingVideos ? (
            <div className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/40 p-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Chargement du parcours vidéo...</p>
            </div>
          ) : videos.length === 0 ? (
            /* Empty state before first video upload */
            <div className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-12 grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 flex justify-center">
                <div className="w-56 aspect-[9/16] rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                    <Film className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-zinc-300">
                    Format vertical 9:16 prêt
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Lecteur natif fluide, lecture sur mobile &amp; desktop, progression par leçon.
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">
                  Parcours vidéo en attente de publication
                </div>
                <h2 className="font-['Fraunces',Georgia,serif] text-2xl sm:text-3xl font-semibold text-white">
                  {isAdmin
                    ? 'Importez votre première vidéo pédagogique'
                    : 'Les leçons vidéo seront bientôt disponibles'}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {isAdmin
                    ? 'Importez directement les vidéos réalisées à l’extérieur (OpenHiggsfield ou montage studio) au format MP4, classez-les par ordre et thématique, et construisez votre formation verticale.'
                    : 'L’administrateur prépare actuellement les séquences vidéo de cette étape. En attendant, vous pouvez consulter les 10 repères écrits fondamentaux juste en dessous.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Ajouter une vidéo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowWrittenPrinciples(true);
                      document
                        .getElementById('written-principles-section')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Explorer les 10 principes fondamentaux</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeLesson ? (
            /* Vertical Short-Video Feed Experience */
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left: Vertical 9:16 Video Player Stage */}
              <div className="lg:col-span-5 flex flex-col items-center space-y-4">
                <div className="w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl relative flex items-center justify-center">
                  <video
                    ref={videoElementRef}
                    key={activeLesson.videoUrl}
                    src={activeLesson.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain bg-black"
                  />
                </div>

                {/* Vertical Step Navigation Controls */}
                <div className="w-full max-w-[360px] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={activeIndex <= 0}
                    onClick={() => handleStepLesson('prev')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Précédente</span>
                  </button>

                  <span className="px-3 text-xs font-mono text-zinc-400">
                    {activeIndex + 1} / {filteredVideos.length}
                  </span>

                  <button
                    type="button"
                    disabled={activeIndex >= filteredVideos.length - 1}
                    onClick={() => handleStepLesson('next')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <span>Suivante</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right: Lesson Metadata, Personal Progress, Admin Tools & Vertical Playlist */}
              <div className="lg:col-span-7 space-y-6">
                {/* Active Lesson Detail Card */}
                <div className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-bold text-amber-400">
                        Leçon {String(activeLesson.order).padStart(2, '0')}
                      </span>
                      <span className="text-zinc-600">/</span>
                      <span className="font-semibold text-zinc-300">{activeLesson.category}</span>
                      <span className="text-zinc-600">&middot;</span>
                      <span className="font-mono text-zinc-400">
                        {formatVideoDuration(activeLesson.durationSeconds)}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(activeLesson)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLessonToDelete(activeLesson)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800/50 text-xs font-semibold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h2 className="font-['Fraunces',Georgia,serif] text-2xl sm:text-3xl font-semibold text-white leading-snug">
                      {activeLesson.title}
                    </h2>
                    {activeLesson.description ? (
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                        {activeLesson.description}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">
                        Regardez attentivement cette séquence en observant le rythme, le son et la
                        structure d’ouverture.
                      </p>
                    )}
                  </div>

                  {/* Per-User Action Bar */}
                  <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleWatched(activeLesson.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        progress.watchedLessonIds.includes(activeLesson.id)
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {progress.watchedLessonIds.includes(activeLesson.id)
                          ? 'Leçon comprise'
                          : 'Marquer comme comprise'}
                      </span>
                    </button>

                    {activeIndex < filteredVideos.length - 1 && (
                      <button
                        type="button"
                        onClick={handleCompleteAndAdvance}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition cursor-pointer"
                      >
                        <span>Valider &amp; passer à la suivante</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ordered Vertical Lesson Sequence */}
                <div className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Suite du parcours ({filteredVideos.length} séquence
                      {filteredVideos.length > 1 ? 's' : ''})
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Ordre d’apprentissage
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-800/70 max-h-[380px] overflow-y-auto">
                    {filteredVideos.map((lesson, idx) => {
                      const isCurrent = lesson.id === activeLesson.id;
                      const isWatched = progress.watchedLessonIds.includes(lesson.id);

                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 flex items-center justify-between gap-3 transition ${
                            isCurrent ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectLesson(lesson.id)}
                            className="flex-1 flex items-start gap-3.5 text-left cursor-pointer min-w-0"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                                isCurrent
                                  ? 'bg-amber-500 text-zinc-950'
                                  : isWatched
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {isWatched && !isCurrent ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isCurrent ? (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                String(lesson.order).padStart(2, '0')
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-semibold text-white truncate">
                                {lesson.title}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                                <span>{lesson.category}</span>
                                <span>&middot;</span>
                                <span className="font-mono">
                                  {formatVideoDuration(lesson.durationSeconds)}
                                </span>
                                {isWatched && (
                                  <>
                                    <span>&middot;</span>
                                    <span className="text-emerald-400 font-medium">Comprise</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>

                          {isAdmin && selectedCategory === 'Toutes' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleQuickReorder(lesson, -1)}
                                title="Monter dans l’ordre"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === filteredVideos.length - 1}
                                onClick={() => handleQuickReorder(lesson, 1)}
                                title="Descendre dans l’ordre"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(lesson)}
                                title="Modifier cette leçon"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Progressive Written Foundations (Preserved Intact & Collapsible) */}
        <section id="written-principles-section" className="pt-8 border-t border-zinc-800/80 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Repères écrits complémentaires
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
                Les 10 mécaniques fondamentales d’Internet
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowWrittenPrinciples((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
            >
              <span>
                {showWrittenPrinciples
                  ? 'Réduire les fiches écrites'
                  : `Afficher les 10 fiches (${exploredIds.length}/10 lues)`}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showWrittenPrinciples ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showWrittenPrinciples && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTERNET_PRINCIPLES.map((card) => {
                const isExplored = exploredIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleOpenPrinciple(card)}
                    className="group text-left rounded-2xl p-5 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-amber-400 font-semibold">
                          {card.number} &middot; {card.category}
                        </span>
                        {isExplored && (
                          <span className="text-emerald-400 font-sans font-semibold">Lu</span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition">
                        {card.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {card.shortExplanation}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 pt-2 border-t border-zinc-800/80">
                      <span>Approfondir</span>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Step CTA */}
        <section className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="text-xs font-semibold text-amber-400">Étape suivante du studio</div>
            <h3 className="font-['Fraunces',Georgia,serif] text-xl sm:text-2xl font-semibold text-white">
              Appliquer ces principes sur vos propres vidéos
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Passez maintenant à Mon Coach TikTok pour analyser vos vraies statistiques, comparer
              vos vidéos et construire votre stratégie éditoriale.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateNext}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-sm font-bold transition cursor-pointer shrink-0"
          >
            <span>Accéder à Mon Coach</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* Admin Add / Edit Video Modal */}
      {isAdmin && modalMode && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !isSubmitting && resetModalState()}
        >
          <div
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {modalMode === 'add'
                    ? 'Ajouter une vidéo pédagogique (Étape 2)'
                    : 'Modifier la leçon vidéo'}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={resetModalState}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/70 text-red-200 text-xs">
                  {formError}
                </div>
              )}

              {/* Video File Picker + Live Preview */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  {modalMode === 'add'
                    ? 'Fichier vidéo (MP4 prioritaire, MOV, WebM — max 250 Mo) *'
                    : 'Remplacer le fichier vidéo (optionnel)'}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v"
                  onChange={(e) => handleFileChosen(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <div
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isSubmitting) {
                      handleFileChosen(e.dataTransfer.files?.[0] || null);
                    }
                  }}
                  className="rounded-xl border border-dashed border-zinc-700 hover:border-amber-500/70 bg-zinc-900/50 p-4 text-center cursor-pointer transition space-y-2"
                >
                  <Upload className="w-5 h-5 text-amber-400 mx-auto" />
                  {selectedFile ? (
                    <div className="text-xs text-zinc-200 font-medium">
                      {selectedFile.name} &middot;{' '}
                      <span className="font-mono text-zinc-400">
                        {formatFileSize(selectedFile.size)}
                      </span>
                      {detectedDuration ? (
                        <span className="font-mono text-amber-400">
                          {' '}
                          &middot; {formatVideoDuration(detectedDuration)}
                        </span>
                      ) : null}
                    </div>
                  ) : modalMode === 'edit' && editingLesson ? (
                    <div className="text-xs text-zinc-400">
                      Vidéo actuelle : <span className="text-zinc-200">{editingLesson.fileName}</span>{' '}
                      ({formatFileSize(editingLesson.fileSize)}). Cliquez pour remplacer.
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400">
                      Glissez votre vidéo ici ou cliquez pour parcourir votre appareil
                    </div>
                  )}
                </div>

                {/* Live Preview before saving */}
                {(previewUrl || (modalMode === 'edit' && editingLesson?.videoUrl)) && (
                  <div className="flex justify-center pt-1">
                    <div className="w-44 aspect-[9/16] rounded-xl overflow-hidden bg-black border border-zinc-800">
                      <video
                        key={previewUrl || editingLesson?.videoUrl}
                        src={previewUrl || editingLesson?.videoUrl}
                        controls
                        playsInline
                        onLoadedMetadata={(e) => {
                          const dur = (e.currentTarget as HTMLVideoElement).duration;
                          if (Number.isFinite(dur) && dur > 0) {
                            setDetectedDuration(Math.round(dur));
                          }
                        }}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Titre de la leçon *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex : Pourquoi la musique change tout dès la 1ère seconde"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Ordre d’affichage
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={formOrder}
                    onChange={(e) => setFormOrder(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-sm font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Catégorie</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as PedagogicalVideoCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-sm text-white focus:outline-none"
                >
                  {PEDAGOGICAL_VIDEO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Description / Ce qu’il faut observer
                </label>
                <textarea
                  rows={4}
                  maxLength={1200}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Expliquez en quelques lignes l'intention émotionnelle, le choix musical ou le mécanisme à observer dans cette séquence..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-sm text-white focus:outline-none leading-relaxed"
                />
              </div>

              {isSubmitting && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Import et sauvegarde en cours...</span>
                    <span className="font-mono text-amber-400">{uploadProgressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-150"
                      style={{ width: `${uploadProgressPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={resetModalState}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Enregistrement...'
                    : modalMode === 'add'
                    ? 'Publier dans l’Étape 2'
                    : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {isAdmin && lessonToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isDeleting && setLessonToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">Supprimer cette vidéo pédagogique ?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              La leçon <strong className="text-zinc-200">« {lessonToDelete.title} »</strong> et son
              fichier vidéo seront définitivement supprimés du parcours Étape 2 pour tous les
              utilisateurs.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setLessonToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteLesson}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep-Dive Modal for Written Principles (Preserved) */}
      {selectedPrinciple && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPrinciple(null)}
        >
          <div
            className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 sm:p-8 border-b border-zinc-800 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-mono font-semibold text-amber-400">
                  Principe {selectedPrinciple.number} &middot; {selectedPrinciple.category}
                </div>
                <h2 className="font-['Fraunces',Georgia,serif] text-2xl sm:text-3xl font-semibold text-white">
                  {selectedPrinciple.title}
                </h2>
                <p className="text-xs text-zinc-400">{selectedPrinciple.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrinciple(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto text-sm text-zinc-300">
              <p className="leading-relaxed">{selectedPrinciple.shortExplanation}</p>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Cas concret
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  {selectedPrinciple.concreteExample}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Faits documentés</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-400">
                    {selectedPrinciple.deepDive.documentedFacts.map((f, i) => (
                      <li key={i}>&bull; {f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Observations pratiques</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-400">
                    {selectedPrinciple.deepDive.practicalObservations.map((o, i) => (
                      <li key={i}>&bull; {o}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Vérification avant publication</span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {selectedPrinciple.deepDive.creatorChecklist.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPrinciple(null)}
                className="px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold cursor-pointer"
              >
                Compris, fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
