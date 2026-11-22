import {
  ContentItem,
  PerformanceCheckpoint,
  TikTokMetricSnapshot,
  TikTokOfficialVideo,
} from '../types';
import { computeMean, computeMedian, safePercent } from './centralDataEngine';

export interface VideoTemporalRecord {
  videoId: string;
  videoTitle: string;
  category: string;
  duration: number; // 0 = non fourni par l'API
  durationKnown: boolean;
  publishedAt: string; // ISO date-time
  publishedDate: string; // YYYY-MM-DD
  publishedHour: number; // 0-23
  dayOfWeek: string; // 'Lundi' | 'Mardi' | ...
  currentViews: number;
  currentLikes: number;
  currentComments: number;
  currentShares: number;
  currentFavorites?: number | null;
  engagementRate: number;
  checkpoints: {
    h1?: PerformanceCheckpoint;
    h5?: PerformanceCheckpoint;
    h24?: PerformanceCheckpoint;
    h48?: PerformanceCheckpoint;
    d7?: PerformanceCheckpoint;
  };
  trajectoryType:
    | 'Démarrage rapide'
    | 'Progression régulière'
    | 'Seconde vague tardive'
    | 'Palier stable'
    | 'Données récentes';
  accelerationRate?: number;
  isHistoricalEstimated: boolean;
}

export interface TemporalSummaryStats {
  checkpoint: '1 heure' | '5 heures' | '24 heures' | '48 heures' | '7 jours';
  hoursKey: 'h1' | 'h5' | 'h24' | 'h48' | 'd7';
  sampleCount: number;
  avgViews: number;
  medianViews: number;
  avgEngagementRate: number;
  confidenceLevel:
    | 'Élevé (échantillon représentatif)'
    | 'Modéré (à consolider)'
    | 'Faible (échantillon restreint)';
}

export interface DurationCategoryAnalysis {
  categoryName: 'Format court' | 'Format moyen' | 'Format long';
  durationLabel: string;
  minSeconds: number;
  maxSeconds: number;
  videoCount: number;
  avgViews: number;
  medianViews: number;
  avgLikesPerView: number;
  avgCommentsPerView: number;
  avgSharesPerView: number;
  avgEngagementRate: number;
  avgViewsH24?: number;
  avgViewsD7?: number;
  scientificVerdict: string;
  sampleConfidence: 'Élevé' | 'Modéré' | 'Faible';
}

export interface WeeklyScheduleSlot {
  id: string;
  dayIndex: number;
  dayName: string;
  dateStr: string;
  timeSlot: string;
  isRecommendedSlot: boolean;
  recommendedCategory?: string;
  recommendationJustification?: string;
  isStrategicRestRecommended?: boolean;
  scheduledVideo?: {
    id: string;
    title: string;
    category?: string;
    status: 'scheduled' | 'published';
    duration?: number;
  };
}

export interface IdentifiedScheduleSlot {
  slotId: string;
  timeSlot: string;
  timeWindow: string;
  targetLabel: string;
  relevanceScore: number;
  relevanceLabel: string;
  relevanceColor: 'rose' | 'amber' | 'emerald' | 'indigo';
  followerActivityPeak: string;
  actualObservedPerformance: string;
  historicalSampleCount: number;
  explanation: string;
  recommendedTheme: string;
  recommendedFormat: string;
}

export interface WeeklyScheduleDay {
  id: string;
  dateStr: string;
  dayName: string;
  dayShortDate: string;
  dayFullDate: string;
  isToday: boolean;
  isPast: boolean;
  hasIdentifiedSlot: boolean;
  hasScheduledVideo: boolean;
  hasPublishedVideo: boolean;
  recommendedSlots: IdentifiedScheduleSlot[];
  scheduledVideos: Array<{
    id: string;
    title: string;
    category?: string;
    scheduledTime: string;
    status: 'scheduled' | 'published';
    duration?: number;
    videoUrl?: string;
  }>;
  publishedVideos: Array<{
    id: string;
    title: string;
    publishedTime: string;
    views: number;
    engagementRate: number;
  }>;
  dayDiagnosis: {
    status: 'high_priority' | 'opportunity' | 'scheduled_only' | 'published_only';
    priorityBadge: string;
    performanceBadge: string;
    confidenceLevel: 'Très élevée (confirmé)' | 'Élevée' | 'Modérée' | 'Faible';
    strategicSummary: string;
    followerActivityWindow: string;
    historicalProof: string;
  };
}

const LOCAL_STORAGE_CHECKPOINTS_KEY = 'tiktok_temporal_checkpoints_v2';
const DAYS_FR_BY_GETDAY = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAYS_ORDER_MON_SUN = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function getStoredCheckpointsMap(): Record<string, VideoTemporalRecord['checkpoints']> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHECKPOINTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored checkpoints:', e);
  }
  return {};
}

export function saveVideoCheckpoint(
  videoId: string,
  checkpointKey: 'h1' | 'h5' | 'h24' | 'h48' | 'd7',
  metrics: { views: number; likes: number; comments: number; shares: number; favorites?: number }
) {
  if (typeof window === 'undefined') return;
  try {
    const map = getStoredCheckpointsMap();
    if (!map[videoId]) map[videoId] = {};
    const rate = safePercent(metrics.likes + metrics.comments + metrics.shares, metrics.views, 2) ?? 0;

    map[videoId][checkpointKey] = {
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      favorites: metrics.favorites,
      engagementRate: rate,
      recordedAt: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_STORAGE_CHECKPOINTS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Error saving checkpoint:', e);
  }
}

export function buildTemporalRecords(
  tiktokVideos: TikTokOfficialVideo[],
  contentItems: ContentItem[],
  snapshots: TikTokMetricSnapshot[] = []
): VideoTemporalRecord[] {
  const storedMap = getStoredCheckpointsMap();
  const records: VideoTemporalRecord[] = [];

  tiktokVideos.forEach((tv) => {
    const pubDate = new Date(tv.createTime * 1000);
    const publishedAt = pubDate.toISOString();
    const publishedDate = publishedAt.split('T')[0];
    const publishedHour = pubDate.getHours();
    const dayOfWeek = DAYS_FR_BY_GETDAY[pubDate.getDay()];

    const ageHours = Math.max(0, (Date.now() - pubDate.getTime()) / 3600000);
    const existingCheckpoints = storedMap[tv.id] || {};
    const checkpoints: VideoTemporalRecord['checkpoints'] = { ...existingCheckpoints };

    // Only real collected snapshots fill checkpoints
    snapshots
      .filter((s) => s.videoId === tv.id)
      .forEach((s) => {
        const rate = safePercent(s.likes + s.comments + s.shares, s.views, 2) ?? 0;
        const snapTime = s.fetchDate ? new Date(s.fetchDate).getTime() : Date.now();
        const ageHoursAtSnap = Math.max(0, (snapTime - pubDate.getTime()) / 3600000);
        const cp: PerformanceCheckpoint = {
          views: s.views,
          likes: s.likes,
          comments: s.comments,
          shares: s.shares,
          favorites: s.favorites ?? undefined,
          engagementRate: rate,
          recordedAt: s.fetchDate || new Date().toISOString(),
        };
        if (s.checkpointType === 'h24' || (ageHoursAtSnap >= 20 && ageHoursAtSnap <= 30 && !checkpoints.h24)) {
          checkpoints.h24 = cp;
        } else if (s.checkpointType === 'h48' || (ageHoursAtSnap >= 40 && ageHoursAtSnap <= 56 && !checkpoints.h48)) {
          checkpoints.h48 = cp;
        } else if (s.checkpointType === 'd7' || (ageHoursAtSnap >= 140 && ageHoursAtSnap <= 190 && !checkpoints.d7)) {
          checkpoints.d7 = cp;
        } else if (s.checkpointType === 'h1' || (ageHoursAtSnap <= 2 && !checkpoints.h1)) {
          checkpoints.h1 = cp;
        } else if (s.checkpointType === 'h5' || (ageHoursAtSnap > 2 && ageHoursAtSnap <= 8 && !checkpoints.h5)) {
          checkpoints.h5 = cp;
        }
      });

    const subject = tv.editorialMeta?.subject?.trim();
    const category = subject || 'Publication TikTok';

    // Trajectory detection from real checkpoints if multiple exist
    let trajectoryType: VideoTemporalRecord['trajectoryType'] = 'Palier stable';
    if (ageHours < 24) {
      trajectoryType = 'Données récentes';
    } else if (checkpoints.h24 && tv.viewCount > checkpoints.h24.views * 1.6) {
      trajectoryType = 'Seconde vague tardive';
    } else if (checkpoints.h5 && checkpoints.h24 && checkpoints.h24.views > checkpoints.h5.views * 1.5) {
      trajectoryType = 'Progression régulière';
    } else if (checkpoints.h1 && checkpoints.h1.views > 0 && tv.viewCount <= checkpoints.h1.views * 1.4) {
      trajectoryType = 'Démarrage rapide';
    }

    const durationVal = typeof tv.duration === 'number' && tv.duration > 0 ? tv.duration : 0;

    records.push({
      videoId: tv.id,
      videoTitle: tv.title || tv.videoDescription || `Vidéo #${tv.id.slice(-4)}`,
      category,
      duration: durationVal,
      durationKnown: durationVal > 0,
      publishedAt,
      publishedDate,
      publishedHour,
      dayOfWeek,
      currentViews: tv.viewCount,
      currentLikes: tv.likeCount,
      currentComments: tv.commentCount,
      currentShares: tv.shareCount,
      currentFavorites: tv.favoriteCount ?? null,
      engagementRate: safePercent(tv.likeCount + tv.commentCount + tv.shareCount, tv.viewCount, 2) ?? 0,
      checkpoints,
      trajectoryType,
      isHistoricalEstimated: false,
    });
  });

  // Include manually tracked published items without duplicating official videos
  contentItems
    .filter((ci) => ci.status === 'published' && ci.metrics)
    .forEach((ci) => {
      if (records.some((r) => r.videoId === ci.id)) return;
      const pubDate = ci.publishedAt
        ? new Date(ci.publishedAt)
        : new Date(`${ci.scheduledDate}T${ci.scheduledTime || '12:00'}`);
      const publishedAt = pubDate.toISOString();
      const publishedDate = publishedAt.split('T')[0];
      const publishedHour = pubDate.getHours();
      const dayOfWeek = DAYS_FR_BY_GETDAY[pubDate.getDay()];
      const m = ci.metrics!;
      const existingCheckpoints = storedMap[ci.id] || m.checkpoints || {};
      const durationVal = typeof ci.duration === 'number' && ci.duration > 0 ? ci.duration : 0;

      records.push({
        videoId: ci.id,
        videoTitle: ci.title,
        category: ci.analysis?.subject || 'Publication locale',
        duration: durationVal,
        durationKnown: durationVal > 0,
        publishedAt,
        publishedDate,
        publishedHour,
        dayOfWeek,
        currentViews: m.views,
        currentLikes: m.likes,
        currentComments: m.comments,
        currentShares: m.shares,
        engagementRate: m.engagementRate,
        checkpoints: existingCheckpoints,
        trajectoryType: 'Progression régulière',
        isHistoricalEstimated: false,
      });
    });

  return records.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function computeTemporalStats(records: VideoTemporalRecord[]): TemporalSummaryStats[] {
  const milestones: Array<{
    checkpoint: TemporalSummaryStats['checkpoint'];
    key: 'h1' | 'h5' | 'h24' | 'h48' | 'd7';
  }> = [
    { checkpoint: '1 heure', key: 'h1' },
    { checkpoint: '5 heures', key: 'h5' },
    { checkpoint: '24 heures', key: 'h24' },
    { checkpoint: '48 heures', key: 'h48' },
    { checkpoint: '7 jours', key: 'd7' },
  ];

  return milestones.map((m) => {
    const measuredVideos = records.filter((r) => r.checkpoints[m.key] !== undefined);
    const count = measuredVideos.length;

    let avgViews = 0;
    let medianViews = 0;
    let avgRate = 0;

    if (count > 0) {
      const viewsList = measuredVideos.map((r) => r.checkpoints[m.key]!.views);
      avgViews = Math.round(computeMean(viewsList));
      medianViews = Math.round(computeMedian(viewsList));
      avgRate = Number(
        computeMean(measuredVideos.map((r) => r.checkpoints[m.key]!.engagementRate || 0)).toFixed(2)
      );
    }

    let confidenceLevel: TemporalSummaryStats['confidenceLevel'] = 'Faible (échantillon restreint)';
    if (count >= 15) confidenceLevel = 'Élevé (échantillon représentatif)';
    else if (count >= 5) confidenceLevel = 'Modéré (à consolider)';

    return {
      checkpoint: m.checkpoint,
      hoursKey: m.key,
      sampleCount: count,
      avgViews,
      medianViews,
      avgEngagementRate: avgRate,
      confidenceLevel,
    };
  });
}

export function computeDurationAnalysis(
  records: VideoTemporalRecord[],
  thresholds: { shortMax: number; mediumMax: number } = { shortMax: 30, mediumMax: 60 }
): DurationCategoryAnalysis[] {
  // Strictly ignore records with unknown duration (duration === 0)
  const known = records.filter((r) => r.duration > 0);
  const shortVideos = known.filter((r) => r.duration <= thresholds.shortMax);
  const mediumVideos = known.filter(
    (r) => r.duration > thresholds.shortMax && r.duration <= thresholds.mediumMax
  );
  const longVideos = known.filter((r) => r.duration > thresholds.mediumMax);

  const analyzeGroup = (
    name: DurationCategoryAnalysis['categoryName'],
    label: string,
    min: number,
    max: number,
    group: VideoTemporalRecord[]
  ): DurationCategoryAnalysis => {
    const count = group.length;
    if (count === 0) {
      return {
        categoryName: name,
        durationLabel: label,
        minSeconds: min,
        maxSeconds: max,
        videoCount: 0,
        avgViews: 0,
        medianViews: 0,
        avgLikesPerView: 0,
        avgCommentsPerView: 0,
        avgSharesPerView: 0,
        avgEngagementRate: 0,
        scientificVerdict: 'Aucune vidéo avec durée connue dans cette tranche.',
        sampleConfidence: 'Faible',
      };
    }

    const totalViews = group.reduce((acc, r) => acc + r.currentViews, 0);
    const avgViews = Math.round(totalViews / count);
    const medianViews = Math.round(computeMedian(group.map((r) => r.currentViews)));

    const totalLikes = group.reduce((acc, r) => acc + r.currentLikes, 0);
    const totalComments = group.reduce((acc, r) => acc + r.currentComments, 0);
    const totalShares = group.reduce((acc, r) => acc + r.currentShares, 0);

    const avgLikesPerView = safePercent(totalLikes, totalViews, 2) ?? 0;
    const avgCommentsPerView = safePercent(totalComments, totalViews, 2) ?? 0;
    const avgSharesPerView = safePercent(totalShares, totalViews, 2) ?? 0;
    const avgEngagementRate =
      safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

    let sampleConfidence: DurationCategoryAnalysis['sampleConfidence'] = 'Faible';
    if (count >= 10) sampleConfidence = 'Élevé';
    else if (count >= 4) sampleConfidence = 'Modéré';

    const scientificVerdict =
      count >= 2
        ? `${count} vidéo(s) mesurée(s) : médiane de ${medianViews.toLocaleString('fr-FR')} vues et engagement consolidé de ${avgEngagementRate}%.`
        : `Échantillon limité (1 vidéo : ${medianViews.toLocaleString('fr-FR')} vues) — insuffisant pour conclure sur cette tranche.`;

    return {
      categoryName: name,
      durationLabel: label,
      minSeconds: min,
      maxSeconds: max,
      videoCount: count,
      avgViews,
      medianViews,
      avgLikesPerView,
      avgCommentsPerView,
      avgSharesPerView,
      avgEngagementRate,
      scientificVerdict,
      sampleConfidence,
    };
  };

  return [
    analyzeGroup('Format court', `≤ ${thresholds.shortMax}s`, 1, thresholds.shortMax, shortVideos),
    analyzeGroup(
      'Format moyen',
      `${thresholds.shortMax + 1}s - ${thresholds.mediumMax}s`,
      thresholds.shortMax + 1,
      thresholds.mediumMax,
      mediumVideos
    ),
    analyzeGroup('Format long', `> ${thresholds.mediumMax}s`, thresholds.mediumMax + 1, 600, longVideos),
  ];
}

/**
 * Computes qualifying time slots per weekday strictly from real historical records.
 * Never fabricates recommendations if a day lacks >= 2 historical videos or strong performance.
 */
function deriveRealSlotsByDay(records: VideoTemporalRecord[]): Record<string, IdentifiedScheduleSlot[]> {
  const result: Record<string, IdentifiedScheduleSlot[]> = {};
  if (records.length < 3) return result;

  const globalViews = records.map((r) => r.currentViews).filter((v) => v > 0);
  if (globalViews.length === 0) return result;
  const globalMedian = computeMedian(globalViews);
  const globalEng = computeMedian(records.map((r) => r.engagementRate));

  for (const dayName of DAYS_ORDER_MON_SUN) {
    const dayRecords = records.filter((r) => r.dayOfWeek === dayName);
    if (dayRecords.length < 2) continue; // Minimum 2 real publications on that day to identify a reliable pattern

    const dayMedian = computeMedian(dayRecords.map((r) => r.currentViews));
    const dayEng = Number(computeMean(dayRecords.map((r) => r.engagementRate)).toFixed(1));

    // Group by hour bucket on this day
    const hourBuckets: Record<number, VideoTemporalRecord[]> = {};
    for (const r of dayRecords) {
      if (!hourBuckets[r.publishedHour]) hourBuckets[r.publishedHour] = [];
      hourBuckets[r.publishedHour].push(r);
    }

    const candidateHours = Object.entries(hourBuckets)
      .map(([hStr, list]) => {
        const hour = Number(hStr);
        const slotMedian = Math.round(computeMedian(list.map((x) => x.currentViews)));
        const slotEng = Number(computeMean(list.map((x) => x.engagementRate)).toFixed(1));
        return { hour, list, slotMedian, slotEng };
      })
      // Keep hours with >= 2 videos OR a strong single observation on an active qualifying day (>= globalMedian)
      .filter((b) => b.list.length >= 2 || (dayMedian >= globalMedian && b.slotMedian >= globalMedian))
      .sort((a, b) => b.slotMedian - a.slotMedian)
      .slice(0, 2);

    // Also include whole-day slot if day has >= 2 videos beating 85% of global median even across different hours
    if (candidateHours.length === 0 && dayMedian >= globalMedian * 0.85) {
      const sortedDay = dayRecords.slice().sort((a, b) => b.currentViews - a.currentViews);
      const topRec = sortedDay[0];
      candidateHours.push({
        hour: topRec.publishedHour,
        list: dayRecords,
        slotMedian: Math.round(dayMedian),
        slotEng: dayEng,
      });
    }

    if (candidateHours.length === 0) continue;

    result[dayName] = candidateHours.map((b, idx) => {
      const hourPad = String(b.hour).padStart(2, '0');
      const endHourPad = String((b.hour + 1) % 24).padStart(2, '0');
      const deltaPct =
        globalMedian > 0 ? Math.round(((b.slotMedian - globalMedian) / globalMedian) * 100) : 0;
      const isTop = deltaPct >= 20;

      return {
        slotId: `slot-${dayName}-${hourPad}-${idx}`,
        timeSlot: `${hourPad}:00`,
        timeWindow: `${hourPad}h00 – ${endHourPad}h00`,
        targetLabel:
          b.list.length >= 2
            ? `Créneau observé (${b.list.length} vidéos)`
            : 'Fenêtre porteuse observée',
        relevanceScore: Math.max(55, Math.min(99, 70 + Math.round(deltaPct / 3) + b.list.length * 4)),
        relevanceLabel:
          deltaPct >= 0
            ? `+${deltaPct}% vs médiane du compte`
            : `${deltaPct}% vs médiane du compte`,
        relevanceColor: isTop ? 'emerald' : b.slotEng >= globalEng ? 'indigo' : 'amber',
        followerActivityPeak: `Fenêtre horaire mesurée sur l’historique du compte (${hourPad}h)`,
        actualObservedPerformance: `Médiane mesurée : ${b.slotMedian.toLocaleString('fr-FR')} vues · ${b.slotEng}% d'engagement (${b.list.length} vidéo${b.list.length > 1 ? 's' : ''})`,
        historicalSampleCount: b.list.length,
        explanation: `Calculé directement sur ${b.list.length} publication(s) réelle(s) le ${dayName} autour de ${hourPad}h (sans donnée inventée).`,
        recommendedTheme: b.list[0]?.category || 'Thématique habituelle',
        recommendedFormat: 'À tester en évitant de rapprocher deux publications de moins de 3h',
      };
    });
  }

  return result;
}

/**
 * Retourne uniquement les créneaux réellement qualifiés par les données ou planifiés.
 */
export function buildWeeklySchedule(
  records: VideoTemporalRecord[],
  scheduledItems: ContentItem[],
  weekOffset: number = 0
): WeeklyScheduleSlot[] {
  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7;
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() - currentDayIndex + weekOffset * 7);
  startMonday.setHours(0, 0, 0, 0);

  const realSlotsByDay = deriveRealSlotsByDay(records);
  const slots: WeeklyScheduleSlot[] = [];

  DAYS_ORDER_MON_SUN.forEach((dayName, idx) => {
    const slotDate = new Date(startMonday);
    slotDate.setDate(startMonday.getDate() + idx);
    const dateStr = slotDate.toISOString().split('T')[0];

    const scheduled = scheduledItems.find((ci) => ci.scheduledDate === dateStr);
    const dayIdentified = realSlotsByDay[dayName] || [];
    const primarySlot = dayIdentified[0];

    if (!primarySlot && !scheduled) return;

    slots.push({
      id: `slot-${dateStr}-${primarySlot?.timeSlot || scheduled?.scheduledTime || '12:00'}`,
      dayIndex: idx,
      dayName,
      dateStr,
      timeSlot: scheduled?.scheduledTime || primarySlot?.timeSlot || '12:00',
      isRecommendedSlot: Boolean(primarySlot),
      recommendedCategory: primarySlot?.recommendedTheme,
      recommendationJustification: primarySlot?.explanation,
      isStrategicRestRecommended: false,
      scheduledVideo: scheduled
        ? {
            id: scheduled.id,
            title: scheduled.title,
            category: scheduled.analysis?.subject,
            status: scheduled.status as any,
            duration: scheduled.duration,
          }
        : undefined,
    });
  });

  return slots;
}

/**
 * PARTIE 9 — Agenda hebdomadaire filtré strictement sur les données réelles :
 * N'affiche QUE les jours qui ont au moins :
 * 1) Un créneau recommandé issu des données réelles du compte, OU
 * 2) Une publication planifiée à cette date, OU
 * 3) Une publication déjà réalisée sur cette date.
 * Tout jour sans aucun de ces éléments est strictement absent.
 */
export function buildFilteredWeeklySchedule(
  records: VideoTemporalRecord[],
  scheduledItems: ContentItem[],
  weekOffset: number = 0
): {
  qualifiedDays: WeeklyScheduleDay[];
  omittedDaysCount: number;
  omittedDayNames: string[];
  totalIdentifiedSlots: number;
  totalScheduledVideos: number;
  totalPublishedVideos: number;
} {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentDayIndex = (now.getDay() + 6) % 7;
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() - currentDayIndex + weekOffset * 7);
  startMonday.setHours(0, 0, 0, 0);

  const realSlotsByDay = deriveRealSlotsByDay(records);
  const allViews = records.map((r) => r.currentViews).filter((v) => v > 0);
  const globalMedianViews = allViews.length > 0 ? Math.round(computeMedian(allViews)) : 0;

  const qualifiedDays: WeeklyScheduleDay[] = [];
  const omittedDayNames: string[] = [];
  let totalIdentifiedSlots = 0;
  let totalScheduledVideos = 0;
  let totalPublishedVideos = 0;

  DAYS_ORDER_MON_SUN.forEach((dayName, idx) => {
    const slotDate = new Date(startMonday);
    slotDate.setDate(startMonday.getDate() + idx);
    const dateStr = slotDate.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;

    const dayScheduledItems = scheduledItems.filter(
      (ci) => ci.scheduledDate === dateStr && ci.status !== 'published'
    );
    const dayPublishedFromRecords = records.filter((r) => r.publishedDate === dateStr);

    const recommendedSlots = (realSlotsByDay[dayName] || []).map((s) => ({
      ...s,
      slotId: `slot-${dateStr}-${s.timeSlot.replace(':', '')}`,
    }));

    const hasIdentifiedSlot = recommendedSlots.length > 0;
    const hasScheduledVideo = dayScheduledItems.length > 0;
    const hasPublishedVideo = dayPublishedFromRecords.length > 0;

    if (!hasIdentifiedSlot && !hasScheduledVideo && !hasPublishedVideo) {
      omittedDayNames.push(dayName);
      return;
    }

    totalIdentifiedSlots += recommendedSlots.length;
    totalScheduledVideos += dayScheduledItems.length;
    totalPublishedVideos += dayPublishedFromRecords.length;

    const dayDateObj = new Date(dateStr + 'T12:00:00');
    const dayShortDate = dayDateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const dayFullDate = dayDateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const capitalizedFullDate = dayFullDate.charAt(0).toUpperCase() + dayFullDate.slice(1);

    const dayHistoricalRecords = records.filter((r) => r.dayOfWeek === dayName);
    const dayMedian =
      dayHistoricalRecords.length > 0
        ? Math.round(computeMedian(dayHistoricalRecords.map((r) => r.currentViews)))
        : 0;

    let status: WeeklyScheduleDay['dayDiagnosis']['status'] = 'scheduled_only';
    let priorityBadge = 'Publication planifiée';
    let performanceBadge = 'Données historiques insuffisantes';
    let confidenceLevel: WeeklyScheduleDay['dayDiagnosis']['confidenceLevel'] = 'Faible';
    let strategicSummary =
      'Jour affiché en raison d’une publication planifiée ou réalisée ; aucun créneau historique fort n’a encore été isolé ce jour.';
    let followerActivityWindow = 'En attente de mesures complémentaires';
    let historicalProof = `${dayHistoricalRecords.length} vidéo(s) historique(s) ce jour.`;

    if (hasIdentifiedSlot) {
      const deltaPct =
        globalMedianViews > 0
          ? Math.round(((dayMedian - globalMedianViews) / globalMedianViews) * 100)
          : 0;
      status = deltaPct >= 15 ? 'high_priority' : 'opportunity';
      priorityBadge = deltaPct >= 15 ? 'Jour qualifié · Forte médiane' : 'Créneau identifié';
      performanceBadge =
        deltaPct >= 0
          ? `+${deltaPct}% vs médiane du compte`
          : `${deltaPct}% vs médiane du compte`;
      confidenceLevel =
        dayHistoricalRecords.length >= 5
          ? 'Très élevée (confirmé)'
          : dayHistoricalRecords.length >= 3
          ? 'Élevée'
          : 'Modérée';
      strategicSummary = `Basé sur ${dayHistoricalRecords.length} vidéo(s) réelle(s) publiée(s) le ${dayName} (médiane observée : ${dayMedian.toLocaleString('fr-FR')} vues).`;
      followerActivityWindow = recommendedSlots[0].followerActivityPeak;
      historicalProof = `Confirmé sur ${dayHistoricalRecords.length} publication(s) réelle(s) (médiane ${dayMedian.toLocaleString('fr-FR')} vues).`;
    } else if (hasPublishedVideo && !hasScheduledVideo) {
      status = 'published_only';
      priorityBadge = 'Publication réalisée';
      performanceBadge = `${dayPublishedFromRecords.length} sortie(s) enregistrée(s)`;
    }

    qualifiedDays.push({
      id: `day-${dateStr}`,
      dateStr,
      dayName,
      dayShortDate,
      dayFullDate: capitalizedFullDate,
      isToday,
      isPast,
      hasIdentifiedSlot,
      hasScheduledVideo,
      hasPublishedVideo,
      recommendedSlots,
      scheduledVideos: dayScheduledItems.map((ci) => ({
        id: ci.id,
        title: ci.title,
        category: ci.analysis?.subject || 'Publication planifiée',
        scheduledTime: ci.scheduledTime || '18:00',
        status: (ci.status as any) || 'scheduled',
        duration: ci.duration,
        videoUrl: ci.videoUrl,
      })),
      publishedVideos: dayPublishedFromRecords.map((r) => ({
        id: r.videoId,
        title: r.videoTitle,
        publishedTime: new Date(r.publishedAt).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        views: r.currentViews,
        engagementRate: r.engagementRate,
      })),
      dayDiagnosis: {
        status,
        priorityBadge,
        performanceBadge,
        confidenceLevel,
        strategicSummary,
        followerActivityWindow,
        historicalProof,
      },
    });
  });

  return {
    qualifiedDays,
    omittedDaysCount: omittedDayNames.length,
    omittedDayNames,
    totalIdentifiedSlots,
    totalScheduledVideos,
    totalPublishedVideos,
  };
}
