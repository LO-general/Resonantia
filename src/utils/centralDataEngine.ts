import {
  CentralAccountAnalytics,
  CentralVideoRates,
  ContentMode,
  ContentNature,
  CounterCorrectionLog,
  EngagementStrategyReport,
  EnrichedVideoMetric,
  FollowerGrowthAnalysis,
  FollowerHistoryEntry,
  LevelUpFactorComparison,
  LevelUpReport,
  PeriodPlateauStats,
  TikTokAccountData,
  TikTokMetricSnapshot,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
  ViewPlateauAnalysis,
} from '../types';

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// ============================================================================
// MATHEMATICAL PRIMITIVES (STRICT DIVISION-BY-ZERO & MISSING-DATA PROTECTION)
// ============================================================================

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

export function safePercent(numerator: number, denominator: number, decimals = 2): number | null {
  const ratio = safeDivide(numerator, denominator);
  if (ratio === null) return null;
  return Number((ratio * 100).toFixed(decimals));
}

export function computeMean(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function computeMedian(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeQuantile(values: number[], q: number): number {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] !== undefined ? sorted[base + 1] : sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function computeIQR(values: number[]): { q1: number; q3: number; iqr: number } {
  const q1 = computeQuantile(values, 0.25);
  const q3 = computeQuantile(values, 0.75);
  return { q1, q3, iqr: Math.max(0, q3 - q1) };
}

export function computeMAD(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  const med = computeMedian(valid);
  const absDevs = valid.map((v) => Math.abs(v - med));
  return computeMedian(absDevs);
}

// ============================================================================
// VIDEO CLASSIFICATION & RATE COMPUTATION
// ============================================================================

export function inferVideoContentNature(
  video: TikTokOfficialVideo,
  editorialMap?: Record<string, VideoEditorialMetadata>
): ContentNature {
  const override = editorialMap?.[video.id]?.contentNature || video.editorialMeta?.contentNature;
  if (override === 'creation' || override === 'repost') return override;
  if (video.contentNature === 'creation' || video.contentNature === 'repost') return video.contentNature;

  const text = `${video.title} ${video.videoDescription}`.toLowerCase();
  if (
    text.includes('#repost') ||
    text.includes('crédit :') ||
    text.includes('credit:') ||
    text.includes('republication') ||
    text.includes('repartage')
  ) {
    return 'repost';
  }
  return 'creation';
}

export function computeVideoRates(
  video: TikTokOfficialVideo,
  editorialMeta?: VideoEditorialMetadata
): CentralVideoRates {
  const views = video.viewCount;
  const favorites =
    editorialMeta?.manualFavoritesCount !== undefined && editorialMeta.manualFavoritesCount !== null
      ? editorialMeta.manualFavoritesCount
      : video.favoriteCount ?? null;

  const attributedFollowers =
    editorialMeta?.manualAttributedFollowers !== undefined &&
    editorialMeta.manualAttributedFollowers !== null
      ? editorialMeta.manualAttributedFollowers
      : video.attributedFollowers ?? null;

  const likeRate = safePercent(video.likeCount, views, 2);
  const commentRate = safePercent(video.commentCount, views, 2);
  const shareRate = safePercent(video.shareCount, views, 2);
  const favoriteRate = favorites !== null ? safePercent(favorites, views, 2) : null;
  const engagementRate = safePercent(
    video.likeCount + video.commentCount + video.shareCount,
    views,
    2
  );
  const engagementWithFavoritesRate =
    favorites !== null
      ? safePercent(video.likeCount + video.commentCount + video.shareCount + favorites, views, 2)
      : null;
  const followerConversionRate =
    attributedFollowers !== null ? safePercent(attributedFollowers, views, 3) : null;

  return {
    likeRate,
    commentRate,
    shareRate,
    favoriteRate,
    engagementRate,
    engagementWithFavoritesRate,
    followerConversionRate,
  };
}

// ============================================================================
// VIEW PLATEAU & PERIOD EVOLUTION DETECTION (PARTIE 4.1)
// ============================================================================

export function detectViewPlateaus(videos: TikTokOfficialVideo[]): ViewPlateauAnalysis {
  const sortedAsc = videos
    .filter((v) => v.viewCountStatus !== 'not_yet_collected')
    .slice()
    .sort((a, b) => a.createTime - b.createTime);

  const n = sortedAsc.length;
  if (n < 4) {
    const viewsList = sortedAsc.map((v) => v.viewCount);
    const overallMedianViews = Math.round(computeMedian(viewsList));
    const overallMeanViews = Math.round(computeMean(viewsList));
    return {
      sampleSize: n,
      hasSufficientData: false,
      overallMeanViews,
      overallMedianViews,
      overallIqrViews: Math.round(computeIQR(viewsList).iqr),
      overallMadViews: Math.round(computeMAD(viewsList)),
      outlierThreshold: 0,
      outlierVideos: [],
      periods: [],
      trendStatus: 'donnees_insuffisantes',
      trendHeadline: 'Échantillon insuffisant pour détecter un palier durable',
      trendExplanation: `Le moteur exige au moins 4 publications datées avec vues mesurées pour distinguer deux périodes (${n} disponible${n > 1 ? 's' : ''}).`,
      previousTypicalViews: null,
      currentTypicalViews: n > 0 ? overallMedianViews : null,
      deltaPercentage: null,
    };
  }

  const allViews = sortedAsc.map((v) => v.viewCount);
  const overallMeanViews = Math.round(computeMean(allViews));
  const overallMedianViews = Math.round(computeMedian(allViews));
  const { q1, q3, iqr } = computeIQR(allViews);
  const mad = Math.round(computeMAD(allViews));
  const tukeyUpper = q3 + 1.5 * iqr;
  const robustUpper = overallMedianViews > 0 ? Math.max(tukeyUpper, overallMedianViews * 3) : tukeyUpper;
  const outlierThreshold = Math.round(robustUpper);

  const outlierVideos = sortedAsc
    .filter((v) => outlierThreshold > 0 && v.viewCount >= outlierThreshold && v.viewCount > overallMedianViews * 2.2)
    .map((v) => ({
      id: v.id,
      title: v.title || 'Sans titre',
      views: v.viewCount,
      dateLabel: new Date(v.createTime * 1000).toLocaleDateString('fr-FR'),
    }));

  const buildPeriodStats = (label: string, subset: TikTokOfficialVideo[]): PeriodPlateauStats => {
    const views = subset.map((v) => v.viewCount);
    const nonOutliers = views.filter((x) => !(outlierThreshold > 0 && x >= outlierThreshold && x > overallMedianViews * 2.2));
    return {
      periodLabel: label,
      videoCount: subset.length,
      meanViews: Math.round(computeMean(views)),
      medianViews: Math.round(computeMedian(views)),
      iqrViews: Math.round(computeIQR(views).iqr),
      madViews: Math.round(computeMAD(views)),
      outlierCount: views.length - nonOutliers.length,
      outlierThreshold,
      medianWithoutOutliers: Math.round(computeMedian(nonOutliers.length > 0 ? nonOutliers : views)),
    };
  };

  // Split chronologically into halves (or 3 periods when >= 18 videos)
  const periods: PeriodPlateauStats[] = [];
  if (n >= 18) {
    const chunk = Math.floor(n / 3);
    periods.push(buildPeriodStats('Période ancienne (1/3)', sortedAsc.slice(0, chunk)));
    periods.push(buildPeriodStats('Période intermédiaire (2/3)', sortedAsc.slice(chunk, chunk * 2)));
    periods.push(buildPeriodStats('Période récente (3/3)', sortedAsc.slice(chunk * 2)));
  } else {
    const mid = Math.floor(n / 2);
    periods.push(buildPeriodStats('Première moitié historique', sortedAsc.slice(0, mid)));
    periods.push(buildPeriodStats('Moitié la plus récente', sortedAsc.slice(mid)));
  }

  const prev = periods[periods.length - 2];
  const curr = periods[periods.length - 1];
  const prevBase = prev.medianWithoutOutliers;
  const currBase = curr.medianWithoutOutliers;

  const deltaPct =
    prevBase > 0 ? Number((((currBase - prevBase) / prevBase) * 100).toFixed(1)) : null;

  // Check if recent mean jumped only because of outliers
  const recentRawJumpPct =
    prev.meanViews > 0 ? ((curr.meanViews - prev.meanViews) / prev.meanViews) * 100 : 0;

  let trendStatus: ViewPlateauAnalysis['trendStatus'] = 'stagnation';
  let trendHeadline = '';
  let trendExplanation = '';

  if (deltaPct !== null && deltaPct >= 20 && curr.videoCount >= 3) {
    trendStatus = 'progression_durable';
    trendHeadline = `Progression durable détectée : palier passé d'environ ${prevBase.toLocaleString('fr-FR')} à ${currBase.toLocaleString('fr-FR')} vues médianes (+${deltaPct}%)`;
    trendExplanation = `En excluant les pics viraux isolés (seuil >= ${outlierThreshold.toLocaleString('fr-FR')} vues), la médiane hors valeurs exceptionnelles a augmenté de ${prevBase.toLocaleString('fr-FR')} à ${currBase.toLocaleString('fr-FR')} vues. Ce décalage reflète une élévation réelle du niveau habituel du compte.`;
  } else if (recentRawJumpPct >= 35 && (deltaPct === null || deltaPct < 15) && curr.outlierCount > 0) {
    trendStatus = 'pic_isole';
    trendHeadline = 'Hausse portée par une ou plusieurs vidéos exceptionnelles (palier médian stable)';
    trendExplanation = `La moyenne récente monte (+${recentRawJumpPct.toFixed(0)}%), mais la médiane hors pics viraux reste autour de ${currBase.toLocaleString('fr-FR')} vues (contre ${prevBase.toLocaleString('fr-FR')} précédemment). Un succès viral unique ne garantit pas encore un changement durable du plancher de vues.`;
  } else if (deltaPct !== null && deltaPct <= -20 && curr.videoCount >= 3) {
    trendStatus = 'baisse_recente';
    trendHeadline = `Repli du palier typique récent (${prevBase.toLocaleString('fr-FR')} → ${currBase.toLocaleString('fr-FR')} vues médianes, ${deltaPct}%)`;
    trendExplanation = `Les publications récentes affichent une médiane inférieure à la période précédente. Vérifiez l'espacement entre publications, l'accroche ou le changement de format avant toute conclusion hâtive.`;
  } else {
    trendStatus = 'stagnation';
    trendHeadline = `Palier stable autour de ${currBase.toLocaleString('fr-FR')} vues médianes (dispersion IQR : ${Math.round(iqr).toLocaleString('fr-FR')})`;
    trendExplanation = `Entre les périodes comparées (${prevBase.toLocaleString('fr-FR')} vs ${currBase.toLocaleString('fr-FR')} vues hors outliers), le niveau habituel varie de moins de 20%. Pour passer au niveau supérieur, comparez les vidéos au-dessus du palier aux vidéos de base.`;
  }

  return {
    sampleSize: n,
    hasSufficientData: true,
    overallMeanViews,
    overallMedianViews,
    overallIqrViews: Math.round(iqr),
    overallMadViews: mad,
    outlierThreshold,
    outlierVideos,
    periods,
    trendStatus,
    trendHeadline,
    trendExplanation,
    previousTypicalViews: prevBase,
    currentTypicalViews: currBase,
    deltaPercentage: deltaPct,
  };
}

// ============================================================================
// « COMMENT PASSER AU NIVEAU SUPÉRIEUR ? » (PARTIE 4.2)
// ============================================================================

export function computeLevelUpAnalysis(
  videos: TikTokOfficialVideo[],
  editorialMap?: Record<string, VideoEditorialMetadata>,
  snapshotsMap?: Record<string, TikTokMetricSnapshot[]>
): LevelUpReport {
  const correlationWarning =
    'Avertissement méthodologique : une caractéristique plus fréquente dans vos meilleures vidéos indique une association statistique observée, jamais une preuve de causalité directe. Seule une expérimentation contrôlée permet de la confirmer.';

  if (videos.length < 4) {
    return {
      hasSufficientData: false,
      baselineMedianViews: videos.length > 0 ? Math.round(computeMedian(videos.map((v) => v.viewCount))) : 0,
      abovePlateauThreshold: 0,
      abovePlateauVideos: [],
      factorComparisons: [],
      missingManualFieldsNotice: 'Au moins 4 vidéos synchronisées sont nécessaires pour isoler le groupe au-dessus du palier.',
      correlationWarning,
      proposedExperiments: [],
    };
  }

  const allViews = videos.map((v) => v.viewCount);
  const baselineMedian = Math.round(computeMedian(allViews));
  const q3 = computeQuantile(allViews, 0.75);
  const aboveThreshold = Math.max(Math.round(baselineMedian * 1.35), Math.round(q3));

  const aboveVideos = videos.filter((v) => v.viewCount >= aboveThreshold).sort((a, b) => b.viewCount - a.viewCount);
  const baselineVideos = videos.filter((v) => v.viewCount < aboveThreshold);

  const hasDurationAbove = aboveVideos.filter((v) => typeof v.duration === 'number' && v.duration > 0);
  const hasDurationBase = baselineVideos.filter((v) => typeof v.duration === 'number' && v.duration > 0);

  const avgDurationAbove =
    hasDurationAbove.length > 0 ? Math.round(computeMean(hasDurationAbove.map((v) => v.duration || 0))) : null;
  const avgDurationBase =
    hasDurationBase.length > 0 ? Math.round(computeMean(hasDurationBase.map((v) => v.duration || 0))) : null;

  const avgShareRateAbove = computeMedian(
    aboveVideos.map((v) => safePercent(v.shareCount, v.viewCount, 2) ?? 0)
  );
  const avgShareRateBase = computeMedian(
    baselineVideos.map((v) => safePercent(v.shareCount, v.viewCount, 2) ?? 0)
  );

  const avgCommentRateAbove = computeMedian(
    aboveVideos.map((v) => safePercent(v.commentCount, v.viewCount, 2) ?? 0)
  );
  const avgCommentRateBase = computeMedian(
    baselineVideos.map((v) => safePercent(v.commentCount, v.viewCount, 2) ?? 0)
  );

  const topHoursAbove = getTopLabels(
    aboveVideos.map((v) => `${String(new Date(v.createTime * 1000).getHours()).padStart(2, '0')}h`),
    2
  );
  const topHoursBase = getTopLabels(
    baselineVideos.map((v) => `${String(new Date(v.createTime * 1000).getHours()).padStart(2, '0')}h`),
    2
  );

  const topDaysAbove = getTopLabels(
    aboveVideos.map((v) => FRENCH_DAYS[new Date(v.createTime * 1000).getDay()]),
    2
  );
  const topDaysBase = getTopLabels(
    baselineVideos.map((v) => FRENCH_DAYS[new Date(v.createTime * 1000).getDay()]),
    2
  );

  const extractTags = (arr: TikTokOfficialVideo[]) =>
    getTopLabels(
      arr.flatMap((v) => (v.title.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) => t.toLowerCase())),
      3
    );

  const tagsAbove = extractTags(aboveVideos);
  const tagsBase = extractTags(baselineVideos);

  // Editorial manually provided traits comparison
  const countMeta = (arr: TikTokOfficialVideo[]) =>
    arr.filter((v) => {
      const m = editorialMap?.[v.id] || v.editorialMeta;
      return Boolean(m && (m.hook || m.angle || m.subject || m.emotion || m.musicName || m.onScreenText || m.narration || m.structure || m.rhythm));
    });

  const metaAbove = countMeta(aboveVideos);
  const metaBase = countMeta(baselineVideos);

  const summarizeEditorialField = (
    arr: TikTokOfficialVideo[],
    getter: (m: VideoEditorialMetadata) => string | undefined
  ) => {
    const vals = arr
      .map((v) => {
        const m = editorialMap?.[v.id] || v.editorialMeta;
        return m ? getter(m) : undefined;
      })
      .filter((x): x is string => Boolean(x && x.trim().length > 0));
    if (vals.length === 0) return 'Non renseigné manuellement';
    return `${getTopLabels(vals, 2).join(', ')} (${vals.length} vidéo${vals.length > 1 ? 's' : ''})`;
  };

  // Snapshot second-wave trajectory count
  const secondWaveCount = aboveVideos.filter((v) => {
    const snaps = snapshotsMap?.[v.id];
    if (!snaps || snaps.length < 2) return false;
    const sorted = snaps.slice().sort((a, b) => new Date(a.fetchDate).getTime() - new Date(b.fetchDate).getTime());
    const first = sorted[0].views;
    const last = sorted[sorted.length - 1].views;
    return first > 0 && last > first * 1.3;
  }).length;

  const factorComparisons: LevelUpFactorComparison[] = [
    {
      dimension: 'Durée vidéo (API)',
      abovePlateauValue: avgDurationAbove !== null ? `${avgDurationAbove}s en moyenne` : 'Durée non fournie par l’API',
      baselineValue: avgDurationBase !== null ? `${avgDurationBase}s en moyenne` : 'Durée non fournie par l’API',
      sampleAboveCount: hasDurationAbove.length,
      sampleBaselineCount: hasDurationBase.length,
      isManualDataNeeded: hasDurationAbove.length === 0,
      observation:
        avgDurationAbove !== null && avgDurationBase !== null
          ? avgDurationAbove > avgDurationBase + 10
            ? `Les vidéos au-dessus du palier sont plus longues (+${avgDurationAbove - avgDurationBase}s en moyenne).`
            : avgDurationAbove + 10 < avgDurationBase
            ? `Les vidéos au-dessus du palier sont plus condensées (-${avgDurationBase - avgDurationAbove}s).`
            : 'Durées moyennes proches entre les deux groupes.'
          : 'Données de durée manquantes sur cet échantillon.',
    },
    {
      dimension: 'Partages & Commentaires (Taux médian)',
      abovePlateauValue: `${avgShareRateAbove.toFixed(2)}% partages · ${avgCommentRateAbove.toFixed(2)}% comms`,
      baselineValue: `${avgShareRateBase.toFixed(2)}% partages · ${avgCommentRateBase.toFixed(2)}% comms`,
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation:
        avgShareRateAbove > avgShareRateBase * 1.25
          ? 'Le groupe au-dessus du palier déclenche nettement plus de partages par vue.'
          : avgCommentRateAbove > avgCommentRateBase * 1.25
          ? 'Le groupe au-dessus du palier suscite davantage de commentaires par vue.'
          : 'Taux d’interaction par vue comparables entre les deux niveaux.',
    },
    {
      dimension: 'Jours & Horaires de publication',
      abovePlateauValue: `${topDaysAbove.join(', ') || '—'} (${topHoursAbove.join(', ') || '—'})`,
      baselineValue: `${topDaysBase.join(', ') || '—'} (${topHoursBase.join(', ') || '—'})`,
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation: 'Permet de repérer si certains créneaux concentrent davantage de sorties au-dessus du palier.',
    },
    {
      dimension: 'Hashtags récurrents',
      abovePlateauValue: tagsAbove.length > 0 ? tagsAbove.join(' ') : 'Aucun hashtag récurrent',
      baselineValue: tagsBase.length > 0 ? tagsBase.join(' ') : 'Aucun hashtag récurrent',
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation: 'Comparaison factuelle des hashtags extraits des légendes.',
    },
    {
      dimension: 'Sujet, Angle & Émotion (Saisie éditoriale)',
      abovePlateauValue: summarizeEditorialField(aboveVideos, (m) => [m.subject, m.angle, m.emotion].filter(Boolean).join(' · ')),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => [m.subject, m.angle, m.emotion].filter(Boolean).join(' · ')),
      sampleAboveCount: metaAbove.length,
      sampleBaselineCount: metaBase.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation:
        metaAbove.length > 0
          ? `Comparaison basée sur ${metaAbove.length} fiche(s) éditoriale(s) complétée(s).`
          : 'Renseignez Sujet / Angle / Émotion depuis « Détails » sur quelques vidéos pour comparer.',
    },
    {
      dimension: 'Accroche, Texte à l’écran, Rythme & Structure',
      abovePlateauValue: summarizeEditorialField(aboveVideos, (m) => [m.hook, m.onScreenText, m.rhythm, m.structure, m.narration].filter(Boolean).join(' · ')),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => [m.hook, m.onScreenText, m.rhythm, m.structure, m.narration].filter(Boolean).join(' · ')),
      sampleAboveCount: metaAbove.length,
      sampleBaselineCount: metaBase.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation:
        metaAbove.length > 0
          ? 'Permet d’observer les choix de montage associés aux vidéos au-dessus du palier.'
          : 'L’API TikTok ne fournit pas l’accroche ni le texte à l’écran : utilisez l’édition manuelle.',
    },
    {
      dimension: 'Musique & Trajectoires snapshots',
      abovePlateauValue:
        secondWaveCount > 0
          ? `${secondWaveCount} vidéo(s) à progression multi-relevés · ${summarizeEditorialField(aboveVideos, (m) => m.musicName)}`
          : summarizeEditorialField(aboveVideos, (m) => m.musicName),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => m.musicName),
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation: 'Croise les sons saisis et la dynamique observée entre vos relevés chronologiques.',
    },
  ];

  const proposedExperiments: LevelUpReport['proposedExperiments'] = [];
  if (avgDurationAbove !== null && avgDurationBase !== null && Math.abs(avgDurationAbove - avgDurationBase) >= 8) {
    proposedExperiments.push({
      title: `Tester un format calibré vers ${avgDurationAbove}s sur un sujet habituel`,
      variableChanged: 'Durée (court vs long)',
      hypothesis: `Sur votre compte, les vidéos dépassant ${aboveThreshold.toLocaleString('fr-FR')} vues ont une durée moyenne de ${avgDurationAbove}s contre ${avgDurationBase}s pour le reste.`,
      targetMetric: 'Médiane de vues à 48h et taux de complétion si saisi',
    });
  }
  if (avgShareRateAbove > avgShareRateBase * 1.15) {
    proposedExperiments.push({
      title: 'Renforcer le déclencheur de partage en fin de séquence',
      variableChanged: 'Structure & Narration',
      hypothesis: `Les publications au-dessus du palier obtiennent un taux médian de partages supérieur (${avgShareRateAbove.toFixed(2)}% vs ${avgShareRateBase.toFixed(2)}%).`,
      targetMetric: 'Taux de partages (partages / vues × 100)',
    });
  }
  if (topHoursAbove.length > 0) {
    proposedExperiments.push({
      title: `Comparer le créneau ${topHoursAbove[0]} sur deux publications similaires`,
      variableChanged: 'Créneau horaire de publication',
      hypothesis: `${aboveVideos.length} vidéos au-dessus du palier incluent une concentration horaire vers ${topHoursAbove.join(' / ')}.`,
      targetMetric: 'Vues cumulées aux relevés 5h et 24h',
    });
  }

  const missingManualFieldsNotice =
    metaAbove.length < aboveVideos.length
      ? `L’API TikTok Display v2 ne transmet pas l’accroche, le texte à l’écran, le rythme ni le titre de la musique : ${aboveVideos.length - metaAbove.length} vidéo(s) au-dessus du palier attendent vos précisions éditoriales manuelles.`
      : 'Toutes les vidéos au-dessus du palier disposent de métadonnées éditoriales renseignées.';

  return {
    hasSufficientData: true,
    baselineMedianViews: baselineMedian,
    abovePlateauThreshold: aboveThreshold,
    abovePlateauVideos: aboveVideos.slice(0, 10).map((v) => ({
      id: v.id,
      title: v.title || 'Sans titre',
      views: v.viewCount,
      likesRate: safePercent(v.likeCount, v.viewCount, 2) ?? 0,
      commentsRate: safePercent(v.commentCount, v.viewCount, 2) ?? 0,
      sharesRate: safePercent(v.shareCount, v.viewCount, 2) ?? 0,
      duration: v.duration,
      publishedAtLabel: new Date(v.createTime * 1000).toLocaleDateString('fr-FR'),
      hasEditorialMeta: Boolean(editorialMap?.[v.id] || v.editorialMeta),
    })),
    factorComparisons,
    missingManualFieldsNotice,
    correlationWarning,
    proposedExperiments,
  };
}

// ============================================================================
// « NOUVEAUX ABONNÉS GÉNÉRÉS » — ATTRIBUTION HONNÊTE (PARTIE 4.4)
// ============================================================================

export function computeFollowerGrowthAnalysis(
  account: TikTokAccountData | null | undefined,
  videos: TikTokOfficialVideo[],
  followerHistory: FollowerHistoryEntry[],
  editorialMap?: Record<string, VideoEditorialMetadata>
): FollowerGrowthAnalysis {
  const currentCount = account && typeof account.followerCount === 'number' ? account.followerCount : null;

  const sortedHistory = followerHistory
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  let netFollowerChangeObserved: number | null = null;
  if (sortedHistory.length >= 2) {
    netFollowerChangeObserved =
      sortedHistory[sortedHistory.length - 1].followerCount - sortedHistory[0].followerCount;
  }

  const manuallyAttributedVideos: FollowerGrowthAnalysis['manuallyAttributedVideos'] = [];
  for (const v of videos) {
    const manualVal = editorialMap?.[v.id]?.manualAttributedFollowers;
    const val =
      manualVal !== undefined && manualVal !== null
        ? manualVal
        : typeof v.attributedFollowers === 'number'
        ? v.attributedFollowers
        : null;

    if (val !== null && val >= 0) {
      const conv = safePercent(val, v.viewCount, 3) ?? 0;
      manuallyAttributedVideos.push({
        videoId: v.id,
        title: v.title || 'Sans titre',
        views: v.viewCount,
        attributedFollowers: val,
        conversionRatePct: conv,
        source: manualVal !== undefined && manualVal !== null ? 'manual_input' : 'tiktok_api',
      });
    }
  }

  manuallyAttributedVideos.sort((a, b) => b.attributedFollowers - a.attributedFollowers);

  let topReachVsTopConversionComparison = '';
  if (manuallyAttributedVideos.length === 0) {
    topReachVsTopConversionComparison =
      'Aucune attribution d’abonnés par vidéo n’a encore été saisie manuellement (et l’API TikTok video.list ne fournit pas ce champ). Renseignez les nouveaux abonnés visibles dans TikTok Studio dans la fiche « Détails » d’une vidéo pour comparer portée et conversion.';
  } else {
    const bestReach = videos.slice().sort((a, b) => b.viewCount - a.viewCount)[0];
    const bestConverter = manuallyAttributedVideos
      .slice()
      .sort((a, b) => b.conversionRatePct - a.conversionRatePct)[0];

    topReachVsTopConversionComparison = `Vidéo la plus vue : « ${bestReach?.title || '—'} » (${bestReach?.viewCount.toLocaleString('fr-FR') || 0} vues). Meilleur taux de conversion renseigné : « ${bestConverter.title} » (${bestConverter.attributedFollowers} abonnés attribués soit ${bestConverter.conversionRatePct}% des ${bestConverter.views.toLocaleString('fr-FR')} vues).`;
  }

  return {
    currentFollowers: {
      value: currentCount,
      status: currentCount !== null ? (currentCount === 0 ? 'verified_zero' : 'measured') : 'not_yet_collected',
      provenance: account ? 'tiktok_api' : 'internal_calculation',
      collectedAt: account?.connectedAt,
      note:
        currentCount !== null
          ? 'Total global du profil issu de user.info.stats (ne permet pas d’isoler quelle vidéo a converti).'
          : 'Connectez votre compte TikTok ou synchronisez vos statistiques pour collecter le nombre d’abonnés.',
    },
    apiAttributionAvailable: false,
    apiAttributionNote:
      "Limite certifiée de l’API TikTok Display v2 (video.list) : TikTok ne fournit pas le nombre d’abonnés générés vidéo par vidéo. Seule la variation globale du compte entre collectes ou une saisie manuelle depuis TikTok Studio est factuellement exploitable.",
    accountHistory: sortedHistory,
    netFollowerChangeObserved,
    manuallyAttributedVideos,
    topReachVsTopConversionComparison,
  };
}

// ============================================================================
// STRATÉGIES D'ENGAGEMENT SÉPARÉES (PARTIE 4.5)
// ============================================================================

export function computeEngagementStrategies(
  videos: TikTokOfficialVideo[],
  plateauMedianViews: number,
  followerAnalysis: FollowerGrowthAnalysis,
  editorialMap?: Record<string, VideoEditorialMetadata>
): EngagementStrategyReport {
  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);

  const perVideoRates = videos
    .filter((v) => v.viewCount > 0)
    .map((v) => computeVideoRates(v, editorialMap?.[v.id]));

  const globalLikesRate = safePercent(totalLikes, totalViews, 2) ?? 0;
  const globalCommentsRate = safePercent(totalComments, totalViews, 2) ?? 0;
  const globalSharesRate = safePercent(totalShares, totalViews, 2) ?? 0;
  const globalConsolidatedEngagementRate =
    safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

  const perVideoEngs = perVideoRates
    .map((r) => r.engagementRate)
    .filter((x): x is number => x !== null);
  const perVideoMeanEngagementRate = Number(computeMean(perVideoEngs).toFixed(2));
  const perVideoMedianEngagementRate = Number(computeMedian(perVideoEngs).toFixed(2));

  const perVideoLikes = perVideoRates.map((r) => r.likeRate).filter((x): x is number => x !== null);
  const perVideoComms = perVideoRates.map((r) => r.commentRate).filter((x): x is number => x !== null);
  const perVideoShares = perVideoRates.map((r) => r.shareRate).filter((x): x is number => x !== null);

  const favRates = perVideoRates.map((r) => r.favoriteRate).filter((x): x is number => x !== null);
  const favValues = videos
    .map((v) => {
      const m = editorialMap?.[v.id]?.manualFavoritesCount;
      return m !== undefined && m !== null ? m : v.favoriteCount ?? null;
    })
    .filter((x): x is number => x !== null);
  const totalFavorites = favValues.length > 0 ? favValues.reduce((a, b) => a + b, 0) : null;

  const favNotice =
    totalFavorites !== null
      ? `Formule standard : (Likes + Commentaires + Partages) / Vues × 100. Les favoris (${totalFavorites.toLocaleString('fr-FR')} sur ${favValues.length} vidéo(s)) sont suivis séparément dans « Indicateur avec favoris ».`
      : 'Formule standard : (Likes + Commentaires + Partages) / Vues × 100. L’API video.list ne fournit pas les favoris : saisissez-les manuellement dans une fiche vidéo pour les suivre.';

  const dimensions: EngagementStrategyReport['dimensions'] = [
    {
      dimension: 'Portée',
      availabilityStatus: videos.length > 0 ? 'measured' : 'not_yet_collected',
      consolidatedRateLabel: `${totalViews.toLocaleString('fr-FR')} vues cumulées`,
      perVideoMeanRateLabel: `Moy. ${Math.round(computeMean(videos.map((v) => v.viewCount))).toLocaleString('fr-FR')} vues/vidéo`,
      perVideoMedianRateLabel: `Médiane ${plateauMedianViews.toLocaleString('fr-FR')} vues`,
      accountMedianValue: plateauMedianViews,
      interpretation:
        'La portée reflète la distribution de vos vidéos (vues ≠ spectateurs uniques). Une forte portée avec peu de likes peut rester une excellente porte d’entrée de découverte.',
      tacticalStrategies: [
        'Comparer les vidéos dépassant votre propre médiane plutôt qu’un seuil universel fixe.',
        'Surveiller le décrochage dans les 2 à 3 premières secondes via un titre ou contexte clair.',
      ],
      misconceptionWarning: 'Ne jamais confondre le total des vues avec des personnes uniques atteintes.',
    },
    {
      dimension: 'Likes',
      availabilityStatus: videos.length > 0 ? 'measured' : 'not_yet_collected',
      consolidatedRateLabel: `${globalLikesRate}% (total likes / total vues)`,
      perVideoMeanRateLabel: `Moy. par vidéo : ${computeMean(perVideoLikes).toFixed(2)}%`,
      perVideoMedianRateLabel: `Médiane par vidéo : ${computeMedian(perVideoLikes).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoLikes).toFixed(2)),
      interpretation:
        'Les likes mesurent une approbation rapide, souvent plus élevée auprès d’une audience déjà fidèle que lors d’une large diffusion Pour Toi.',
      tacticalStrategies: [
        'Comparer le taux de likes à votre propre médiane par catégorie éditoriale.',
        'Soigner la résolution émotionnelle ou la chute finale de la séquence.',
      ],
      misconceptionWarning:
        'Un taux de likes plus bas sur une vidéo très vue n’indique pas un échec : une distribution large touche naturellement des spectateurs moins engagés.',
    },
    {
      dimension: 'Commentaires',
      availabilityStatus: videos.length > 0 ? 'measured' : 'not_yet_collected',
      consolidatedRateLabel: `${globalCommentsRate}% (total comms / total vues)`,
      perVideoMeanRateLabel: `Moy. par vidéo : ${computeMean(perVideoComms).toFixed(2)}%`,
      perVideoMedianRateLabel: `Médiane par vidéo : ${computeMedian(perVideoComms).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoComms).toFixed(2)),
      interpretation:
        'Les commentaires demandent un effort cognitif fort et traduisent un débat, une question ou une identification personnelle.',
      tacticalStrategies: [
        'Formuler une question précise en légende ou en texte à l’écran invitant à choisir ou témoigner.',
        'Répondre aux premiers commentaires pour prolonger la discussion.',
      ],
      misconceptionWarning: 'Évitez l’engagement-bait artificiel : privilégiez des questions légitimes liées au sujet.',
    },
    {
      dimension: 'Partages',
      availabilityStatus: videos.length > 0 ? 'measured' : 'not_yet_collected',
      consolidatedRateLabel: `${globalSharesRate}% (total partages / total vues)`,
      perVideoMeanRateLabel: `Moy. par vidéo : ${computeMean(perVideoShares).toFixed(2)}%`,
      perVideoMedianRateLabel: `Médiane par vidéo : ${computeMedian(perVideoShares).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoShares).toFixed(2)),
      interpretation:
        'Le partage traduit une valeur sociale ou pratique élevée (le spectateur recommande la vidéo à un tiers).',
      tacticalStrategies: [
        'Identifier les vidéos du compte ayant le plus fort taux de partages / vues pour repérer les sujets recommandables.',
        'Structurer le contenu autour d’un moment fort, utile ou mémorable dès la vignette d’ouverture.',
      ],
      misconceptionWarning: 'Un volume modeste de partages sur un petit compte peut représenter un signal fort rapporté aux vues.',
    },
    {
      dimension: 'Favoris',
      availabilityStatus: totalFavorites !== null ? 'measured' : 'not_provided_by_tiktok',
      consolidatedRateLabel:
        totalFavorites !== null
          ? `${totalFavorites.toLocaleString('fr-FR')} favoris (${favRates.length} vidéo(s))`
          : 'Non fourni par l’API video.list',
      perVideoMeanRateLabel:
        favRates.length > 0 ? `Moy. sur vidéos saisies : ${computeMean(favRates).toFixed(2)}%` : null,
      perVideoMedianRateLabel:
        favRates.length > 0 ? `Médiane : ${computeMedian(favRates).toFixed(2)}%` : null,
      accountMedianValue: favRates.length > 0 ? Number(computeMedian(favRates).toFixed(2)) : null,
      interpretation:
        'Les favoris signalent un contenu utile ou émotionnel que le spectateur veut retrouver plus tard.',
      tacticalStrategies: [
        'Renseigner les favoris depuis TikTok Studio sur vos formats tutoriels, conseils ou références.',
        'Créer des formats synthétiques ou inspirants méritant d’être sauvegardés.',
      ],
      misconceptionWarning: 'Ne pas remplacer les favoris manquants par 0 dans les calculs agrégés.',
    },
    {
      dimension: 'Abonnements attribués',
      availabilityStatus:
        followerAnalysis.manuallyAttributedVideos.length > 0 ? 'measured' : 'not_provided_by_tiktok',
      consolidatedRateLabel:
        followerAnalysis.manuallyAttributedVideos.length > 0
          ? `${followerAnalysis.manuallyAttributedVideos.reduce((s, x) => s + x.attributedFollowers, 0)} attribués (saisie manuelle)`
          : 'Non attribuable par vidéo via l’API',
      perVideoMeanRateLabel:
        followerAnalysis.manuallyAttributedVideos.length > 0
          ? `Moy. conversion : ${computeMean(followerAnalysis.manuallyAttributedVideos.map((x) => x.conversionRatePct)).toFixed(3)}%`
          : null,
      perVideoMedianRateLabel: null,
      accountMedianValue: null,
      interpretation:
        'La conversion en abonnés dépend autant de la promesse claire de la chaîne que de la vidéo elle-même.',
      tacticalStrategies: [
        'Saisir manuellement les abonnés attribués visibles dans TikTok Studio pour identifier les formats les plus convertisseurs.',
        'Donner une raison éditoriale claire de suivre le compte (suite, série ou rendez-vous régulier).',
      ],
      misconceptionWarning:
        'Ne jamais attribuer mécaniquement la croissance globale d’abonnés à des vidéos individuelles sans donnée source.',
    },
  ];

  return {
    globalConsolidatedEngagementRate,
    perVideoMeanEngagementRate,
    perVideoMedianEngagementRate,
    favoritesIncludedNotice: favNotice,
    dimensions,
  };
}

// ============================================================================
// SNAPSHOTS & COUNTER CORRECTION TRACKING (PARTIE 2.3)
// ============================================================================

export function buildSnapshotAndCorrectionUpdate(
  existingSnapshots: TikTokMetricSnapshot[],
  latestVideos: TikTokOfficialVideo[],
  fetchIso = new Date().toISOString()
): {
  newSnapshots: TikTokMetricSnapshot[];
  corrections: CounterCorrectionLog[];
} {
  const newSnapshots: TikTokMetricSnapshot[] = [];
  const corrections: CounterCorrectionLog[] = [];

  for (const v of latestVideos) {
    const prevForVideo = existingSnapshots
      .filter((s) => s.videoId === v.id)
      .sort((a, b) => new Date(b.fetchDate).getTime() - new Date(a.fetchDate).getTime());

    const prev = prevForVideo[0] || null;
    const deltaViews = prev ? v.viewCount - prev.views : v.viewCount;
    let corrected = false;

    if (prev && v.viewCount < prev.views) {
      corrected = true;
      corrections.push({
        id: `corr_${v.id}_views_${Date.now()}`,
        accountId: v.accountId,
        videoId: v.id,
        videoTitle: v.title,
        metric: 'views',
        previousValue: prev.views,
        newValue: v.viewCount,
        delta: v.viewCount - prev.views,
        previousDate: prev.fetchDate,
        recordedAt: fetchIso,
        note: `Correction à la baisse détectée par l'API TikTok : ${prev.views.toLocaleString('fr-FR')} → ${v.viewCount.toLocaleString('fr-FR')} vues (l'ancien relevé est conservé).`,
      });
    }
    if (prev && v.likeCount < prev.likes) {
      corrections.push({
        id: `corr_${v.id}_likes_${Date.now()}`,
        accountId: v.accountId,
        videoId: v.id,
        videoTitle: v.title,
        metric: 'likes',
        previousValue: prev.likes,
        newValue: v.likeCount,
        delta: v.likeCount - prev.likes,
        previousDate: prev.fetchDate,
        recordedAt: fetchIso,
        note: `Correction du compteur likes détectée : ${prev.likes} → ${v.likeCount}.`,
      });
    }

    // Determine age milestone tag honestly (strictly real elapsed time)
    const ageHours = Math.max(0, (new Date(fetchIso).getTime() - v.createTime * 1000) / 3600000);
    let checkpointType: TikTokMetricSnapshot['checkpointType'] = 'current';
    if (ageHours >= 156) checkpointType = 'd7';
    else if (ageHours >= 44 && ageHours <= 54) checkpointType = 'h48';
    else if (ageHours >= 21 && ageHours <= 28) checkpointType = 'h24';
    else if (ageHours >= 4 && ageHours <= 7) checkpointType = 'h5';
    else if (ageHours >= 0.5 && ageHours <= 2) checkpointType = 'h1';

    newSnapshots.push({
      id: `snap_${v.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountId: v.accountId,
      videoId: v.id,
      videoTitle: v.title,
      fetchDate: fetchIso,
      views: v.viewCount,
      deltaViewsSincePrevious: deltaViews,
      likes: v.likeCount,
      comments: v.commentCount,
      shares: v.shareCount,
      favorites: v.favoriteCount ?? null,
      engagementRate: v.engagementRate,
      source: v.source,
      checkpointType,
      counterCorrected: corrected,
    });
  }

  return { newSnapshots, corrections };
}

// ============================================================================
// MAIN CENTRAL COMPUTATION ENTRY POINT (LAYER 1 SINGLE SOURCE OF TRUTH)
// ============================================================================

export function computeCentralAccountAnalytics(params: {
  videos: TikTokOfficialVideo[];
  account?: TikTokAccountData | null;
  filterMode?: ContentMode | 'all';
  editorialMap?: Record<string, VideoEditorialMetadata>;
  snapshotsMap?: Record<string, TikTokMetricSnapshot[]>;
  followerHistory?: FollowerHistoryEntry[];
}): CentralAccountAnalytics {
  const {
    videos,
    account = null,
    filterMode = 'both',
    editorialMap,
    snapshotsMap,
    followerHistory = [],
  } = params;

  const classified = videos.map((v) => ({
    video: v,
    nature: inferVideoContentNature(v, editorialMap),
  }));

  const creationCount = classified.filter((c) => c.nature === 'creation').length;
  const repostCount = classified.filter((c) => c.nature === 'repost').length;

  const filtered =
    filterMode === 'creation'
      ? classified.filter((c) => c.nature === 'creation').map((c) => c.video)
      : filterMode === 'repost'
      ? classified.filter((c) => c.nature === 'repost').map((c) => c.video)
      : videos;

  const sampleSize = filtered.length;
  const totalViews = filtered.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = filtered.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = filtered.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = filtered.reduce((s, v) => s + v.shareCount, 0);

  const favEntries = filtered
    .map((v) => {
      const m = editorialMap?.[v.id]?.manualFavoritesCount;
      return m !== undefined && m !== null ? m : v.favoriteCount ?? null;
    })
    .filter((x): x is number => x !== null);
  const totalFavorites = favEntries.length > 0 ? favEntries.reduce((a, b) => a + b, 0) : null;

  const viewsList = filtered.map((v) => v.viewCount);
  const meanViews = Math.round(computeMean(viewsList));
  const medianViews = Math.round(computeMedian(viewsList));
  const iqrViews = Math.round(computeIQR(viewsList).iqr);

  const ratesList = filtered
    .filter((v) => v.viewCount > 0)
    .map((v) => computeVideoRates(v, editorialMap?.[v.id]));

  const globalLikesRate = safePercent(totalLikes, totalViews, 2) ?? 0;
  const globalCommentsRate = safePercent(totalComments, totalViews, 2) ?? 0;
  const globalSharesRate = safePercent(totalShares, totalViews, 2) ?? 0;
  const globalEngagementRate =
    safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

  const perVideoEng = ratesList.map((r) => r.engagementRate).filter((x): x is number => x !== null);
  const perVideoLike = ratesList.map((r) => r.likeRate).filter((x): x is number => x !== null);
  const perVideoComm = ratesList.map((r) => r.commentRate).filter((x): x is number => x !== null);
  const perVideoShare = ratesList.map((r) => r.shareRate).filter((x): x is number => x !== null);

  const plateauAnalysis = detectViewPlateaus(filtered);
  const levelUpReport = computeLevelUpAnalysis(filtered, editorialMap, snapshotsMap);
  const followerAnalysis = computeFollowerGrowthAnalysis(
    account,
    filtered,
    followerHistory,
    editorialMap
  );
  const engagementReport = computeEngagementStrategies(
    filtered,
    plateauAnalysis.overallMedianViews,
    followerAnalysis,
    editorialMap
  );

  const outlierIds = new Set(plateauAnalysis.outlierVideos.map((o) => o.id));

  const enrichedVideos: EnrichedVideoMetric[] = filtered.map((v) => {
    const rates = computeVideoRates(v, editorialMap?.[v.id]);
    const nature = inferVideoContentNature(v, editorialMap);
    const abovePlateauRatio =
      medianViews > 0 ? Number((v.viewCount / medianViews).toFixed(2)) : null;

    return {
      video: v,
      rates,
      contentNature: nature,
      isViralOutlier: outlierIds.has(v.id),
      abovePlateauRatio,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    accountHandle: account?.username || 'Compte non connecté',
    sampleSize,
    activeFilter: filterMode,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalFavorites,
    favoritesAvailableCount: favEntries.length,
    meanViews,
    medianViews,
    iqrViews,
    globalLikesRate,
    globalCommentsRate,
    globalSharesRate,
    globalEngagementRate,
    perVideoMeanEngagementRate: Number(computeMean(perVideoEng).toFixed(2)),
    perVideoMedianEngagementRate: Number(computeMedian(perVideoEng).toFixed(2)),
    perVideoMeanLikesRate: Number(computeMean(perVideoLike).toFixed(2)),
    perVideoMedianLikesRate: Number(computeMedian(perVideoLike).toFixed(2)),
    perVideoMeanCommentsRate: Number(computeMean(perVideoComm).toFixed(2)),
    perVideoMeanSharesRate: Number(computeMean(perVideoShare).toFixed(2)),
    enrichedVideos,
    plateauAnalysis,
    levelUpReport,
    engagementReport,
    creationCount,
    repostCount,
  };
}

function getTopLabels(items: string[], maxCount = 2): string[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([label]) => label);
}
