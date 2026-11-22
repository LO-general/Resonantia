import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  MoveRight,
  Info,
  CalendarCheck,
  ArrowUpRight,
  Film,
  Eye,
  TrendingUp,
  X,
  ArrowRight,
  Check,
  Edit2,
  Trash2,
  HelpCircle,
  ShieldCheck,
  Users,
  Compass,
} from 'lucide-react';
import { ContentItem, TikTokOfficialVideo } from '../types';
import {
  buildTemporalRecords,
  buildFilteredWeeklySchedule,
  WeeklyScheduleDay,
  IdentifiedScheduleSlot,
} from '../utils/temporalMetricsEngine';
import { getCurrentUser, saveUserPublication } from '../services/firebase';

interface WeeklyScheduleAgendaProps {
  contentItems: ContentItem[];
  officialVideos: TikTokOfficialVideo[];
  accountHandle?: string;
  onSelectSlotToSchedule?: (dateStr: string, timeStr: string, category?: string) => void;
  onNavigateTab?: (tab: any) => void;
  onRefreshData?: () => void;
}

export const WeeklyScheduleAgenda: React.FC<WeeklyScheduleAgendaProps> = ({
  contentItems,
  officialVideos,
  accountHandle,
  onSelectSlotToSchedule,
  onNavigateTab,
  onRefreshData,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [showMethodologyInfo, setShowMethodologyInfo] = useState<boolean>(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Scheduling Modal State
  const [schedulingSlot, setSchedulingSlot] = useState<{
    dateStr: string;
    dayName: string;
    dayFullDate: string;
    timeSlot: string;
    category?: string;
  } | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('new');
  const [newVideoTitle, setNewVideoTitle] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);

  // Move Video Modal State
  const [videoToMove, setVideoToMove] = useState<{
    video: {
      id: string;
      title: string;
      category?: string;
      scheduledTime: string;
    };
    currentDateStr: string;
    currentDayName: string;
  } | null>(null);
  const [targetMoveDateStr, setTargetMoveDateStr] = useState<string>('');
  const [targetMoveTimeStr, setTargetMoveTimeStr] = useState<string>('');

  // Slot Detail Modal State
  const [selectedSlotForDetails, setSelectedSlotForDetails] = useState<{
    day: WeeklyScheduleDay;
    slot: IdentifiedScheduleSlot;
  } | null>(null);

  // Compute temporal records and filtered schedule based on actual TikTok data
  const temporalRecords = buildTemporalRecords(officialVideos, contentItems);
  const scheduleData = buildFilteredWeeklySchedule(temporalRecords, contentItems, weekOffset);
  const {
    qualifiedDays,
    omittedDaysCount,
    omittedDayNames,
    totalIdentifiedSlots,
    totalScheduledVideos,
    totalPublishedVideos,
  } = scheduleData;

  // Compute label for the targeted week
  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7;
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() - currentDayIndex + weekOffset * 7);
  const endSunday = new Date(startMonday);
  endSunday.setDate(startMonday.getDate() + 6);

  const formatWeekDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const weekHeaderLabel =
    weekOffset === 0
      ? `Cette semaine (${formatWeekDate(startMonday)} — ${formatWeekDate(endSunday)})`
      : weekOffset === 1
      ? `Semaine prochaine (${formatWeekDate(startMonday)} — ${formatWeekDate(endSunday)})`
      : weekOffset === -1
      ? `Semaine précédente (${formatWeekDate(startMonday)} — ${formatWeekDate(endSunday)})`
      : `Semaine du ${formatWeekDate(startMonday)} au ${formatWeekDate(endSunday)}`;

  // Open schedule modal
  const handleOpenScheduleModal = (dateStr: string, dayName: string, dayFullDate: string, timeSlot: string, category?: string) => {
    setAgendaError(null);
    setSchedulingSlot({ dateStr, dayName, dayFullDate, timeSlot, category });
    setCustomTime(timeSlot);
    setSelectedDraftId('new');
    setNewVideoTitle('');
  };

  // Submit scheduling
  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingSlot) return;

    const user = getCurrentUser();
    if (!user?.uid) {
      setAgendaError('Session utilisateur requise pour enregistrer une programmation.');
      return;
    }

    setAgendaError(null);
    setIsSavingSchedule(true);
    try {
      if (selectedDraftId !== 'new') {
        const draft = contentItems.find((c) => c.id === selectedDraftId);
        if (draft) {
          const updated: ContentItem = {
            ...draft,
            status: 'scheduled',
            scheduledDate: schedulingSlot.dateStr,
            scheduledTime: customTime || schedulingSlot.timeSlot,
          };
          await saveUserPublication(user.uid, updated);
        }
      } else {
        const titleToUse = newVideoTitle.trim() || `Publication du ${schedulingSlot.dayName}`;
        const cleanCatTag = schedulingSlot.category
          ? `#${schedulingSlot.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`
          : '';
        const newItem: ContentItem = {
          id: `item_${Date.now()}`,
          userId: user.uid,
          title: titleToUse,
          caption: '',
          hashtags: cleanCatTag && cleanCatTag.length > 2 ? ['#tiktok', cleanCatTag] : ['#tiktok', '#creation'],
          videoFileName: 'publication.mp4',
          storageStatus: 'local_persistent',
          status: 'scheduled',
          hasGeminiAnalysis: false,
          scheduledDate: schedulingSlot.dateStr,
          scheduledTime: customTime || schedulingSlot.timeSlot,
          createdAt: new Date().toISOString(),
        };
        await saveUserPublication(user.uid, newItem);
      }

      if (onRefreshData) {
        onRefreshData();
      }
      setSchedulingSlot(null);
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setAgendaError('Impossible d’enregistrer la programmation.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Move video to another slot/date
  const handleConfirmMoveVideo = async () => {
    if (!videoToMove || !targetMoveDateStr) return;
    const user = getCurrentUser();
    if (!user?.uid) {
      setAgendaError('Session utilisateur requise pour déplacer une publication.');
      return;
    }

    const item = contentItems.find((c) => c.id === videoToMove.video.id);
    if (item) {
      const updated: ContentItem = {
        ...item,
        scheduledDate: targetMoveDateStr,
        scheduledTime: targetMoveTimeStr || item.scheduledTime || '18:00',
        status: 'scheduled',
      };
      await saveUserPublication(user.uid, updated);
      if (onRefreshData) onRefreshData();
    }
    setVideoToMove(null);
  };

  // Cancel scheduled publication via inline confirmation
  const handleCancelSchedule = async (videoId: string) => {
    const user = getCurrentUser();
    if (!user?.uid) {
      setAgendaError('Session utilisateur requise pour modifier une publication.');
      return;
    }

    const item = contentItems.find((c) => c.id === videoId);
    if (item) {
      const updated: ContentItem = {
        ...item,
        status: 'draft',
        scheduledDate: '',
        scheduledTime: '',
      };
      await saveUserPublication(user.uid, updated);
      setConfirmCancelId(null);
      if (onRefreshData) onRefreshData();
    }
  };

  const draftItems = contentItems.filter((c) => c.status === 'draft');

  return (
    <div className="space-y-8 text-white font-sans">
      {/* 1. MASTER AGENDA HEADER & WEEK SWITCHER */}
      <div className="surface relative p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Agenda Prédictif &middot; Filtrage Algorithmique Strict</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Agenda des Meilleurs Créneaux de Publication
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Cet agenda n'affiche <strong>que les jours pour lesquels un créneau à fort potentiel a été certifié par vos données réelles</strong>. Aucun jour n'est inventé pour remplir artificiellement la semaine : vous préservez ainsi la qualité de vos vidéos et l'attention de votre audience.
            </p>
          </div>

          {/* Week Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              disabled={weekOffset <= -2}
              className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer transition shadow-xs"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-bold min-w-[220px] text-center shadow-inner">
              {weekHeaderLabel}
            </div>

            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              disabled={weekOffset >= 4}
              className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer transition shadow-xs"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
              >
                Aujourd'hui
              </button>
            )}

            <button
              onClick={() => setShowMethodologyInfo(!showMethodologyInfo)}
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
              title="Comprendre le filtrage des jours"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Summary Status Bar */}
        {agendaError && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{agendaError}</span>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="tabular-nums">{qualifiedDays.length} jour{qualifiedDays.length > 1 ? 's' : ''} retenu{qualifiedDays.length > 1 ? 's' : ''}</span>
            </div>

            {omittedDaysCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                <span>
                  {omittedDaysCount} jour{omittedDaysCount > 1 ? 's' : ''} absent{omittedDaysCount > 1 ? 's' : ''} ({omittedDayNames.join(', ')}) &middot; Aucun créneau fiable identifié
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="tabular-nums">{totalScheduledVideos} planifiée{totalScheduledVideos > 1 ? 's' : ''}</span>
            </div>

            {totalPublishedVideos > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 font-bold">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span className="tabular-nums">{totalPublishedVideos} déjà publiée{totalPublishedVideos > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-400">
            Basé sur {temporalRecords.length} vidéo(s) réelle(s){accountHandle ? ` (@${accountHandle.replace('@', '')})` : ''}
          </div>
        </div>

        {/* Methodology Dropdown Banner */}
        {showMethodologyInfo && (
          <div className="bg-zinc-950/90 border border-indigo-500/40 rounded-2xl p-5 space-y-3 animate-fadeIn text-xs text-zinc-300">
            <div className="flex items-center justify-between font-bold text-white text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Règle méthodologique : Pourquoi seuls certains jours apparaissent ?</span>
              </div>
              <button
                onClick={() => setShowMethodologyInfo(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="leading-relaxed">
              L’agenda applique un filtrage strict : <strong>aucun créneau recommandé n’est inventé</strong> pour remplir artificiellement la semaine. Un jour apparaît uniquement s’il compte au moins 2 publications réelles permettant d’identifier un créneau pertinent, ou s’il contient une publication déjà planifiée ou réalisée à cette date.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-bold text-rose-300 block">Heures d'activité des abonnés</span>
                <span className="text-zinc-400">
                  Indique les moments où vos abonnés sont connectés sur l'application TikTok.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="font-bold text-amber-300 block">Performance réelle observée</span>
                <span className="text-zinc-400">
                  Mesure le résultat chiffré réel (vues, complétion et partages) obtenu sur vos vidéos passées à cette heure précise.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. GRANDES CARTES DE JOURS AÉRÉES (AFFICHAGE STRICT DES JOURS QUALIFIÉS) */}
      {qualifiedDays.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <Calendar className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Aucun créneau pertinent identifié pour cette semaine</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Les données actuelles ne mettent en évidence aucun pic de traction suffisant sur ces dates. Vous pouvez naviguer vers la semaine précédente ou suivante.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {qualifiedDays.map((day) => {
            const hasScheduled = day.scheduledVideos.length > 0;
            const isToday = day.isToday;

            return (
              <div
                key={day.id}
                className={`relative rounded-3xl border transition-all duration-300 flex flex-col justify-between p-6 sm:p-7 shadow-xl backdrop-blur-md ${
                  isToday
                    ? 'bg-zinc-900/95 border-amber-500/80 ring-2 ring-amber-500/20'
                    : day.dayDiagnosis.status === 'high_priority'
                    ? 'bg-zinc-900/90 border-zinc-800 hover:border-rose-500/60 shadow-rose-950/20'
                    : 'bg-zinc-900/85 border-zinc-800 hover:border-indigo-500/50 shadow-zinc-950/40'
                }`}
              >
                {/* Day Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {day.dayName}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-400 px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
                          {day.dayShortDate}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium">
                        {day.dayFullDate}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-xl border ${
                          day.dayDiagnosis.status === 'high_priority'
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : day.dayDiagnosis.status === 'opportunity'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {day.dayDiagnosis.priorityBadge}
                      </span>
                    </div>
                  </div>

                  {/* Day Strategic Summary & Comparative Gain */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">
                        Diagnostic de la journée
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                        {day.dayDiagnosis.performanceBadge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {day.dayDiagnosis.strategicSummary}
                    </p>
                    <div className="pt-2 border-t border-zinc-900 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{day.dayDiagnosis.followerActivityWindow}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{day.dayDiagnosis.historicalProof}</span>
                      </div>
                    </div>
                  </div>

                  {/* IDENTIFIED SLOTS SECTION */}
                  {day.recommendedSlots.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          <span>Créneaux Recommandés ({day.recommendedSlots.length})</span>
                        </span>
                        <span className="text-[10px] text-rose-400/80 lowercase font-normal">
                          calculé sur données réelles
                        </span>
                      </div>

                      <div className="space-y-3">
                        {day.recommendedSlots.map((slot) => {
                          const isHigh = slot.relevanceScore >= 90;
                          return (
                            <div
                              key={slot.slotId}
                              className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition shadow-md ${
                                isHigh
                                  ? 'bg-gradient-to-br from-rose-950/40 via-zinc-950 to-zinc-950 border-rose-500/50 hover:border-rose-400'
                                  : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              {/* Slot Top Bar */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xl sm:text-2xl font-mono font-black text-white">
                                    {slot.timeSlot}
                                  </span>
                                  <span className="text-xs text-zinc-400 font-medium">
                                    ({slot.timeWindow})
                                  </span>
                                </div>
                                <span className="self-start sm:self-auto text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  {slot.relevanceLabel}
                                </span>
                              </div>

                              <div className="font-extrabold text-sm text-white">
                                {slot.targetLabel}
                              </div>

                              {/* Explanation */}
                              <p className="text-xs text-zinc-300 leading-relaxed">
                                {slot.explanation}
                              </p>

                              {/* Data distinctions */}
                              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between text-zinc-300">
                                  <span className="text-zinc-400">Résultat réel observé :</span>
                                  <span className="font-semibold text-zinc-200">{slot.actualObservedPerformance}</span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-300">
                                  <span className="text-zinc-400">Format conseillé :</span>
                                  <span className="font-semibold text-amber-300">{slot.recommendedFormat}</span>
                                </div>
                              </div>

                              {/* Action: Choose this slot to schedule */}
                              <div className="pt-2 flex items-center justify-between gap-2">
                                <button
                                  onClick={() => setSelectedSlotForDetails({ day, slot })}
                                  className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                                >
                                  Détails de l'analyse &rarr;
                                </button>

                                <button
                                  onClick={() =>
                                    handleOpenScheduleModal(
                                      day.dateStr,
                                      day.dayName,
                                      day.dayFullDate,
                                      slot.timeSlot,
                                      slot.recommendedTheme
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-md shadow-rose-950 transition cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Programmer sur ce créneau</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SCHEDULED PUBLICATIONS SECTION */}
                  {hasScheduled && (
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Publications Déjà Planifiées ({day.scheduledVideos.length})</span>
                      </div>

                      <div className="space-y-2">
                        {day.scheduledVideos.map((vid) => (
                          <div
                            key={vid.id}
                            className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 space-y-2.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-800/60">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                {vid.scheduledTime}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Programmé
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-sm text-white line-clamp-1">
                                {vid.title}
                              </h4>
                              {vid.category && (
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                  Thème : {vid.category}
                                </div>
                              )}
                            </div>

                            {/* Actions on scheduled video */}
                            <div className="pt-2 border-t border-emerald-900/40 flex items-center justify-between text-xs">
                              <button
                                onClick={() =>
                                  setVideoToMove({
                                    video: vid,
                                    currentDateStr: day.dateStr,
                                    currentDayName: day.dayName,
                                  })
                                }
                                className="text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3 text-amber-400" />
                                <span>Déplacer</span>
                              </button>

                              {confirmCancelId === vid.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelSchedule(vid.id)}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                                  >
                                    Confirmer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmCancelId(null)}
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                                  >
                                    Non
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(vid.id)}
                                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Annuler</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PUBLISHED PUBLICATIONS SECTION (DISTINCTION STRICTE PARTIE 9) */}
                  {day.publishedVideos && day.publishedVideos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                        <Film className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Publications déjà réalisées ({day.publishedVideos.length})</span>
                      </div>
                      <div className="space-y-2">
                        {day.publishedVideos.map((pv) => (
                          <div
                            key={pv.id}
                            className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{pv.title}</div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                Publiée à {pv.publishedTime}
                              </div>
                            </div>
                            <div className="text-right shrink-0 tabular-nums">
                              <div className="font-bold text-indigo-200">{pv.views.toLocaleString('fr-FR')} vues</div>
                              <div className="text-[11px] text-zinc-400">{pv.engagementRate.toFixed(2)}% eng.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Day Bottom Extra Action */}
                <div className="mt-6 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500">
                    {day.scheduledVideos.length > 0 ? 'Créneau(x) et publication configurés' : 'Aucune publication pour le moment'}
                  </span>
                  <button
                    onClick={() =>
                      handleOpenScheduleModal(
                        day.dateStr,
                        day.dayName,
                        day.dayFullDate,
                        day.recommendedSlots[0]?.timeSlot || '18:00',
                        day.recommendedSlots[0]?.recommendedTheme
                      )
                    }
                    className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une publication</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL: PROGRAMMER SUR CE CRÉNEAU */}
      {schedulingSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSchedulingSlot(null)}
        >
          <div
            className="bg-zinc-900 border border-rose-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Programmer une publication
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {schedulingSlot.dayFullDate} à {schedulingSlot.timeSlot}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingSlot(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Source du contenu
                </label>
                <select
                  value={selectedDraftId}
                  onChange={(e) => setSelectedDraftId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="new">+ Créer une nouvelle entrée de publication</option>
                  {draftItems.map((draft) => (
                    <option key={draft.id} value={draft.id}>
                      Brouillon existant : « {draft.title} »
                    </option>
                  ))}
                </select>
              </div>

              {selectedDraftId === 'new' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Titre ou idée de la vidéo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Coulisses du prochain tournage"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Heure de publication
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Thématique suggérée
                  </label>
                  <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-300 font-semibold truncate">
                    {schedulingSlot.category || 'Général'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px] leading-relaxed">
                <strong>Conseil Coach :</strong> Le créneau sélectionné a été calculé à partir de vos données historiques. Vous pourrez affiner la vidéo avec Mon Visionnaire avant l'heure fixée.
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSchedulingSlot(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchedule ? 'Enregistrement...' : 'Confirmer la programmation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: DÉPLACER UNE PUBLICATION */}
      {videoToMove && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setVideoToMove(null)}
        >
          <div
            className="bg-zinc-900 border border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Déplacer la publication</span>
              </h3>
              <button
                onClick={() => setVideoToMove(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Vidéo sélectionnée</span>
                <p className="font-bold text-zinc-200">{videoToMove.video.title}</p>
                <p className="text-[11px] text-zinc-400">
                  Actuellement prévue : {videoToMove.currentDayName} à {videoToMove.video.scheduledTime}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Choisir un créneau recommandé d'un autre jour qualifié
                </label>
                <select
                  value={targetMoveDateStr}
                  onChange={(e) => {
                    setTargetMoveDateStr(e.target.value);
                    const matchingDay = qualifiedDays.find((d) => d.dateStr === e.target.value);
                    if (matchingDay && matchingDay.recommendedSlots[0]) {
                      setTargetMoveTimeStr(matchingDay.recommendedSlots[0].timeSlot);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Sélectionner une journée...</option>
                  {qualifiedDays
                    .filter((d) => d.dateStr !== videoToMove.currentDateStr)
                    .map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.dayName} {d.dayShortDate} — {d.recommendedSlots[0]?.timeSlot || '18:00'} ({d.dayDiagnosis.priorityBadge})
                      </option>
                    ))}
                </select>
              </div>

              {targetMoveDateStr && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Heure ajustée
                  </label>
                  <input
                    type="time"
                    value={targetMoveTimeStr}
                    onChange={(e) => setTargetMoveTimeStr(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setVideoToMove(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmMoveVideo}
                disabled={!targetMoveDateStr}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition disabled:opacity-40 cursor-pointer"
              >
                Déplacer la publication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DÉTAILS APPROFONDIS DU CRÉNEAU */}
      {selectedSlotForDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedSlotForDetails(null)}
        >
          <div
            className="bg-zinc-900 border border-rose-500/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-rose-400" />
                <h4 className="font-extrabold text-base text-white">
                  Justification détaillée du créneau
                </h4>
              </div>
              <button
                onClick={() => setSelectedSlotForDetails(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-sm font-extrabold text-white">
                    {selectedSlotForDetails.day.dayName} &middot; {selectedSlotForDetails.slot.timeSlot}
                  </div>
                  <div className="text-zinc-400 text-[11px]">
                    Fenêtre : {selectedSlotForDetails.slot.timeWindow}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {selectedSlotForDetails.slot.relevanceLabel}
                </span>
              </div>

              <div>
                <span className="font-semibold text-zinc-300 block mb-1">
                  Explication contextuelle de l'attention :
                </span>
                <p className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 leading-relaxed text-zinc-200">
                  {selectedSlotForDetails.slot.explanation}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Activité des abonnés</span>
                  <span className="font-semibold text-zinc-200">{selectedSlotForDetails.slot.followerActivityPeak}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Résultat réel mesuré</span>
                  <span className="font-semibold text-emerald-300">{selectedSlotForDetails.slot.actualObservedPerformance}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px] leading-relaxed">
                <strong>Thème &amp; Format recommandés :</strong> {selectedSlotForDetails.slot.recommendedTheme} &mdash; {selectedSlotForDetails.slot.recommendedFormat}.
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedSlotForDetails(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  const s = selectedSlotForDetails;
                  setSelectedSlotForDetails(null);
                  handleOpenScheduleModal(
                    s.day.dateStr,
                    s.day.dayName,
                    s.day.dayFullDate,
                    s.slot.timeSlot,
                    s.slot.recommendedTheme
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Programmer sur ce créneau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
