import {
  ContentItem,
  FairVideoComparison,
  GranularDayStat,
  GranularTimeSlotStat,
  PerformanceTiersData,
  TikTokCoachReport,
  TikTokMetricSnapshot,
  TikTokOfficialVideo,
  VideoCausalDiagnosis,
  VideoClusterGroup,
  VideoRetentionData,
} from '../types';
import { computeMean, computeMedian, computeQuantile, safePercent } from './centralDataEngine';

export interface UnifiedVideoData {
  id: string;
  title: string;
  description?: string;
  hashtags: string[];
  coverImageUrl?: string;
  shareUrl?: string;
  timestampMs: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  duration?: number;
  source: 'official_api' | 'manual';
}

export function extractHashtagsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of matches) {
    const normalized = raw.toLowerCase();
    if (normalized.length > 1 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export function calculateMedian(numbers: number[]): number {
  return Math.round(computeMedian(numbers));
}

export function unifyVideoData(
  officialVideos: TikTokOfficialVideo[],
  manualItems: ContentItem[]
): UnifiedVideoData[] {
  const list: UnifiedVideoData[] = [];

  for (const v of officialVideos) {
    const views = Number(v.viewCount || 0);
    const likes = Number(v.likeCount || 0);
    const comments = Number(v.commentCount || 0);
    const shares = Number(v.shareCount || 0);
    const engagementRate = safePercent(likes + comments + shares, views, 2) ?? 0;
    const rawDesc = v.videoDescription || '';
    const rawTitle = v.title || rawDesc || 'Vidéo TikTok';
    const hashtags = extractHashtagsFromText(`${v.title || ''} ${rawDesc}`);

    list.push({
      id: v.id,
      title: rawTitle,
      description: rawDesc || undefined,
      hashtags,
      coverImageUrl: v.coverImageUrl,
      shareUrl: v.shareUrl,
      timestampMs: Number(v.createTime) * 1000,
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      shareCount: shares,
      engagementRate,
      duration: v.duration,
      source: 'official_api',
    });
  }

  const existingIds = new Set(list.map((item) => item.id));
  const publishedManual = manualItems.filter(
    (m) => m.status === 'published' && m.metrics && !existingIds.has(m.id)
  );

  for (const m of publishedManual) {
    const metrics = m.metrics!;
    const publishedAt = m.publishedAt
      ? new Date(m.publishedAt).getTime()
      : new Date(m.scheduledDate).getTime();
    const explicitTags = (m.hashtags || []).map((t) =>
      t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`
    );
    const textTags = extractHashtagsFromText(`${m.title || ''} ${m.caption || ''}`);
    const mergedTags = Array.from(new Set([...explicitTags, ...textTags]));

    list.push({
      id: m.id,
      title: m.title || 'Publication',
      description: m.caption || undefined,
      hashtags: mergedTags,
      coverImageUrl: m.thumbnailUrl,
      timestampMs: publishedAt,
      viewCount: Number(metrics.views || 0),
      likeCount: Number(metrics.likes || 0),
      commentCount: Number(metrics.comments || 0),
      shareCount: Number(metrics.shares || 0),
      engagementRate: Number(metrics.engagementRate || 0),
      duration: m.duration,
      source: 'manual',
    });
  }

  return list.sort((a, b) => b.timestampMs - a.timestampMs);
}

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function computeGranularTimeSlots(
  videos: UnifiedVideoData[],
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
): {
  slots30m: GranularTimeSlotStat[];
  hourlySlots: GranularTimeSlotStat[];
  rankedSlots: GranularTimeSlotStat[];
} {
  if (videos.length === 0) {
    return { slots30m: [], hourlySlots: [], rankedSlots: [] };
  }

  const map30m: Record<string, any> = {};
  const mapHourly: Record<string, any> = {};

  for (const video of videos) {
    const date = new Date(video.timestampMs);
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value || '';
    const hourPart = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutePart = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const capitalizedDay = weekdayPart.charAt(0).toUpperCase() + weekdayPart.slice(1);
    const day = DAY_NAMES.includes(capitalizedDay) ? capitalizedDay : DAY_NAMES[date.getDay()];

    const minuteInterval = minutePart < 30 ? '00-30' : '30-59';
    const intervalDisplay = minutePart < 30 ? '00' : '30';
    const key30m = `${day}_${hourPart}h${intervalDisplay}`;
    const keyHourly = `${day}_${hourPart}h`;

    if (!map30m[key30m]) {
      map30m[key30m] = {
        dayName: day,
        hour: hourPart,
        interval: minuteInterval,
        views: [],
        likes: [],
        comments: [],
        shares: [],
        engagements: [],
      };
    }
    map30m[key30m].views.push(video.viewCount);
    map30m[key30m].likes.push(video.likeCount);
    map30m[key30m].comments.push(video.commentCount);
    map30m[key30m].shares.push(video.shareCount);
    map30m[key30m].engagements.push(video.engagementRate);

    if (!mapHourly[keyHourly]) {
      mapHourly[keyHourly] = {
        dayName: day,
        hour: hourPart,
        views: [],
        likes: [],
        comments: [],
        shares: [],
        engagements: [],
      };
    }
    mapHourly[keyHourly].views.push(video.viewCount);
    mapHourly[keyHourly].likes.push(video.likeCount);
    mapHourly[keyHourly].comments.push(video.commentCount);
    mapHourly[keyHourly].shares.push(video.shareCount);
    mapHourly[keyHourly].engagements.push(video.engagementRate);
  }

  const buildStat = (
    key: string,
    data: any,
    slotLabel: string,
    minuteInterval?: string
  ): GranularTimeSlotStat => {
    const count = data.views.length;
    const meanViews = Math.round(computeMean(data.views));
    const medianViews = Math.round(computeMedian(data.views));
    const meanLikes = Math.round(computeMean(data.likes));
    const meanComments = Math.round(computeMean(data.comments));
    const meanShares = Math.round(computeMean(data.shares));
    const meanEngagementRate = Number(computeMean(data.engagements).toFixed(2));

    let confidence: 'faible' | 'modérée' | 'élevée' = 'faible';
    let isRecommended = false;
    let recommendationReason = "Échantillon insuffisant (1 seule vidéo). Attendez d'autres tests.";

    if (count >= 3) {
      confidence = 'élevée';
      isRecommended = true;
      recommendationReason = `Confirmé sur ${count} publications (médiane de ${medianViews.toLocaleString('fr-FR')} vues).`;
    } else if (count === 2) {
      confidence = 'modérée';
      isRecommended = true;
      recommendationReason = `Tendance observée sur 2 vidéos (médiane ${medianViews.toLocaleString('fr-FR')} vues). À consolider.`;
    }

    return {
      key,
      dayName: data.dayName,
      hour: data.hour,
      minuteInterval,
      slotLabel,
      videoCount: count,
      meanViews,
      medianViews,
      meanEngagementRate,
      meanLikes,
      meanComments,
      meanShares,
      confidence,
      isRecommended,
      recommendationReason,
    };
  };

  const slots30m = Object.entries(map30m).map(([key, data]) => {
    const minuteDisplay = data.interval === '00-30' ? '00' : '30';
    return buildStat(key, data, `${data.dayName} à ${data.hour}h${minuteDisplay}`, data.interval);
  });

  const hourlySlots = Object.entries(mapHourly).map(([key, data]) =>
    buildStat(key, data, `${data.dayName} à ${data.hour}h00`)
  );

  const rankedSlots = [...hourlySlots].sort((a, b) => {
    if (a.videoCount >= 2 && b.videoCount < 2) return -1;
    if (b.videoCount >= 2 && a.videoCount < 2) return 1;
    if (b.medianViews !== a.medianViews) return b.medianViews - a.medianViews;
    return b.meanEngagementRate - a.meanEngagementRate;
  });

  return { slots30m, hourlySlots, rankedSlots };
}

export function computeGranularDays(
  videos: UnifiedVideoData[],
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
): GranularDayStat[] {
  const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayBuckets: Record<string, any> = {};

  daysOrder.forEach((d) => {
    dayBuckets[d] = { views: [], likes: [], comments: [], shares: [], engagements: [] };
  });

  for (const v of videos) {
    const date = new Date(v.timestampMs);
    const formatter = new Intl.DateTimeFormat('fr-FR', { timeZone, weekday: 'long' });
    const weekdayRaw = formatter.format(date);
    const capDay = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
    const day = DAY_NAMES.includes(capDay) ? capDay : DAY_NAMES[date.getDay()];

    if (dayBuckets[day]) {
      dayBuckets[day].views.push(v.viewCount);
      dayBuckets[day].likes.push(v.likeCount);
      dayBuckets[day].comments.push(v.commentCount);
      dayBuckets[day].shares.push(v.shareCount);
      dayBuckets[day].engagements.push(v.engagementRate);
    }
  }

  return daysOrder.map((dayName) => {
    const bucket = dayBuckets[dayName];
    const count = bucket.views.length;
    const totalViews = bucket.views.reduce((a: number, b: number) => a + b, 0);
    const meanViews = count > 0 ? Math.round(totalViews / count) : 0;
    const medianViews = Math.round(computeMedian(bucket.views));
    const meanLikes = count > 0 ? Math.round(computeMean(bucket.likes)) : 0;
    const meanComments = count > 0 ? Math.round(computeMean(bucket.comments)) : 0;
    const meanShares = count > 0 ? Math.round(computeMean(bucket.shares)) : 0;
    const meanEngagementRate = count > 0 ? Number(computeMean(bucket.engagements).toFixed(2)) : 0;

    let confidence: 'faible' | 'modérée' | 'élevée' = 'faible';
    if (count >= 5) confidence = 'élevée';
    else if (count >= 2) confidence = 'modérée';

    return {
      dayName,
      videoCount: count,
      meanViews,
      medianViews,
      meanEngagementRate,
      meanLikes,
      meanComments,
      meanShares,
      totalViews,
      confidence,
    };
  });
}

export function computeFairComparisons(
  videos: UnifiedVideoData[],
  snapshots: TikTokMetricSnapshot[] = [],
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
): FairVideoComparison[] {
  const now = Date.now();
  const snapMap: Record<string, { h24?: any; h48?: any; d7?: any }> = {};
  for (const s of snapshots) {
    if (!snapMap[s.videoId]) snapMap[s.videoId] = {};
    if (s.checkpointType === 'h24') snapMap[s.videoId].h24 = s;
    else if (s.checkpointType === 'h48') snapMap[s.videoId].h48 = s;
    else if (s.checkpointType === 'd7') snapMap[s.videoId].d7 = s;
  }

  return videos.map((v) => {
    const ageMs = Math.max(1000 * 60, now - v.timestampMs);
    const ageHours = Math.round(ageMs / (1000 * 60 * 60));
    const ageDays = Number((ageHours / 24).toFixed(1));

    const normalizedDays = Math.max(0.1, ageDays);
    const viewsPerDay = Math.round(v.viewCount / normalizedDays);
    const viewsPerHour = Number((v.viewCount / Math.max(1, ageHours)).toFixed(1));

    const date = new Date(v.timestampMs);
    const dateFormatted = new Intl.DateTimeFormat('fr-FR', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);
    const dayRaw = parts.find((p) => p.type === 'weekday')?.value || '';
    const dayName = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);
    const timeString = `${parts.find((p) => p.type === 'hour')?.value}h${parts.find((p) => p.type === 'minute')?.value}`;

    const videoSnaps = snapMap[v.id] || {};
    const hasCheckpoints = Boolean(videoSnaps.h24 || videoSnaps.h48 || videoSnaps.d7);

    let comparisonNotice = '';
    if (hasCheckpoints) comparisonNotice = 'Relevés chronologiques H+24 / J+7 enregistrés';
    else if (ageHours < 24) comparisonNotice = `Publication récente (${ageHours}h — comparaison provisoire)`;
    else comparisonNotice = `Vélocité calculée sur l'âge réel (${ageDays} jours)`;

    return {
      id: v.id,
      title: v.title,
      coverImageUrl: v.coverImageUrl,
      shareUrl: v.shareUrl,
      exactPublishedAt: dateFormatted,
      dayName,
      timeString,
      ageHours,
      ageDays,
      views: v.viewCount,
      viewsPerDay,
      viewsPerHour,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: v.shareCount,
      engagementRate: v.engagementRate,
      hasCheckpoints,
      checkpointH24: videoSnaps.h24
        ? { views: videoSnaps.h24.views, likes: videoSnaps.h24.likes, comments: videoSnaps.h24.comments }
        : undefined,
      checkpointH48: videoSnaps.h48
        ? { views: videoSnaps.h48.views, likes: videoSnaps.h48.likes, comments: videoSnaps.h48.comments }
        : undefined,
      checkpointD7: videoSnaps.d7
        ? { views: videoSnaps.d7.views, likes: videoSnaps.d7.likes, comments: videoSnaps.d7.comments }
        : undefined,
      comparisonNotice,
    };
  });
}

export function buildCompactAnalyticsPayload(params: {
  accountHandle: string;
  totalFollowers: number;
  totalLikes: number;
  videos: UnifiedVideoData[];
  days: GranularDayStat[];
  rankedSlots: GranularTimeSlotStat[];
  timeZone: string;
}) {
  const { accountHandle, totalFollowers, totalLikes, videos, days, rankedSlots, timeZone } = params;

  const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0);
  const totalInteractions = videos.reduce(
    (acc, v) => acc + (v.likeCount + v.commentCount + v.shareCount),
    0
  );
  const globalEngagementRate = safePercent(totalInteractions, totalViews, 2) ?? 0;
  const totalComments = videos.reduce((acc, v) => acc + v.commentCount, 0);
  const totalShares = videos.reduce((acc, v) => acc + v.shareCount, 0);
  const totalVideoLikes = videos.reduce((acc, v) => acc + v.likeCount, 0);

  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
  const medianViews = calculateMedian(videos.map((v) => v.viewCount));

  const sortedByViews = [...videos].sort((a, b) => b.viewCount - a.viewCount);
  const topVideos = sortedByViews.slice(0, 5).map((v) => ({
    title: v.title.slice(0, 60),
    views: v.viewCount,
    likes: v.likeCount,
    comments: v.commentCount,
    shares: v.shareCount,
    engagementRate: v.engagementRate,
    publishedAt: new Date(v.timestampMs).toLocaleDateString('fr-FR'),
  }));

  const lowestVideos = sortedByViews.slice(-3).map((v) => ({
    title: v.title.slice(0, 60),
    views: v.viewCount,
    likes: v.likeCount,
    comments: v.commentCount,
    shares: v.shareCount,
    engagementRate: v.engagementRate,
  }));

  return {
    account: {
      handle: accountHandle,
      followers: totalFollowers,
      cumulativeLikes: totalLikes,
      timeZone,
    },
    aggregates: {
      sampleSize: videos.length,
      totalViews,
      avgViews,
      medianViews,
      totalLikes: totalVideoLikes,
      totalComments,
      totalShares,
      globalEngagementRate,
      likesPer100Views: safePercent(totalVideoLikes, totalViews, 2) ?? 0,
      commentsPer100Views: safePercent(totalComments, totalViews, 2) ?? 0,
      sharesPer100Views: safePercent(totalShares, totalViews, 2) ?? 0,
    },
    daysBreakdown: days.filter((d) => d.videoCount > 0),
    topSlots: rankedSlots.filter((s) => s.videoCount >= 2).slice(0, 6),
    allTestedSlotsCount: rankedSlots.length,
    topVideos,
    lowestVideos,
  };
}

/**
 * Détection dynamique de clusters par thèmes / hashtags réellement présents dans le compte.
 */
export function detectVideoClusters(videos: TikTokOfficialVideo[]): VideoClusterGroup[] {
  if (!videos || videos.length < 2) return [];

  const tagMap: Record<string, TikTokOfficialVideo[]> = {};

  for (const v of videos) {
    const manualSubj = v.editorialMeta?.subject?.trim();
    if (manualSubj) {
      const key = `sujet:${manualSubj.toLowerCase()}`;
      if (!tagMap[key]) tagMap[key] = [];
      tagMap[key].push(v);
    }
    const tags = (v.title.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) =>
      t.toLowerCase()
    );
    for (const t of tags) {
      if (['#fyp', '#foryou', '#pourtoi', '#tiktok'].includes(t)) continue;
      if (!tagMap[t]) tagMap[t] = [];
      if (!tagMap[t].some((existing) => existing.id === v.id)) {
        tagMap[t].push(v);
      }
    }
  }

  return Object.entries(tagMap)
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6)
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.viewCount - a.viewCount);
      const top = sorted[0];
      const lowest = sorted[sorted.length - 1];
      const ratio =
        lowest.viewCount > 0 ? Number((top.viewCount / lowest.viewCount).toFixed(1)) : top.viewCount;
      const cleanTopic = key.startsWith('sujet:')
        ? `Sujet « ${key.replace('sujet:', '')} »`
        : `Mot-clé ${key}`;

      return {
        id: key.replace(/[^a-zA-Z0-9_-]/g, '_'),
        topic: cleanTopic,
        description: `${list.length} publication(s) partageant le repère ${cleanTopic}`,
        videoCount: list.length,
        topVideo: {
          id: top.id,
          title: top.title,
          viewCount: top.viewCount,
          likeCount: top.likeCount,
          engagementRate: top.engagementRate,
          duration: top.duration || 0,
          createTime: top.createTime,
          shareUrl: top.shareUrl,
          coverImageUrl: top.coverImageUrl,
        },
        lowestVideo: {
          id: lowest.id,
          title: lowest.title,
          viewCount: lowest.viewCount,
          likeCount: lowest.likeCount,
          engagementRate: lowest.engagementRate,
          duration: lowest.duration || 0,
          createTime: lowest.createTime,
          shareUrl: lowest.shareUrl,
          coverImageUrl: lowest.coverImageUrl,
        },
        viewRatio: ratio,
        varianceExplanation: `Écart observé de ${ratio}× entre le maximum (${top.viewCount.toLocaleString('fr-FR')} vues) et le minimum (${lowest.viewCount.toLocaleString('fr-FR')} vues) sur ce même repère thématique. Vérifiez l’heure de sortie, la durée et l’espacement entre publications.`,
        videos: sorted.map((v) => ({
          id: v.id,
          title: v.title,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: v.commentCount,
          shareCount: v.shareCount,
          engagementRate: v.engagementRate,
          duration: v.duration || 0,
          createTime: v.createTime,
          shareUrl: v.shareUrl,
          coverImageUrl: v.coverImageUrl,
        })),
      };
    });
}

export function computePerformanceTiers(videos: TikTokOfficialVideo[]): PerformanceTiersData {
  if (!videos || videos.length === 0) {
    return {
      p75Views: 0,
      p50Views: 0,
      p25Views: 0,
      topTier: [],
      averageTier: [],
      flopTier: [],
      topTraits: { avgDuration: 0, avgEngagement: 0, topDays: [], topHours: [], commonTags: [] },
      flopTraits: { avgDuration: 0, avgEngagement: 0, commonTags: [], rapidPostingIncidents: 0 },
    };
  }

  const viewsList = videos.map((v) => v.viewCount);
  const p75Views = Math.round(computeQuantile(viewsList, 0.75));
  const p50Views = Math.round(computeMedian(viewsList));
  const p25Views = Math.round(computeQuantile(viewsList, 0.25));

  const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount);
  const topTier = sorted.filter((v) => v.viewCount >= p75Views);
  const flopTier = sorted.filter((v) => v.viewCount <= p25Views && v.viewCount < p75Views);
  const averageTier = sorted.filter((v) => v.viewCount < p75Views && v.viewCount > p25Views);

  const avgDurationPositive = (list: TikTokOfficialVideo[]) => {
    const valid = list.filter((v) => typeof v.duration === 'number' && v.duration > 0);
    return valid.length > 0 ? Math.round(computeMean(valid.map((v) => v.duration || 0))) : 0;
  };

  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<string, number> = {};
  for (const v of topTier) {
    const d = new Date(v.createTime * 1000);
    const day = DAY_NAMES[d.getDay()];
    const hour = `${d.getHours()}h`;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  const extractTags = (list: TikTokOfficialVideo[]) => {
    const counts: Record<string, number> = {};
    list.forEach((v) => {
      const tags = (v.title.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) =>
        t.toLowerCase()
      );
      tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 5);
  };

  let rapidPostingIncidents = 0;
  const timeSortedFlops = [...flopTier].sort((a, b) => a.createTime - b.createTime);
  for (let i = 1; i < timeSortedFlops.length; i++) {
    const diffSeconds = timeSortedFlops[i].createTime - timeSortedFlops[i - 1].createTime;
    if (diffSeconds > 0 && diffSeconds < 600) rapidPostingIncidents++;
  }

  return {
    p75Views,
    p50Views,
    p25Views,
    topTier: topTier.map((v) => ({ ...v, duration: v.duration || 0 })),
    averageTier: averageTier.map((v) => ({ ...v, duration: v.duration || 0 })),
    flopTier: flopTier.map((v) => ({ ...v, duration: v.duration || 0 })),
    topTraits: {
      avgDuration: avgDurationPositive(topTier),
      avgEngagement: Number(computeMean(topTier.map((v) => v.engagementRate)).toFixed(2)),
      topDays: Object.entries(dayCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([d]) => d)
        .slice(0, 3),
      topHours: Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([h]) => h)
        .slice(0, 3),
      commonTags: extractTags(topTier),
    },
    flopTraits: {
      avgDuration: avgDurationPositive(flopTier),
      avgEngagement: Number(computeMean(flopTier.map((v) => v.engagementRate)).toFixed(2)),
      commonTags: extractTags(flopTier),
      rapidPostingIncidents,
    },
  };
}

export function computeCausalDiagnosis(
  video: TikTokOfficialVideo,
  allVideos: TikTokOfficialVideo[],
  _retention?: VideoRetentionData
): VideoCausalDiagnosis {
  const views = video.viewCount;
  const likes = video.likeCount;
  const engagement = safePercent(likes + video.commentCount + video.shareCount, views, 2) ?? 0;
  const duration = video.duration || 0;

  const accountMedianViews =
    allVideos.length > 0 ? Math.round(computeMedian(allVideos.map((v) => v.viewCount))) : views;
  const accountMedianEng =
    allVideos.length > 0
      ? Number(computeMedian(allVideos.map((v) => v.engagementRate)).toFixed(2))
      : engagement;

  const nearbyPosts = allVideos.filter(
    (v) => v.id !== video.id && Math.abs(v.createTime - video.createTime) < 900
  );

  if (accountMedianViews > 0 && views >= Math.max(accountMedianViews * 2.5, 1000)) {
    return {
      category: 'viral_hit',
      categoryLabel: 'Très au-dessus de votre palier médian',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      summary: `${views.toLocaleString('fr-FR')} vues mesurées (médiane du compte : ${accountMedianViews.toLocaleString('fr-FR')} vues) · ${engagement}% d'engagement.`,
      reachStatus: 'Portée supérieure à votre base habituelle',
      audienceReaction: `${likes.toLocaleString('fr-FR')} likes · ${video.commentCount} comms · ${video.shareCount} partages`,
      hypotheses: [
        duration > 0
          ? `Durée de ${duration}s bien adaptée à l'attention retenue.`
          : "Sujet ou accroche ayant retenu les premiers spectateurs au-delà du groupe d'essai.",
      ],
      actionableRecommendations: [
        'Documenter l’accroche, l’angle et le son dans « Détails » pour le comparer à vos vidéos sous le palier.',
      ],
    };
  }

  if (views >= accountMedianViews && views > 0) {
    return {
      category: 'high_performer',
      categoryLabel: 'Au-dessus de votre médiane',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      summary: `${views.toLocaleString('fr-FR')} vues (${engagement}% d'engagement), au niveau ou au-dessus de votre médiane (${accountMedianViews.toLocaleString('fr-FR')} vues).`,
      reachStatus: 'Distribution conforme ou supérieure au palier du compte',
      audienceReaction: `Réaction cohérente (${likes} likes, ${video.commentCount} comms).`,
      hypotheses: ['Sujet et format alignés avec les attentes de votre audience actuelle.'],
      actionableRecommendations: [
        'Comparer le taux de partages et commentaires aux vidéos similaires.',
      ],
    };
  }

  if (nearbyPosts.length > 0 && views < Math.max(accountMedianViews * 0.4, 150)) {
    return {
      category: 'duplicate_suppressed',
      categoryLabel: 'Publication rapprochée (< 15 min)',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      summary: `${views.toLocaleString('fr-FR')} vues, publiée à moins de 15 minutes d'une autre vidéo du compte.`,
      reachStatus: 'Concurrence interne possible entre sorties rapprochées',
      audienceReaction: 'Faible exposition mesurée.',
      hypotheses: [
        "Enchaîner plusieurs vidéos en moins de 15 minutes réduit souvent la distribution initiale d'au moins une d'entre elles.",
      ],
      actionableRecommendations: [
        'Espacer les prochaines sorties de 3 heures minimum et varier nettement l’accroche.',
      ],
    };
  }

  if (engagement >= Math.max(accountMedianEng, 4) && views < accountMedianViews) {
    return {
      category: 'distribution_limited',
      categoryLabel: 'Bon taux d’interaction / Portée sous la médiane',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      summary: `${engagement}% d'engagement (médiane du compte : ${accountMedianEng}%), mais seulement ${views.toLocaleString('fr-FR')} vues.`,
      reachStatus: 'Distribution restreinte malgré une bonne réaction relative',
      audienceReaction: 'Les spectateurs exposés ont interagi positivement.',
      hypotheses: [
        "L'accroche des 2 premières secondes ou le timing n'ont peut-être pas suffi à élargir la cohorte initiale.",
      ],
      actionableRecommendations: [
        'Compléter les stats de rétention depuis TikTok Studio pour localiser le moment du décrochage.',
      ],
    };
  }

  return {
    category: 'retention_flop',
    categoryLabel: 'Sous le palier médian',
    badgeColor: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    summary: `${views.toLocaleString('fr-FR')} vues et ${engagement}% d'engagement (médiane : ${accountMedianViews.toLocaleString('fr-FR')} vues).`,
    reachStatus: 'Distribution limitée',
    audienceReaction: `${likes} likes · ${video.commentCount} comms · ${video.shareCount} partages`,
    hypotheses: ['Accroche initiale, sujet moins recherché ou timing moins favorable à vérifier.'],
    actionableRecommendations: [
      'Tester une autre accroche textuelle dès la première seconde sur ce sujet.',
    ],
  };
}

export function analyzeHashtagPerformance(videos: TikTokOfficialVideo[]) {
  const map: Record<string, { count: number; views: number[]; engagements: number[] }> = {};

  for (const v of videos) {
    const tags = (v.title.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) =>
      t.toLowerCase()
    );
    for (const t of tags) {
      if (!map[t]) map[t] = { count: 0, views: [], engagements: [] };
      map[t].count++;
      map[t].views.push(v.viewCount);
      map[t].engagements.push(v.engagementRate);
    }
  }

  return Object.entries(map)
    .filter(([, data]) => data.count >= 2)
    .map(([tag, data]) => {
      const totalViews = data.views.reduce((a, b) => a + b, 0);
      const avgViews = Math.round(totalViews / data.count);
      const avgEngagement = Number(computeMean(data.engagements).toFixed(2));

      let category: 'niche' | 'intent' | 'generic' = 'niche';
      if (['#fyp', '#foryou', '#fpy', '#pourtoi'].includes(tag)) category = 'generic';
      else if (tag.includes('search') || tag.includes('tuto')) category = 'intent';

      return { tag, usageCount: data.count, totalViews, avgViews, avgEngagement, category };
    })
    .sort((a, b) => b.avgViews - a.avgViews);
}

/**
 * Générateur déterministe pur TypeScript (Couche 1 + Couche 2) — 0 donnée fictive.
 */
export function buildDeterministicCoachReport(compactSummary: any): TikTokCoachReport {
  const { account, aggregates, topSlots, topVideos = [], lowestVideos = [] } = compactSummary || {};
  const sampleSize: number = aggregates?.sampleSize ?? 0;
  const handle: string = account?.handle || 'Compte non connecté';
  const totalViews: number = aggregates?.totalViews ?? 0;
  const engRate: number = aggregates?.globalEngagementRate ?? 0;
  const medianViews: number = aggregates?.medianViews ?? 0;
  const commentsPer100: number = aggregates?.commentsPer100Views ?? 0;
  const sharesPer100: number = aggregates?.sharesPer100Views ?? 0;

  if (sampleSize === 0) {
    return {
      generatedAt: new Date().toISOString(),
      dataFingerprint: 'empty_0',
      accountHandle: handle,
      sampleSize: 0,
      sampleConfidence: 'faible',
      methodologyWarning:
        'Aucune vidéo synchronisée pour le moment. Connectez et synchronisez votre compte TikTok pour obtenir une analyse basée sur vos données réelles.',
      executiveSummary:
        'En attente de données réelles. Aucun ratio ou recommandation chiffrée n’est affiché tant qu’aucune publication n’est disponible.',
      whatWorks: [],
      whatCanImprove: [],
      recommendedActions: [
        {
          priority: 'haute',
          title: 'Synchroniser vos publications du compte',
          action: 'Ouvrez la connexion du compte ou lancez une synchronisation dans Analytics.',
          expectedImpact: 'Alimentation complète des calculs statistiques et stratégiques.',
        },
      ],
      faqAnswers: {
        q1_engagement: 'Aucune donnée disponible pour calculer le taux d’engagement.',
        q2_likes: 'Aucune donnée disponible.',
        q3_comments: 'Aucune donnée disponible.',
        q4_shares: 'Aucune donnée disponible.',
        q5_performance_diff: 'Aucune donnée disponible.',
        q6_effective_types: 'Aucune donnée disponible.',
        q7_best_hours: 'Aucun créneau mesuré.',
        q8_mistakes_to_avoid: 'Synchronisez au moins 4 vidéos pour détecter des tendances fiables.',
      },
    };
  }

  const bestVideo = topVideos[0];
  const worstVideo = lowestVideos[0];
  const bestSlot = Array.isArray(topSlots) && topSlots.length > 0 ? topSlots[0] : null;

  return {
    generatedAt: new Date().toISOString(),
    dataFingerprint: `fp_${sampleSize}_${totalViews}`,
    accountHandle: handle,
    sampleSize,
    sampleConfidence: sampleSize >= 15 ? 'élevée' : sampleSize >= 5 ? 'modérée' : 'faible',
    methodologyWarning: `Rapport déterministe calculé exclusivement sur ${sampleSize} publication(s) réelle(s) de ${handle}. Médiane = ${medianViews.toLocaleString('fr-FR')} vues · Engagement global consolidé = ${engRate}%.`,
    executiveSummary: `Sur ${sampleSize} publications mesurées pour ${handle}, le compte totalise ${totalViews.toLocaleString('fr-FR')} vues cumulées (différent des spectateurs uniques), une médiane de ${medianViews.toLocaleString('fr-FR')} vues par vidéo et un taux d'engagement global consolidé de ${engRate}%.`,
    whatWorks: [
      ...(bestVideo
        ? [
            {
              title: 'Meilleure publication observée sur le compte',
              observation: `« ${bestVideo.title} » atteint ${Number(bestVideo.views).toLocaleString('fr-FR')} vues et ${bestVideo.likes} likes.`,
              metricProof: `Engagement mesuré : ${bestVideo.engagementRate}% (vs médiane ${medianViews.toLocaleString('fr-FR')} vues).`,
              hypothesis:
                'À croiser avec les informations éditoriales (sujet, accroche, durée, son) pour isoler ce qui peut être testé à nouveau.',
            },
          ]
        : []),
      ...(bestSlot
        ? [
            {
              title: `Créneau horaire confirmé : ${bestSlot.slotLabel}`,
              observation: `${bestSlot.videoCount} publication(s) sur ce créneau affichent une médiane de ${Number(bestSlot.medianViews).toLocaleString('fr-FR')} vues.`,
              metricProof: `Taux d'engagement moyen observé : ${bestSlot.meanEngagementRate}%.`,
              hypothesis: 'Créneau méritant d’être re-testé de façon contrôlée.',
            },
          ]
        : []),
    ],
    whatCanImprove: [
      {
        title: 'Activation des commentaires et partages par vue',
        observation: `Taux consolidés actuels : ${commentsPer100}% de commentaires et ${sharesPer100}% de partages rapportés aux vues.`,
        metricProof: `Basé sur ${totalViews.toLocaleString('fr-FR')} vues mesurées.`,
        actionableTip:
          'Comparer vos meilleures vidéos en commentaires/partages avec les vidéos médianes afin de tester une question plus précise ou une fin plus mémorable.',
      },
      ...(worstVideo && bestVideo && bestVideo.views > worstVideo.views * 3
        ? [
            {
              title: 'Écart important entre meilleures et plus faibles portées',
              observation: `Écart observé entre « ${bestVideo.title} » (${Number(bestVideo.views).toLocaleString('fr-FR')} vues) et « ${worstVideo.title} » (${Number(worstVideo.views).toLocaleString('fr-FR')} vues).`,
              metricProof: 'Amplitude supérieure à 3× entre le haut et le bas de la distribution.',
              actionableTip:
                'Vérifier dans TikTok Studio la rétention des 3 premières secondes et l’espacement entre publications.',
            },
          ]
        : []),
    ],
    recommendedActions: [
      {
        priority: 'haute',
        title: 'Comparer le groupe au-dessus du palier à la médiane',
        action:
          'Utilisez la section « Comment passer au niveau supérieur ? » et renseignez Sujet, Accroche et Durée sur vos vidéos phares.',
        expectedImpact: 'Identification de variables concrètes à tester une par une.',
      },
      {
        priority: 'moyenne',
        title: 'Compléter la conversion abonnés & favoris depuis TikTok Studio',
        action:
          'Saisissez les favoris et abonnés attribués dans « Détails » pour distinguer portée brute et construction réelle de communauté.',
        expectedImpact: 'Pilotage réel de la conversion abonnés impossible via l’API seule.',
      },
    ],
    faqAnswers: {
      q1_engagement: `Le taux d'engagement global consolidé est de ${engRate}% sur ${sampleSize} vidéo(s).`,
      q2_likes: `Taux global likes/vues : ${aggregates?.likesPer100Views ?? 0}%. Comparez toujours ce ratio à votre propre médiane par vidéo.`,
      q3_comments: `Taux global commentaires/vues : ${commentsPer100}%. Testez une question concrète liée au sujet en légende ou à l'écran.`,
      q4_shares: `Taux global partages/vues : ${sharesPer100}%. Les vidéos utiles ou émotionnellement marquantes génèrent davantage d'envois privés.`,
      q5_performance_diff: bestVideo && worstVideo
        ? `Entre ${Number(bestVideo.views).toLocaleString('fr-FR')} et ${Number(worstVideo.views).toLocaleString('fr-FR')} vues, vérifiez les écarts de sujet, d'accroche, de durée et d'intervalle de publication.`
        : 'Pas assez de vidéos contrastées pour comparer.',
      q6_effective_types:
        'Consultez le classement multi-critères et les fiches éditoriales par sujet dans Analytics.',
      q7_best_hours: bestSlot
        ? `Créneau le plus solide observé (N ≥ 2) : ${bestSlot.slotLabel} (médiane ${Number(bestSlot.medianViews).toLocaleString('fr-FR')} vues).`
        : 'Pas encore assez de vidéos regroupées sur un même créneau (minimum 2 par créneau requis).',
      q8_mistakes_to_avoid:
        'Éviter d’enchaîner des publications très rapprochées sur un sujet identique et éviter de juger une vidéo sans comparer à la médiane du compte.',
    },
  };
}

export interface HashtagGroupPerformance {
  id: string;
  label: string;
  primaryTag: string;
  relatedTags: string[];
  videoCount: number;
  totalViews: number;
  medianViews: number;
  avgVelocityPerDay: number;
  avgEngagementRate: number;
  viewsSharePercent: number;
  color: string;
  isOtherBucket?: boolean;
}

export interface HashtagPerformanceResult {
  groups: HashtagGroupPerformance[];
  totalExplicitTagsDetected: number;
  taggedVideosCount: number;
  isKeywordFallback: boolean;
}

const HASHTAG_GROUP_COLORS = [
  '#fb7185', // rose
  '#fbbf24', // amber
  '#818cf8', // indigo
  '#34d399', // emerald
  '#38bdf8', // sky
  '#c084fc', // purple
  '#71717a', // zinc (Autres)
];

const KEYWORD_STOPWORDS = new Set([
  'pour', 'avec', 'dans', 'sans', 'plus', 'tout', 'tous', 'cette', 'vous', 'nous',
  'mais', 'donc', 'alors', 'comme', 'quand', 'fait', 'faire', 'etre', 'être', 'avoir',
  'sont', 'était', 'video', 'vidéo', 'tiktok', 'part', 'partie', 'just', 'that', 'this',
  'with', 'from', 'your', 'about', 'what', 'when', 'they', 'them', 'have', 'here',
  'très', 'bien', 'encore', 'aussi', 'même', 'leurs', 'notre', 'votre', 'entre',
]);

function extractTopicFallbackTags(video: UnifiedVideoData): string[] {
  const source = `${video.title || ''} ${video.description || ''}`
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const words = source
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !KEYWORD_STOPWORDS.has(w) && !/^\d+$/.test(w));
  return Array.from(new Set(words)).slice(0, 3).map((w) => `#${w}`);
}

/**
 * Groups the account's best-performing hashtags into smart clusters (not a cluttered 1-by-1 dump)
 * so circular charts show the real top hashtag families driving views and velocity.
 */
export function computeHashtagPerformanceGroups(
  videos: UnifiedVideoData[],
  maxMainGroups: number = 5
): HashtagPerformanceResult {
  if (!videos || videos.length === 0) {
    return {
      groups: [],
      totalExplicitTagsDetected: 0,
      taggedVideosCount: 0,
      isKeywordFallback: false,
    };
  }

  const nowMs = Date.now();
  const explicitTaggedCount = videos.filter((v) => v.hashtags && v.hashtags.length > 0).length;
  const isKeywordFallback = explicitTaggedCount === 0;

  const videoEntries = videos.map((v) => {
    const ageDays = Math.max(0.25, (nowMs - v.timestampMs) / (1000 * 60 * 60 * 24));
    const velocity = v.viewCount / ageDays;
    const tags = isKeywordFallback
      ? extractTopicFallbackTags(v)
      : (v.hashtags || []);
    return { video: v, tags, velocity };
  });

  // Count stats per tag
  const tagMap = new Map<
    string,
    {
      tag: string;
      videoIds: Set<string>;
      views: number[];
      velocities: number[];
      engagements: number[];
      coOccurrences: Map<string, number>;
    }
  >();

  for (const entry of videoEntries) {
    for (const tag of entry.tags) {
      let bucket = tagMap.get(tag);
      if (!bucket) {
        bucket = {
          tag,
          videoIds: new Set(),
          views: [],
          velocities: [],
          engagements: [],
          coOccurrences: new Map(),
        };
        tagMap.set(tag, bucket);
      }
      if (!bucket.videoIds.has(entry.video.id)) {
        bucket.videoIds.add(entry.video.id);
        bucket.views.push(entry.video.viewCount);
        bucket.velocities.push(entry.velocity);
        bucket.engagements.push(entry.video.engagementRate);
        for (const other of entry.tags) {
          if (other !== tag) {
            bucket.coOccurrences.set(other, (bucket.coOccurrences.get(other) || 0) + 1);
          }
        }
      }
    }
  }

  const allTags = Array.from(tagMap.values());
  if (allTags.length === 0) {
    return {
      groups: [],
      totalExplicitTagsDetected: 0,
      taggedVideosCount: explicitTaggedCount,
      isKeywordFallback,
    };
  }

  // Rank tags by weighted score (total views + velocity boost + recurrence)
  const rankedTags = allTags
    .map((item) => {
      const totalViews = item.views.reduce((s, n) => s + n, 0);
      const medianViews = Math.round(computeMedian(item.views));
      const avgVelocity = Math.round(computeMean(item.velocities));
      const avgEng = Number(computeMean(item.engagements).toFixed(2));
      const score = totalViews * 0.65 + avgVelocity * item.views.length * 0.35;
      return { ...item, totalViews, medianViews, avgVelocity, avgEng, score };
    })
    .sort((a, b) => b.score - a.score);

  // Assign each video primarily to its strongest hashtag cluster so circular chart slices sum cleanly to 100%
  const chosenPrimaryTags: typeof rankedTags = [];
  const assignedVideoIds = new Set<string>();

  for (const candidate of rankedTags) {
    if (chosenPrimaryTags.length >= maxMainGroups) break;
    // Skip if almost all videos of this tag are already represented by a higher-ranked co-occurring cluster
    const unassignedCount = Array.from(candidate.videoIds).filter(
      (id) => !assignedVideoIds.has(id)
    ).length;
    if (unassignedCount === 0) continue;
    chosenPrimaryTags.push(candidate);
    candidate.videoIds.forEach((id) => assignedVideoIds.add(id));
  }

  const rawGroups: Array<Omit<HashtagGroupPerformance, 'viewsSharePercent' | 'color'>> = [];

  // Build exclusive clusters for clean circular slices
  const claimedVideos = new Set<string>();
  for (const primary of chosenPrimaryTags) {
    const clusterEntries = videoEntries.filter(
      (e) => !claimedVideos.has(e.video.id) && e.tags.includes(primary.tag)
    );
    if (clusterEntries.length === 0) continue;
    clusterEntries.forEach((e) => claimedVideos.add(e.video.id));

    const coCounts = new Map<string, number>();
    for (const e of clusterEntries) {
      for (const t of e.tags) {
        if (t !== primary.tag) {
          coCounts.set(t, (coCounts.get(t) || 0) + 1);
        }
      }
    }
    const relatedTags = Array.from(coCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    const viewsList = clusterEntries.map((e) => e.video.viewCount);
    const totalViews = viewsList.reduce((s, n) => s + n, 0);
    const medianViews = Math.round(computeMedian(viewsList));
    const avgVelocityPerDay = Math.round(computeMean(clusterEntries.map((e) => e.velocity)));
    const avgEngagementRate = Number(
      computeMean(clusterEntries.map((e) => e.video.engagementRate)).toFixed(2)
    );

    const clusterLabel =
      relatedTags.length > 0 ? `${primary.tag} · ${relatedTags[0]}` : primary.tag;

    rawGroups.push({
      id: `grp_${primary.tag}`,
      label: clusterLabel,
      primaryTag: primary.tag,
      relatedTags,
      videoCount: clusterEntries.length,
      totalViews,
      medianViews,
      avgVelocityPerDay,
      avgEngagementRate,
    });
  }

  // Remaining videos (other hashtags or untagged)
  const remainingEntries = videoEntries.filter((e) => !claimedVideos.has(e.video.id));
  if (remainingEntries.length > 0) {
    const remViews = remainingEntries.map((e) => e.video.viewCount);
    const remTags = Array.from(
      new Set(remainingEntries.flatMap((e) => e.tags))
    ).slice(0, 3);
    rawGroups.push({
      id: 'grp_other',
      label: isKeywordFallback ? 'Autres thèmes' : 'Autres # / Sans #',
      primaryTag: isKeywordFallback ? 'Autres thèmes' : 'Autres #',
      relatedTags: remTags,
      videoCount: remainingEntries.length,
      totalViews: remViews.reduce((s, n) => s + n, 0),
      medianViews: Math.round(computeMedian(remViews)),
      avgVelocityPerDay: Math.round(computeMean(remainingEntries.map((e) => e.velocity))),
      avgEngagementRate: Number(
        computeMean(remainingEntries.map((e) => e.video.engagementRate)).toFixed(2)
      ),
      isOtherBucket: true,
    });
  }

  const grandTotalViews = Math.max(
    1,
    rawGroups.reduce((s, g) => s + g.totalViews, 0)
  );

  const groups: HashtagGroupPerformance[] = rawGroups.map((g, idx) => ({
    ...g,
    viewsSharePercent: Number(((g.totalViews / grandTotalViews) * 100).toFixed(1)),
    color: g.isOtherBucket
      ? HASHTAG_GROUP_COLORS[HASHTAG_GROUP_COLORS.length - 1]
      : HASHTAG_GROUP_COLORS[idx % (HASHTAG_GROUP_COLORS.length - 1)],
  }));

  return {
    groups,
    totalExplicitTagsDetected: isKeywordFallback ? 0 : allTags.length,
    taggedVideosCount: explicitTaggedCount,
    isKeywordFallback,
  };
}

export interface AgeVelocityBucket {
  id: string;
  label: string;
  videoCount: number;
  avgVelocityPerDay: number;
  totalViews: number;
  color: string;
}

export function computeVelocityByAgeBuckets(
  comparisons: FairVideoComparison[]
): AgeVelocityBucket[] {
  const defs = [
    { id: 'fresh', label: 'Récentes (< 3j)', match: (d: number) => d < 3, color: '#fb7185' },
    { id: 'week', label: '3 à 14 jours', match: (d: number) => d >= 3 && d < 14, color: '#fbbf24' },
    { id: 'month', label: '14 à 30 jours', match: (d: number) => d >= 14 && d < 30, color: '#818cf8' },
    { id: 'evergreen', label: 'Catalogue (> 30j)', match: (d: number) => d >= 30, color: '#34d399' },
  ];

  return defs
    .map((def) => {
      const subset = comparisons.filter((c) => def.match(c.ageDays));
      const avgVelocityPerDay =
        subset.length > 0
          ? Math.round(subset.reduce((s, c) => s + c.viewsPerDay, 0) / subset.length)
          : 0;
      const totalViews = subset.reduce((s, c) => s + c.views, 0);
      return {
        id: def.id,
        label: def.label,
        videoCount: subset.length,
        avgVelocityPerDay,
        totalViews,
        color: def.color,
      };
    })
    .filter((b) => b.videoCount > 0);
}

