import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  Calendar,
  Clock,
  RefreshCw,
  Check,
  CheckCircle2,
  Trash2,
  Edit3,
  Film,
  Zap,
  Tag,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Play,
  RotateCcw,
  Plus,
  X,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ContentItem, VideoAnalysis, CaptionVariant, UserProfile } from '../types';
import { processVideoFile, validateVideoFile } from '../utils/videoProcessor';
import {
  uploadVideoFile,
  verifyVideoPersistence,
  saveUserPublication,
  deleteUserPublication,
} from '../services/firebase';
import { getVideoBlob, checkDuplicateVideo } from '../services/db';
import { TikTokPreviewEmulator } from './TikTokPreviewEmulator';

interface ContentCreatorAgentProps {
  items: ContentItem[];
  currentUser: UserProfile;
  initialItemToEdit?: ContentItem | null;
  onClearInitialItemToEdit?: () => void;
  onRefresh: () => void;
  onOpenItem?: (item: ContentItem) => void;
}

export const ContentCreatorAgent: React.FC<ContentCreatorAgentProps> = ({
  items,
  currentUser,
  initialItemToEdit,
  onClearInitialItemToEdit,
  onRefresh,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ContentItem> | null>(null);
  const [temporaryVideoUrl, setTemporaryVideoUrl] = useState<string | null>(null);

  // AI Regeneration State
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [variants, setVariants] = useState<CaptionVariant[]>([]);
  const [selectedTone, setSelectedTone] = useState<string>('Percutant & Viral');
  const [customToneNotes, setCustomToneNotes] = useState<string>('');

  // AI Extra Hashtags Generation State
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [suggestedTagsList, setSuggestedTagsList] = useState<{
    trendingTags: string[];
    nicheTags: string[];
    communityTags: string[];
    allCombined: string[];
  } | null>(null);

  // Retrying AI analysis on a saved item
  const [isAnalyzingExisting, setIsAnalyzingExisting] = useState(false);

  // New hashtag input
  const [newTagInput, setNewTagInput] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Active view tab for content items
  const [viewTab, setViewTab] = useState<'queue' | 'history' | 'drafts'>('queue');

  // Interactive Calendar Picker State (Inside Modal)
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to initialItemToEdit when opened from Calendar / Dashboard / Library
  useEffect(() => {
    if (initialItemToEdit) {
      handleEditItem(initialItemToEdit);
      if (onClearInitialItemToEdit) {
        onClearInitialItemToEdit();
      }
    }
  }, [initialItemToEdit]);

  /**
   * =========================================================================
   * SYSTÈME D'IMPORTATION VIDÉO ORIGINAL — NON MODIFIÉ (RÈGLE ABSOLUE)
   * =========================================================================
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation
    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Fichier vidéo non valide.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check duplicate
    const dup = await checkDuplicateVideo(file.name, currentUser.uid, file.size);
    if (dup.isDuplicate) {
      const confirmUpload = window.confirm(
        `Une vidéo portant le nom "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} Mo) existe déjà dans votre bibliothèque. Voulez-vous continuer ?`
      );
      if (!confirmUpload) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(5);
    setCurrentStepText('Préparation du fichier et validation iPhone/Photos...');

    const newVideoId = 'vid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    try {
      // 2. Upload directly to persistent Storage (Firebase Storage or IndexedDB)
      setCurrentStepText('Envoi direct vers le stockage cloud persistant...');
      const uploadResult = await uploadVideoFile(
        currentUser.uid,
        file,
        newVideoId,
        (percent) => {
          setUploadProgress(percent);
        }
      );

      // 3. Verify storage persistence
      setCurrentStepText('Vérification d’intégrité du fichier dans le stockage...');
      const isVerified = await verifyVideoPersistence(
        currentUser.uid,
        newVideoId,
        uploadResult.storageStatus
      );

      if (!isVerified) {
        throw new Error("Échec de la vérification : le fichier n'a pas pu être validé dans le stockage.");
      }

      // Default scheduled time: tomorrow at 18:30
      const tomorrow = new Date(Date.now() + 86400000);
      const defaultDate = tomorrow.toISOString().split('T')[0];

      // 4. Save video in database immediately — VIDEO IS NOW 100% SECURED
      setCurrentStepText('Enregistrement des métadonnées de la vidéo...');
      const baseItem: ContentItem = {
        id: newVideoId,
        userId: currentUser.uid,
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoFileName: file.name,
        thumbnailUrl: '',
        videoUrl: uploadResult.downloadUrl,
        storagePath: uploadResult.storagePath,
        storageStatus: uploadResult.storageStatus,
        fileSize: file.size,
        hasGeminiAnalysis: false,
        caption: `Nouvelle vidéo TikTok : ${file.name.replace(/\.[^/.]+$/, '')} !\n\nDonnez votre avis en commentaire`,
        hashtags: ['#PourToi', '#TikTokFrance', '#CreationDeContenu'],
        scheduledDate: defaultDate,
        scheduledTime: '18:30',
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      await saveUserPublication(currentUser.uid, baseItem);
      onRefresh();

      // Open publication preparation window automatically after import (Feature 1.A)
      setEditingItem(baseItem);
      setTemporaryVideoUrl(uploadResult.downloadUrl);
      setIsEditorOpen(true);

      // Set calendar view date
      setCalendarViewDate(new Date(tomorrow));

      // 5. Run Gemini AI analysis independently in background
      setCurrentStepText('Extraction des images clés pour l’analyse IA...');
      runGeminiAnalysisOnItem(baseItem, file);

    } catch (err: any) {
      console.error('Import error:', err);
      setUploadError(err?.message || "Une erreur est survenue lors de l'importation de la vidéo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentStepText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Run Gemini AI analysis on a saved item without risking the video's persistence
   */
  const runGeminiAnalysisOnItem = async (item: ContentItem, existingFile?: File) => {
    setIsAnalyzingExisting(true);
    try {
      let fileToProcess = existingFile;
      if (!fileToProcess) {
        const blob = await getVideoBlob(item.id);
        if (blob) {
          fileToProcess = new File([blob], item.videoFileName, { type: blob.type });
        }
      }

      if (!fileToProcess) {
        throw new Error('Fichier vidéo indisponible pour l’analyse image.');
      }

      // Safe extraction with iOS WebKit safeguards
      const extracted = await processVideoFile(fileToProcess);

      // Call server Gemini endpoint
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: extracted.frames,
          fileName: item.videoFileName,
          duration: extracted.duration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Échec de l'analyse IA de la vidéo.");
      }

      const { analysis }: { analysis: VideoAnalysis } = await response.json();

      // Update saved item with full Gemini analysis
      const updatedItem: ContentItem = {
        ...item,
        title: analysis.title || item.title,
        thumbnailUrl: extracted.thumbnailUrl || item.thumbnailUrl,
        duration: Math.round(extracted.duration),
        hasGeminiAnalysis: true,
        analysis,
        analysisError: undefined,
        caption: analysis.caption || item.caption,
        hashtags: analysis.hashtags || item.hashtags,
      };

      await saveUserPublication(currentUser.uid, updatedItem);
      onRefresh();

      // If editor is currently open with this item, update with AI suggestions without erasing user edits
      setEditingItem((prev) => {
        if (!prev || prev.id !== item.id) return prev;
        return {
          ...prev,
          analysis,
          hasGeminiAnalysis: true,
          thumbnailUrl: extracted.thumbnailUrl || prev.thumbnailUrl,
          duration: Math.round(extracted.duration),
          // Only populate caption if user hasn't typed a custom one yet
          caption: prev.caption && prev.caption !== item.caption ? prev.caption : (analysis.caption || prev.caption),
          hashtags: prev.hashtags && prev.hashtags.length > 0 ? prev.hashtags : (analysis.hashtags || prev.hashtags),
        };
      });

    } catch (err: any) {
      console.warn('Gemini analysis error (video remains saved safely):', err);
      const failedItem: ContentItem = {
        ...item,
        hasGeminiAnalysis: false,
        analysisError: err?.message || 'Erreur temporaire de l’analyse IA.',
      };
      await saveUserPublication(currentUser.uid, failedItem);
      onRefresh();
      setEditingItem((prev) => (prev?.id === item.id ? failedItem : prev));
    } finally {
      setIsAnalyzingExisting(false);
    }
  };

  const handleGenerateExtraHashtags = async () => {
    if (!editingItem) return;
    setIsGeneratingTags(true);
    try {
      const res = await fetch('/api/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingItem.title,
          subject: editingItem.analysis?.subject,
          caption: editingItem.caption,
        }),
      });
      if (!res.ok) throw new Error('Erreur de génération');
      const data = await res.json();
      if (data.tags) {
        setSuggestedTagsList(data.tags);
      }
    } catch (e: any) {
      console.error(e);
      alert("Impossible de générer d'autres hashtags pour le moment.");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Open existing item in editor with persistent blob reload
  const handleEditItem = async (item: ContentItem) => {
    setEditingItem({ ...item });
    setVariants([]);

    if (item.scheduledDate) {
      setCalendarViewDate(new Date(item.scheduledDate));
    }

    if (item.videoUrl) {
      setTemporaryVideoUrl(item.videoUrl);
    } else {
      const blob = await getVideoBlob(item.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setTemporaryVideoUrl(url);
      } else {
        setTemporaryVideoUrl(null);
      }
    }

    setIsEditorOpen(true);
  };

  // Save changes (brouillon ou programmation)
  const handleSaveItem = async (status: 'draft' | 'scheduled' | 'published') => {
    if (!editingItem || !editingItem.title) return;

    const itemToSave: ContentItem = {
      id: editingItem.id || 'vid_' + Date.now(),
      userId: currentUser.uid,
      title: editingItem.title,
      videoFileName: editingItem.videoFileName || 'video.mp4',
      thumbnailUrl: editingItem.thumbnailUrl,
      videoUrl: temporaryVideoUrl || editingItem.videoUrl,
      storagePath: editingItem.storagePath,
      storageStatus: editingItem.storageStatus || 'local_persistent',
      duration: editingItem.duration,
      fileSize: editingItem.fileSize,
      hasGeminiAnalysis: Boolean(editingItem.hasGeminiAnalysis),
      analysis: editingItem.analysis,
      caption: editingItem.caption || '',
      hashtags: editingItem.hashtags || [],
      scheduledDate: editingItem.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: editingItem.scheduledTime || '18:30',
      status,
      createdAt: editingItem.createdAt || new Date().toISOString(),
      publishedAt: status === 'published' ? new Date().toISOString() : editingItem.publishedAt,
      notes: editingItem.notes,
    };

    await saveUserPublication(currentUser.uid, itemToSave);

    if (status === 'published' || status === 'scheduled') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    setIsEditorOpen(false);
    setEditingItem(null);
    onRefresh();
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette vidéo et ses métadonnées ?')) {
      await deleteUserPublication(currentUser.uid, id);
      setIsEditorOpen(false);
      setEditingItem(null);
      onRefresh();
    }
  };

  // AI Caption Regeneration
  const handleRegenerateCaption = async () => {
    if (!editingItem) return;
    setIsRegenerating(true);

    try {
      const response = await fetch('/api/regenerate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTitle: editingItem.title,
          currentSubject: editingItem.analysis?.subject,
          tone: selectedTone,
          customInstructions: customToneNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la régénération IA');
      }

      const data = await response.json();
      if (data.variants && data.variants.length > 0) {
        setVariants(data.variants);
      }
    } catch (err: any) {
      alert(err.message || 'Impossible de régénérer la légende.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const applyVariant = (variant: CaptionVariant) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      caption: variant.caption,
      hashtags: variant.hashtags,
    });
  };

  const handleAddHashtag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTagInput.trim() || !editingItem) return;

    let tag = newTagInput.trim();
    if (!tag.startsWith('#')) tag = '#' + tag;

    const currentTags = editingItem.hashtags || [];
    if (!currentTags.includes(tag)) {
      setEditingItem({
        ...editingItem,
        hashtags: [...currentTags, tag],
      });
    }
    setNewTagInput('');
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      hashtags: (editingItem.hashtags || []).filter((t) => t !== tagToRemove),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Filter items
  const scheduledQueue = items.filter((i) => i.status === 'scheduled');
  const publishedHistory = items.filter((i) => i.status === 'published');
  const draftsList = items.filter((i) => i.status === 'draft');

  const displayedList =
    viewTab === 'queue' ? scheduledQueue : viewTab === 'history' ? publishedHistory : draftsList;

  // Calendar helpers for interactive month/day selector
  const calYear = calendarViewDate.getFullYear();
  const calMonth = calendarViewDate.getMonth();
  const monthNamesFr = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevCalMonth = () => {
    setCalendarViewDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextCalMonth = () => {
    setCalendarViewDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleSelectCalendarDay = (day: number) => {
    if (!editingItem) return;
    const mStr = String(calMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${calYear}-${mStr}-${dStr}`;
    setEditingItem({
      ...editingItem,
      scheduledDate: fullDate,
    });
  };

  const currentSelectedTime = editingItem?.scheduledTime || '18:30';
  const currentHour = currentSelectedTime.split(':')[0] || '18';
  const currentMinute = currentSelectedTime.split(':')[1] || '30';

  const handleHourChange = (newHour: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      scheduledTime: `${newHour.padStart(2, '0')}:${currentMinute}`,
    });
  };

  const handleMinuteChange = (newMinute: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      scheduledTime: `${currentHour}:${newMinute.padStart(2, '0')}`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Agent 1 Header banner */}
      <div className="surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Agent 1 &bull; Content Creator
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 tracking-tight">
            Création & Analyse de Contenu
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed">
            Importez vos vidéos depuis votre appareil : le fichier original est d’abord sauvegardé dans votre espace sécurisé, puis la fenêtre de préparation s'ouvre pour rédiger votre légende, ajuster vos hashtags et planifier la date exacte.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
            <span>{isUploading ? 'Transfert en cours...' : 'Importer une vidéo'}</span>
          </button>
        </div>
      </div>

      {/* Upload & Progress Card */}
      {isUploading && (
        <div className="bg-gradient-to-br from-rose-500/10 via-zinc-900 to-pink-500/10 rounded-3xl p-8 border border-rose-500/30 shadow-sm text-center max-w-xl mx-auto animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-zinc-50 mb-1">
            Sauvegarde du Fichier Original
          </h3>
          <p className="text-rose-400 font-medium text-sm mb-4">
            {currentStepText}
          </p>

          <div className="w-full bg-zinc-700 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-rose-500 to-pink-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 font-mono">
            <span>Transfert sécurisé</span>
            <span className="font-bold text-zinc-200">{uploadProgress}%</span>
          </div>

          <p className="text-xs text-zinc-400 mt-3 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vérification d’intégrité & persistance garantie</span>
          </p>
        </div>
      )}

      {/* Error Card */}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erreur d’importation</p>
            <p className="text-red-400 mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Tabs navigation for videos: Queue / History / Drafts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('queue')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              viewTab === 'queue'
                ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-none'
                : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/80'
            }`}
          >
            Publications programmées ({scheduledQueue.length})
          </button>
          <button
            onClick={() => setViewTab('drafts')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              viewTab === 'drafts'
                ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-none'
                : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/80'
            }`}
          >
            Brouillons ({draftsList.length})
          </button>
          <button
            onClick={() => setViewTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              viewTab === 'history'
                ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-none'
                : 'text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/80'
            }`}
          >
            Publications déjà effectuées ({publishedHistory.length})
          </button>
        </div>

        <span className="text-xs text-zinc-400 font-medium">
          {displayedList.length} vidéo{displayedList.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Video Grid / List */}
      {displayedList.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Film className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-zinc-100">
            {viewTab === 'queue'
              ? 'Aucune publication programmée pour le moment'
              : viewTab === 'history'
              ? 'Aucune publication dans l’historique pour le moment'
              : 'Aucun brouillon en attente'}
          </h4>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-1 mb-6">
            {viewTab === 'queue'
              ? 'Importez une vidéo depuis votre appareil pour préparer votre publication et choisir sa date de diffusion.'
              : 'Vos vidéos apparaîtront automatiquement dans cet espace personnel.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Importer votre première vidéo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedList.map((item) => (
            <div
              key={item.id}
              className="group bg-zinc-900/70 rounded-3xl border border-zinc-800 shadow-none hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail & Badges */}
                <div
                  className="relative aspect-[16/10] bg-zinc-950 overflow-hidden cursor-pointer"
                  onClick={() => handleEditItem(item)}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 gap-2">
                      <Film className="w-10 h-10" />
                      <span className="text-xs text-zinc-400 font-mono">Vidéo enregistrée</span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    {item.status === 'scheduled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 backdrop-blur-sm text-white">
                        <Clock className="w-3 h-3" />
                        {item.scheduledDate} à {item.scheduledTime}
                      </span>
                    )}
                    {item.status === 'published' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/90 backdrop-blur-sm text-white">
                        <Check className="w-3 h-3" />
                        Publié
                      </span>
                    )}
                    {item.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/90 backdrop-blur-sm text-white">
                        Brouillon
                      </span>
                    )}

                    {item.hasGeminiAnalysis && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/90 backdrop-blur-sm text-white">
                        <Sparkles className="w-2.5 h-2.5" />
                        Analyse IA prête
                      </span>
                    )}
                  </div>

                  {item.duration ? (
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[11px] font-mono">
                      {Math.floor(item.duration / 60)}:
                      {String(item.duration % 60).padStart(2, '0')}
                    </div>
                  ) : null}
                </div>

                {/* Content preview */}
                <div className="p-5">
                  <h3 className="font-bold text-zinc-50 line-clamp-1 text-base group-hover:text-rose-400 transition">
                    {item.title}
                  </h3>

                  <p className="text-zinc-300 text-xs mt-2 line-clamp-2 leading-relaxed">
                    {item.caption || 'Aucune légende enregistrée'}
                  </p>

                  {/* Tags */}
                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.hashtags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.hashtags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-400">
                          +{item.hashtags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3.5 bg-zinc-950/50 border-t border-zinc-800/70 flex items-center justify-between">
                <button
                  onClick={() => handleEditItem(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-200 hover:text-rose-400 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Préparer & Programmer</span>
                </button>

                <div className="flex items-center gap-1">
                  {!item.hasGeminiAnalysis && (
                    <button
                      onClick={() => runGeminiAnalysisOnItem(item)}
                      title="Lancer l'analyse IA Gemini"
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(`${item.caption}\n\n${item.hashtags?.join(' ')}`)}
                    title="Copier légende et hashtags"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Supprimer"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* FENÊTRE DE PRÉPARATION ET PROGRAMMATION DE PUBLICATION (1.A, 1.B, 1.C) */}
      {/* ===================================================================== */}
      {isEditorOpen && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-zinc-900/70 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-50 text-base sm:text-lg">
                    Préparation & Programmation de la Publication
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Aperçu vidéo, rédaction de votre légende, suggestions Gemini et choix libre de la date et de l'heure.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body: Two columns layout */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Video Preview & Gemini AI Suggestions */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Aperçu de la vidéo importée */}
                <div>
                  <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Aperçu de la vidéo importée</span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {editingItem.videoFileName}
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden bg-black shadow-md border border-zinc-800 aspect-[9/14] max-h-[380px] w-full mx-auto relative flex items-center justify-center">
                    {temporaryVideoUrl || editingItem.videoUrl ? (
                      <video
                        src={temporaryVideoUrl || editingItem.videoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : editingItem.thumbnailUrl ? (
                      <img
                        src={editingItem.thumbnailUrl}
                        alt="Aperçu"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-zinc-400 text-center p-4">
                        <Film className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <span className="text-xs font-medium">Aperçu en cours de chargement...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Proposition de légende générée par Gemini */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-zinc-900 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      Proposition de légende (Gemini)
                    </span>

                    {editingItem.analysis?.caption && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem({
                            ...editingItem,
                            caption: editingItem.analysis?.caption || '',
                          });
                        }}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Utiliser cette proposition
                      </button>
                    )}
                  </div>

                  {editingItem.analysis?.caption ? (
                    <div className="bg-zinc-900/70 p-3 rounded-xl border border-rose-500/30 text-xs text-zinc-200 leading-relaxed max-h-32 overflow-y-auto">
                      {editingItem.analysis.caption}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">
                      {isAnalyzingExisting
                        ? "Analyse Gemini en cours..."
                        : "Aucune proposition IA pour le moment. Cliquez sur Analyser ci-dessous."}
                    </p>
                  )}

                  {/* Bouton pour régénérer la légende */}
                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isRegenerating}
                      onClick={handleRegenerateCaption}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-900/70 hover:bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>{isRegenerating ? 'Régénération...' : 'Régénérer la légende avec l’IA'}</span>
                    </button>

                    {/* Tone selector */}
                    <div className="flex flex-wrap gap-1">
                      {['Percutant & Viral', 'Humour', 'Éducatif', 'Storytelling'].map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setSelectedTone(tone)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                            selectedTone === tone
                              ? 'bg-rose-600 text-white'
                              : 'bg-zinc-900/70 text-zinc-300 border border-zinc-800 hover:bg-zinc-800/60'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Suggestions de hashtags générées par Gemini & Bouton Régénérer */}
                <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                      <Tag className="w-3.5 h-3.5 text-zinc-300" />
                      Suggestions de hashtags (Gemini)
                    </span>

                    <button
                      type="button"
                      onClick={handleGenerateExtraHashtags}
                      disabled={isGeneratingTags}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingTags ? 'animate-spin' : ''}`} />
                      <span>Régénérer les hashtags</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Cliquez sur un hashtag suggéré pour l’ajouter librement à votre liste :
                  </p>

                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {(suggestedTagsList?.allCombined || editingItem.analysis?.hashtags || [
                      '#PourToi',
                      '#TikTokFrance',
                      '#CreationDeContenu',
                      '#Astuce',
                      '#Tendance',
                    ]).map((tag, idx) => {
                      const isAdded = (editingItem.hashtags || []).includes(tag);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!isAdded) {
                              setEditingItem({
                                ...editingItem,
                                hashtags: [...(editingItem.hashtags || []), tag],
                              });
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                            isAdded
                              ? 'bg-zinc-700 text-zinc-500 cursor-default'
                              : 'bg-zinc-900/70 hover:bg-rose-600 hover:text-white text-zinc-200 border border-zinc-800 shadow-2xs'
                          }`}
                        >
                          <span>{isAdded ? '✓' : '+'}</span>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Free Caption Writing, Hashtag Inputs & Full Interactive Calendar */}
              <div className="lg:col-span-7 space-y-6">
                {/* Project Title */}
                <div>
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                    Titre du projet / Vidéo
                  </label>
                  <input
                    type="text"
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 text-sm font-semibold text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                    placeholder="Titre de la vidéo..."
                  />
                </div>

                {/* 2. Champ pour écrire ma légende (Modifiable librement) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Ma Légende TikTok (Modifiable librement)
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {(editingItem.caption || '').length} caractères
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={editingItem.caption || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                    className="surface w-full p-4 text-sm leading-relaxed text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                    placeholder="Écrivez ou modifiez votre légende ici. L'IA ne vous impose aucun texte..."
                  />
                </div>

                {/* 3. Champ pour ajouter mes hashtags */}
                <div>
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                    Mes Hashtags ({editingItem.hashtags?.length || 0})
                  </label>

                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 min-h-[50px] items-center">
                    {(editingItem.hashtags || []).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900/70 border border-zinc-800 text-zinc-200 shadow-2xs group"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHashtag(tag)}
                          className="text-zinc-500 hover:text-red-400 transition cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}

                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={handleAddHashtag}
                        placeholder="+ Ajouter un tag (#...)"
                        className="text-xs bg-transparent border-none focus:outline-none text-zinc-200 w-36 px-1"
                      />
                      {newTagInput.trim() && (
                        <button
                          type="button"
                          onClick={handleAddHashtag}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold cursor-pointer"
                        >
                          Ajouter
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ================================================================= */}
                {/* 1.B VÉRITABLE CALENDRIER : JOUR, MOIS, ANNÉE, HEURE ET MINUTES    */}
                {/* ================================================================= */}
                <div className="bg-zinc-950/60 rounded-2xl p-5 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-100" />
                      <span className="text-xs font-bold text-zinc-50 uppercase tracking-wider">
                        Date & Heure de publication (Calendrier interactif)
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      {editingItem.scheduledDate || 'Date non choisie'} à {editingItem.scheduledTime || '18:30'}
                    </span>
                  </div>

                  {/* Interactive Month & Year Navigation */}
                  <div className="surface p-3 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70">
                      <button
                        type="button"
                        onClick={handlePrevCalMonth}
                        className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800/80 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="font-bold text-xs sm:text-sm text-zinc-50">
                        {monthNamesFr[calMonth]} {calYear}
                      </div>

                      <button
                        type="button"
                        onClick={handleNextCalMonth}
                        className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-800/80 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-500">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-7 w-full" />
                      ))}

                      {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const mStr = String(calMonth + 1).padStart(2, '0');
                        const dStr = String(dayNum).padStart(2, '0');
                        const checkDate = `${calYear}-${mStr}-${dStr}`;
                        const isSelected = editingItem.scheduledDate === checkDate;
                        const isToday =
                          new Date().toISOString().split('T')[0] === checkDate;

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => handleSelectCalendarDay(dayNum)}
                            className={`h-7 w-full rounded-lg font-semibold transition cursor-pointer flex items-center justify-center text-xs ${
                              isSelected
                                ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold shadow-none'
                                : isToday
                                ? 'bg-rose-500/15 text-rose-300 font-bold'
                                : 'text-zinc-200 hover:bg-zinc-800/80'
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time picker : Heure & Minutes */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Heure (00 - 23)</span>
                      </label>
                      <select
                        value={currentHour}
                        onChange={(e) => handleHourChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs font-bold text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/10 cursor-pointer"
                      >
                        {Array.from({ length: 24 }).map((_, h) => {
                          const val = String(h).padStart(2, '0');
                          return (
                            <option key={val} value={val}>
                              {val} h
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Minutes (00 - 59)</span>
                      </label>
                      <select
                        value={currentMinute}
                        onChange={(e) => handleMinuteChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs font-bold text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/10 cursor-pointer"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                          <option key={m} value={m}>
                            {m} min
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick scheduling presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-zinc-500 self-center mr-1">Raccourcis :</span>
                    {[
                      { label: 'Ce soir (18:30)', date: new Date().toISOString().split('T')[0], time: '18:30' },
                      {
                        label: 'Demain midi (12:30)',
                        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                        time: '12:30',
                      },
                      {
                        label: 'Demain soir (18:45)',
                        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                        time: '18:45',
                      },
                      {
                        label: 'Dans 2 jours (19:00)',
                        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                        time: '19:00',
                      },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setEditingItem({
                            ...editingItem,
                            scheduledDate: preset.date,
                            scheduledTime: preset.time,
                          });
                          setCalendarViewDate(new Date(preset.date));
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Transparency Notice */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Programmer cette publication l'enregistre dans votre <strong>Calendrier Unifié</strong> avec rappel. Cela ne déclenche pas une publication automatique sur TikTok sans approbation de l'API officielle TikTok.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer (1.C Enregistrer la publication) */}
            <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {editingItem.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(editingItem.id!)}
                    className="px-3.5 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveItem('draft')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800/80 text-zinc-200 font-bold text-xs sm:text-sm transition cursor-pointer shadow-2xs"
                >
                  Enregistrer en brouillon
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSaveItem('published')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Marquer comme déjà publiée
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveItem('scheduled')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Programmer la publication</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copied toast notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Copié dans le presse-papier !</span>
        </div>
      )}
    </div>
  );
};
