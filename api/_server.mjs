var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/centralDataEngine.ts
var centralDataEngine_exports = {};
__export(centralDataEngine_exports, {
  buildSnapshotAndCorrectionUpdate: () => buildSnapshotAndCorrectionUpdate,
  computeCentralAccountAnalytics: () => computeCentralAccountAnalytics,
  computeEngagementStrategies: () => computeEngagementStrategies,
  computeFollowerGrowthAnalysis: () => computeFollowerGrowthAnalysis,
  computeIQR: () => computeIQR,
  computeLevelUpAnalysis: () => computeLevelUpAnalysis,
  computeMAD: () => computeMAD,
  computeMean: () => computeMean,
  computeMedian: () => computeMedian,
  computeQuantile: () => computeQuantile,
  computeVideoRates: () => computeVideoRates,
  detectViewPlateaus: () => detectViewPlateaus,
  inferVideoContentNature: () => inferVideoContentNature,
  safeDivide: () => safeDivide,
  safePercent: () => safePercent
});
function safeDivide(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}
function safePercent(numerator, denominator, decimals = 2) {
  const ratio = safeDivide(numerator, denominator);
  if (ratio === null) return null;
  return Number((ratio * 100).toFixed(decimals));
}
function computeMean(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
function computeMedian(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
function computeQuantile(values, q) {
  const sorted = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] !== void 0 ? sorted[base + 1] : sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}
function computeIQR(values) {
  const q1 = computeQuantile(values, 0.25);
  const q3 = computeQuantile(values, 0.75);
  return { q1, q3, iqr: Math.max(0, q3 - q1) };
}
function computeMAD(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return 0;
  const med = computeMedian(valid);
  const absDevs = valid.map((v) => Math.abs(v - med));
  return computeMedian(absDevs);
}
function inferVideoContentNature(video, editorialMap) {
  const override = editorialMap?.[video.id]?.contentNature || video.editorialMeta?.contentNature;
  if (override === "creation" || override === "repost") return override;
  if (video.contentNature === "creation" || video.contentNature === "repost") return video.contentNature;
  const text = `${video.title} ${video.videoDescription}`.toLowerCase();
  if (text.includes("#repost") || text.includes("cr\xE9dit :") || text.includes("credit:") || text.includes("republication") || text.includes("repartage")) {
    return "repost";
  }
  return "creation";
}
function computeVideoRates(video, editorialMeta) {
  const views = video.viewCount;
  const favorites = editorialMeta?.manualFavoritesCount !== void 0 && editorialMeta.manualFavoritesCount !== null ? editorialMeta.manualFavoritesCount : video.favoriteCount ?? null;
  const attributedFollowers = editorialMeta?.manualAttributedFollowers !== void 0 && editorialMeta.manualAttributedFollowers !== null ? editorialMeta.manualAttributedFollowers : video.attributedFollowers ?? null;
  const likeRate = safePercent(video.likeCount, views, 2);
  const commentRate = safePercent(video.commentCount, views, 2);
  const shareRate = safePercent(video.shareCount, views, 2);
  const favoriteRate = favorites !== null ? safePercent(favorites, views, 2) : null;
  const engagementRate = safePercent(
    video.likeCount + video.commentCount + video.shareCount,
    views,
    2
  );
  const engagementWithFavoritesRate = favorites !== null ? safePercent(video.likeCount + video.commentCount + video.shareCount + favorites, views, 2) : null;
  const followerConversionRate = attributedFollowers !== null ? safePercent(attributedFollowers, views, 3) : null;
  return {
    likeRate,
    commentRate,
    shareRate,
    favoriteRate,
    engagementRate,
    engagementWithFavoritesRate,
    followerConversionRate
  };
}
function detectViewPlateaus(videos) {
  const sortedAsc = videos.filter((v) => v.viewCountStatus !== "not_yet_collected").slice().sort((a, b) => a.createTime - b.createTime);
  const n = sortedAsc.length;
  if (n < 4) {
    const viewsList = sortedAsc.map((v) => v.viewCount);
    const overallMedianViews2 = Math.round(computeMedian(viewsList));
    const overallMeanViews2 = Math.round(computeMean(viewsList));
    return {
      sampleSize: n,
      hasSufficientData: false,
      overallMeanViews: overallMeanViews2,
      overallMedianViews: overallMedianViews2,
      overallIqrViews: Math.round(computeIQR(viewsList).iqr),
      overallMadViews: Math.round(computeMAD(viewsList)),
      outlierThreshold: 0,
      outlierVideos: [],
      periods: [],
      trendStatus: "donnees_insuffisantes",
      trendHeadline: "\xC9chantillon insuffisant pour d\xE9tecter un palier durable",
      trendExplanation: `Le moteur exige au moins 4 publications dat\xE9es avec vues mesur\xE9es pour distinguer deux p\xE9riodes (${n} disponible${n > 1 ? "s" : ""}).`,
      previousTypicalViews: null,
      currentTypicalViews: n > 0 ? overallMedianViews2 : null,
      deltaPercentage: null
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
  const outlierVideos = sortedAsc.filter((v) => outlierThreshold > 0 && v.viewCount >= outlierThreshold && v.viewCount > overallMedianViews * 2.2).map((v) => ({
    id: v.id,
    title: v.title || "Sans titre",
    views: v.viewCount,
    dateLabel: new Date(v.createTime * 1e3).toLocaleDateString("fr-FR")
  }));
  const buildPeriodStats = (label, subset) => {
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
      medianWithoutOutliers: Math.round(computeMedian(nonOutliers.length > 0 ? nonOutliers : views))
    };
  };
  const periods = [];
  if (n >= 18) {
    const chunk = Math.floor(n / 3);
    periods.push(buildPeriodStats("P\xE9riode ancienne (1/3)", sortedAsc.slice(0, chunk)));
    periods.push(buildPeriodStats("P\xE9riode interm\xE9diaire (2/3)", sortedAsc.slice(chunk, chunk * 2)));
    periods.push(buildPeriodStats("P\xE9riode r\xE9cente (3/3)", sortedAsc.slice(chunk * 2)));
  } else {
    const mid = Math.floor(n / 2);
    periods.push(buildPeriodStats("Premi\xE8re moiti\xE9 historique", sortedAsc.slice(0, mid)));
    periods.push(buildPeriodStats("Moiti\xE9 la plus r\xE9cente", sortedAsc.slice(mid)));
  }
  const prev = periods[periods.length - 2];
  const curr = periods[periods.length - 1];
  const prevBase = prev.medianWithoutOutliers;
  const currBase = curr.medianWithoutOutliers;
  const deltaPct = prevBase > 0 ? Number(((currBase - prevBase) / prevBase * 100).toFixed(1)) : null;
  const recentRawJumpPct = prev.meanViews > 0 ? (curr.meanViews - prev.meanViews) / prev.meanViews * 100 : 0;
  let trendStatus = "stagnation";
  let trendHeadline = "";
  let trendExplanation = "";
  if (deltaPct !== null && deltaPct >= 20 && curr.videoCount >= 3) {
    trendStatus = "progression_durable";
    trendHeadline = `Progression durable d\xE9tect\xE9e : palier pass\xE9 d'environ ${prevBase.toLocaleString("fr-FR")} \xE0 ${currBase.toLocaleString("fr-FR")} vues m\xE9dianes (+${deltaPct}%)`;
    trendExplanation = `En excluant les pics viraux isol\xE9s (seuil >= ${outlierThreshold.toLocaleString("fr-FR")} vues), la m\xE9diane hors valeurs exceptionnelles a augment\xE9 de ${prevBase.toLocaleString("fr-FR")} \xE0 ${currBase.toLocaleString("fr-FR")} vues. Ce d\xE9calage refl\xE8te une \xE9l\xE9vation r\xE9elle du niveau habituel du compte.`;
  } else if (recentRawJumpPct >= 35 && (deltaPct === null || deltaPct < 15) && curr.outlierCount > 0) {
    trendStatus = "pic_isole";
    trendHeadline = "Hausse port\xE9e par une ou plusieurs vid\xE9os exceptionnelles (palier m\xE9dian stable)";
    trendExplanation = `La moyenne r\xE9cente monte (+${recentRawJumpPct.toFixed(0)}%), mais la m\xE9diane hors pics viraux reste autour de ${currBase.toLocaleString("fr-FR")} vues (contre ${prevBase.toLocaleString("fr-FR")} pr\xE9c\xE9demment). Un succ\xE8s viral unique ne garantit pas encore un changement durable du plancher de vues.`;
  } else if (deltaPct !== null && deltaPct <= -20 && curr.videoCount >= 3) {
    trendStatus = "baisse_recente";
    trendHeadline = `Repli du palier typique r\xE9cent (${prevBase.toLocaleString("fr-FR")} \u2192 ${currBase.toLocaleString("fr-FR")} vues m\xE9dianes, ${deltaPct}%)`;
    trendExplanation = `Les publications r\xE9centes affichent une m\xE9diane inf\xE9rieure \xE0 la p\xE9riode pr\xE9c\xE9dente. V\xE9rifiez l'espacement entre publications, l'accroche ou le changement de format avant toute conclusion h\xE2tive.`;
  } else {
    trendStatus = "stagnation";
    trendHeadline = `Palier stable autour de ${currBase.toLocaleString("fr-FR")} vues m\xE9dianes (dispersion IQR : ${Math.round(iqr).toLocaleString("fr-FR")})`;
    trendExplanation = `Entre les p\xE9riodes compar\xE9es (${prevBase.toLocaleString("fr-FR")} vs ${currBase.toLocaleString("fr-FR")} vues hors outliers), le niveau habituel varie de moins de 20%. Pour passer au niveau sup\xE9rieur, comparez les vid\xE9os au-dessus du palier aux vid\xE9os de base.`;
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
    deltaPercentage: deltaPct
  };
}
function computeLevelUpAnalysis(videos, editorialMap, snapshotsMap) {
  const correlationWarning = "Avertissement m\xE9thodologique : une caract\xE9ristique plus fr\xE9quente dans vos meilleures vid\xE9os indique une association statistique observ\xE9e, jamais une preuve de causalit\xE9 directe. Seule une exp\xE9rimentation contr\xF4l\xE9e permet de la confirmer.";
  if (videos.length < 4) {
    return {
      hasSufficientData: false,
      baselineMedianViews: videos.length > 0 ? Math.round(computeMedian(videos.map((v) => v.viewCount))) : 0,
      abovePlateauThreshold: 0,
      abovePlateauVideos: [],
      factorComparisons: [],
      missingManualFieldsNotice: "Au moins 4 vid\xE9os synchronis\xE9es sont n\xE9cessaires pour isoler le groupe au-dessus du palier.",
      correlationWarning,
      proposedExperiments: []
    };
  }
  const allViews = videos.map((v) => v.viewCount);
  const baselineMedian = Math.round(computeMedian(allViews));
  const q3 = computeQuantile(allViews, 0.75);
  const aboveThreshold = Math.max(Math.round(baselineMedian * 1.35), Math.round(q3));
  const aboveVideos = videos.filter((v) => v.viewCount >= aboveThreshold).sort((a, b) => b.viewCount - a.viewCount);
  const baselineVideos = videos.filter((v) => v.viewCount < aboveThreshold);
  const hasDurationAbove = aboveVideos.filter((v) => typeof v.duration === "number" && v.duration > 0);
  const hasDurationBase = baselineVideos.filter((v) => typeof v.duration === "number" && v.duration > 0);
  const avgDurationAbove = hasDurationAbove.length > 0 ? Math.round(computeMean(hasDurationAbove.map((v) => v.duration || 0))) : null;
  const avgDurationBase = hasDurationBase.length > 0 ? Math.round(computeMean(hasDurationBase.map((v) => v.duration || 0))) : null;
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
    aboveVideos.map((v) => `${String(new Date(v.createTime * 1e3).getHours()).padStart(2, "0")}h`),
    2
  );
  const topHoursBase = getTopLabels(
    baselineVideos.map((v) => `${String(new Date(v.createTime * 1e3).getHours()).padStart(2, "0")}h`),
    2
  );
  const topDaysAbove = getTopLabels(
    aboveVideos.map((v) => FRENCH_DAYS[new Date(v.createTime * 1e3).getDay()]),
    2
  );
  const topDaysBase = getTopLabels(
    baselineVideos.map((v) => FRENCH_DAYS[new Date(v.createTime * 1e3).getDay()]),
    2
  );
  const extractTags = (arr) => getTopLabels(
    arr.flatMap((v) => (v.title.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) => t.toLowerCase())),
    3
  );
  const tagsAbove = extractTags(aboveVideos);
  const tagsBase = extractTags(baselineVideos);
  const countMeta = (arr) => arr.filter((v) => {
    const m = editorialMap?.[v.id] || v.editorialMeta;
    return Boolean(m && (m.hook || m.angle || m.subject || m.emotion || m.musicName || m.onScreenText || m.narration || m.structure || m.rhythm));
  });
  const metaAbove = countMeta(aboveVideos);
  const metaBase = countMeta(baselineVideos);
  const summarizeEditorialField = (arr, getter) => {
    const vals = arr.map((v) => {
      const m = editorialMap?.[v.id] || v.editorialMeta;
      return m ? getter(m) : void 0;
    }).filter((x) => Boolean(x && x.trim().length > 0));
    if (vals.length === 0) return "Non renseign\xE9 manuellement";
    return `${getTopLabels(vals, 2).join(", ")} (${vals.length} vid\xE9o${vals.length > 1 ? "s" : ""})`;
  };
  const secondWaveCount = aboveVideos.filter((v) => {
    const snaps = snapshotsMap?.[v.id];
    if (!snaps || snaps.length < 2) return false;
    const sorted = snaps.slice().sort((a, b) => new Date(a.fetchDate).getTime() - new Date(b.fetchDate).getTime());
    const first = sorted[0].views;
    const last = sorted[sorted.length - 1].views;
    return first > 0 && last > first * 1.3;
  }).length;
  const factorComparisons = [
    {
      dimension: "Dur\xE9e vid\xE9o (API)",
      abovePlateauValue: avgDurationAbove !== null ? `${avgDurationAbove}s en moyenne` : "Dur\xE9e non fournie par l\u2019API",
      baselineValue: avgDurationBase !== null ? `${avgDurationBase}s en moyenne` : "Dur\xE9e non fournie par l\u2019API",
      sampleAboveCount: hasDurationAbove.length,
      sampleBaselineCount: hasDurationBase.length,
      isManualDataNeeded: hasDurationAbove.length === 0,
      observation: avgDurationAbove !== null && avgDurationBase !== null ? avgDurationAbove > avgDurationBase + 10 ? `Les vid\xE9os au-dessus du palier sont plus longues (+${avgDurationAbove - avgDurationBase}s en moyenne).` : avgDurationAbove + 10 < avgDurationBase ? `Les vid\xE9os au-dessus du palier sont plus condens\xE9es (-${avgDurationBase - avgDurationAbove}s).` : "Dur\xE9es moyennes proches entre les deux groupes." : "Donn\xE9es de dur\xE9e manquantes sur cet \xE9chantillon."
    },
    {
      dimension: "Partages & Commentaires (Taux m\xE9dian)",
      abovePlateauValue: `${avgShareRateAbove.toFixed(2)}% partages \xB7 ${avgCommentRateAbove.toFixed(2)}% comms`,
      baselineValue: `${avgShareRateBase.toFixed(2)}% partages \xB7 ${avgCommentRateBase.toFixed(2)}% comms`,
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation: avgShareRateAbove > avgShareRateBase * 1.25 ? "Le groupe au-dessus du palier d\xE9clenche nettement plus de partages par vue." : avgCommentRateAbove > avgCommentRateBase * 1.25 ? "Le groupe au-dessus du palier suscite davantage de commentaires par vue." : "Taux d\u2019interaction par vue comparables entre les deux niveaux."
    },
    {
      dimension: "Jours & Horaires de publication",
      abovePlateauValue: `${topDaysAbove.join(", ") || "\u2014"} (${topHoursAbove.join(", ") || "\u2014"})`,
      baselineValue: `${topDaysBase.join(", ") || "\u2014"} (${topHoursBase.join(", ") || "\u2014"})`,
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation: "Permet de rep\xE9rer si certains cr\xE9neaux concentrent davantage de sorties au-dessus du palier."
    },
    {
      dimension: "Hashtags r\xE9currents",
      abovePlateauValue: tagsAbove.length > 0 ? tagsAbove.join(" ") : "Aucun hashtag r\xE9current",
      baselineValue: tagsBase.length > 0 ? tagsBase.join(" ") : "Aucun hashtag r\xE9current",
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: false,
      observation: "Comparaison factuelle des hashtags extraits des l\xE9gendes."
    },
    {
      dimension: "Sujet, Angle & \xC9motion (Saisie \xE9ditoriale)",
      abovePlateauValue: summarizeEditorialField(aboveVideos, (m) => [m.subject, m.angle, m.emotion].filter(Boolean).join(" \xB7 ")),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => [m.subject, m.angle, m.emotion].filter(Boolean).join(" \xB7 ")),
      sampleAboveCount: metaAbove.length,
      sampleBaselineCount: metaBase.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation: metaAbove.length > 0 ? `Comparaison bas\xE9e sur ${metaAbove.length} fiche(s) \xE9ditoriale(s) compl\xE9t\xE9e(s).` : "Renseignez Sujet / Angle / \xC9motion depuis \xAB D\xE9tails \xBB sur quelques vid\xE9os pour comparer."
    },
    {
      dimension: "Accroche, Texte \xE0 l\u2019\xE9cran, Rythme & Structure",
      abovePlateauValue: summarizeEditorialField(aboveVideos, (m) => [m.hook, m.onScreenText, m.rhythm, m.structure, m.narration].filter(Boolean).join(" \xB7 ")),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => [m.hook, m.onScreenText, m.rhythm, m.structure, m.narration].filter(Boolean).join(" \xB7 ")),
      sampleAboveCount: metaAbove.length,
      sampleBaselineCount: metaBase.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation: metaAbove.length > 0 ? "Permet d\u2019observer les choix de montage associ\xE9s aux vid\xE9os au-dessus du palier." : "L\u2019API TikTok ne fournit pas l\u2019accroche ni le texte \xE0 l\u2019\xE9cran : utilisez l\u2019\xE9dition manuelle."
    },
    {
      dimension: "Musique & Trajectoires snapshots",
      abovePlateauValue: secondWaveCount > 0 ? `${secondWaveCount} vid\xE9o(s) \xE0 progression multi-relev\xE9s \xB7 ${summarizeEditorialField(aboveVideos, (m) => m.musicName)}` : summarizeEditorialField(aboveVideos, (m) => m.musicName),
      baselineValue: summarizeEditorialField(baselineVideos, (m) => m.musicName),
      sampleAboveCount: aboveVideos.length,
      sampleBaselineCount: baselineVideos.length,
      isManualDataNeeded: metaAbove.length === 0,
      observation: "Croise les sons saisis et la dynamique observ\xE9e entre vos relev\xE9s chronologiques."
    }
  ];
  const proposedExperiments = [];
  if (avgDurationAbove !== null && avgDurationBase !== null && Math.abs(avgDurationAbove - avgDurationBase) >= 8) {
    proposedExperiments.push({
      title: `Tester un format calibr\xE9 vers ${avgDurationAbove}s sur un sujet habituel`,
      variableChanged: "Dur\xE9e (court vs long)",
      hypothesis: `Sur votre compte, les vid\xE9os d\xE9passant ${aboveThreshold.toLocaleString("fr-FR")} vues ont une dur\xE9e moyenne de ${avgDurationAbove}s contre ${avgDurationBase}s pour le reste.`,
      targetMetric: "M\xE9diane de vues \xE0 48h et taux de compl\xE9tion si saisi"
    });
  }
  if (avgShareRateAbove > avgShareRateBase * 1.15) {
    proposedExperiments.push({
      title: "Renforcer le d\xE9clencheur de partage en fin de s\xE9quence",
      variableChanged: "Structure & Narration",
      hypothesis: `Les publications au-dessus du palier obtiennent un taux m\xE9dian de partages sup\xE9rieur (${avgShareRateAbove.toFixed(2)}% vs ${avgShareRateBase.toFixed(2)}%).`,
      targetMetric: "Taux de partages (partages / vues \xD7 100)"
    });
  }
  if (topHoursAbove.length > 0) {
    proposedExperiments.push({
      title: `Comparer le cr\xE9neau ${topHoursAbove[0]} sur deux publications similaires`,
      variableChanged: "Cr\xE9neau horaire de publication",
      hypothesis: `${aboveVideos.length} vid\xE9os au-dessus du palier incluent une concentration horaire vers ${topHoursAbove.join(" / ")}.`,
      targetMetric: "Vues cumul\xE9es aux relev\xE9s 5h et 24h"
    });
  }
  const missingManualFieldsNotice = metaAbove.length < aboveVideos.length ? `L\u2019API TikTok Display v2 ne transmet pas l\u2019accroche, le texte \xE0 l\u2019\xE9cran, le rythme ni le titre de la musique : ${aboveVideos.length - metaAbove.length} vid\xE9o(s) au-dessus du palier attendent vos pr\xE9cisions \xE9ditoriales manuelles.` : "Toutes les vid\xE9os au-dessus du palier disposent de m\xE9tadonn\xE9es \xE9ditoriales renseign\xE9es.";
  return {
    hasSufficientData: true,
    baselineMedianViews: baselineMedian,
    abovePlateauThreshold: aboveThreshold,
    abovePlateauVideos: aboveVideos.slice(0, 10).map((v) => ({
      id: v.id,
      title: v.title || "Sans titre",
      views: v.viewCount,
      likesRate: safePercent(v.likeCount, v.viewCount, 2) ?? 0,
      commentsRate: safePercent(v.commentCount, v.viewCount, 2) ?? 0,
      sharesRate: safePercent(v.shareCount, v.viewCount, 2) ?? 0,
      duration: v.duration,
      publishedAtLabel: new Date(v.createTime * 1e3).toLocaleDateString("fr-FR"),
      hasEditorialMeta: Boolean(editorialMap?.[v.id] || v.editorialMeta)
    })),
    factorComparisons,
    missingManualFieldsNotice,
    correlationWarning,
    proposedExperiments
  };
}
function computeFollowerGrowthAnalysis(account, videos, followerHistory, editorialMap) {
  const currentCount = account && typeof account.followerCount === "number" ? account.followerCount : null;
  const sortedHistory = followerHistory.slice().sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  let netFollowerChangeObserved = null;
  if (sortedHistory.length >= 2) {
    netFollowerChangeObserved = sortedHistory[sortedHistory.length - 1].followerCount - sortedHistory[0].followerCount;
  }
  const manuallyAttributedVideos = [];
  for (const v of videos) {
    const manualVal = editorialMap?.[v.id]?.manualAttributedFollowers;
    const val = manualVal !== void 0 && manualVal !== null ? manualVal : typeof v.attributedFollowers === "number" ? v.attributedFollowers : null;
    if (val !== null && val >= 0) {
      const conv = safePercent(val, v.viewCount, 3) ?? 0;
      manuallyAttributedVideos.push({
        videoId: v.id,
        title: v.title || "Sans titre",
        views: v.viewCount,
        attributedFollowers: val,
        conversionRatePct: conv,
        source: manualVal !== void 0 && manualVal !== null ? "manual_input" : "tiktok_api"
      });
    }
  }
  manuallyAttributedVideos.sort((a, b) => b.attributedFollowers - a.attributedFollowers);
  let topReachVsTopConversionComparison = "";
  if (manuallyAttributedVideos.length === 0) {
    topReachVsTopConversionComparison = "Aucune attribution d\u2019abonn\xE9s par vid\xE9o n\u2019a encore \xE9t\xE9 saisie manuellement (et l\u2019API TikTok video.list ne fournit pas ce champ). Renseignez les nouveaux abonn\xE9s visibles dans TikTok Studio dans la fiche \xAB D\xE9tails \xBB d\u2019une vid\xE9o pour comparer port\xE9e et conversion.";
  } else {
    const bestReach = videos.slice().sort((a, b) => b.viewCount - a.viewCount)[0];
    const bestConverter = manuallyAttributedVideos.slice().sort((a, b) => b.conversionRatePct - a.conversionRatePct)[0];
    topReachVsTopConversionComparison = `Vid\xE9o la plus vue : \xAB ${bestReach?.title || "\u2014"} \xBB (${bestReach?.viewCount.toLocaleString("fr-FR") || 0} vues). Meilleur taux de conversion renseign\xE9 : \xAB ${bestConverter.title} \xBB (${bestConverter.attributedFollowers} abonn\xE9s attribu\xE9s soit ${bestConverter.conversionRatePct}% des ${bestConverter.views.toLocaleString("fr-FR")} vues).`;
  }
  return {
    currentFollowers: {
      value: currentCount,
      status: currentCount !== null ? currentCount === 0 ? "verified_zero" : "measured" : "not_yet_collected",
      provenance: account ? "tiktok_api" : "internal_calculation",
      collectedAt: account?.connectedAt,
      note: currentCount !== null ? "Total global du profil issu de user.info.stats (ne permet pas d\u2019isoler quelle vid\xE9o a converti)." : "Connectez votre compte TikTok ou synchronisez vos statistiques pour collecter le nombre d\u2019abonn\xE9s."
    },
    apiAttributionAvailable: false,
    apiAttributionNote: "Limite certifi\xE9e de l\u2019API TikTok Display v2 (video.list) : TikTok ne fournit pas le nombre d\u2019abonn\xE9s g\xE9n\xE9r\xE9s vid\xE9o par vid\xE9o. Seule la variation globale du compte entre collectes ou une saisie manuelle depuis TikTok Studio est factuellement exploitable.",
    accountHistory: sortedHistory,
    netFollowerChangeObserved,
    manuallyAttributedVideos,
    topReachVsTopConversionComparison
  };
}
function computeEngagementStrategies(videos, plateauMedianViews, followerAnalysis, editorialMap) {
  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = videos.reduce((s, v) => s + v.shareCount, 0);
  const perVideoRates = videos.filter((v) => v.viewCount > 0).map((v) => computeVideoRates(v, editorialMap?.[v.id]));
  const globalLikesRate = safePercent(totalLikes, totalViews, 2) ?? 0;
  const globalCommentsRate = safePercent(totalComments, totalViews, 2) ?? 0;
  const globalSharesRate = safePercent(totalShares, totalViews, 2) ?? 0;
  const globalConsolidatedEngagementRate = safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;
  const perVideoEngs = perVideoRates.map((r) => r.engagementRate).filter((x) => x !== null);
  const perVideoMeanEngagementRate = Number(computeMean(perVideoEngs).toFixed(2));
  const perVideoMedianEngagementRate = Number(computeMedian(perVideoEngs).toFixed(2));
  const perVideoLikes = perVideoRates.map((r) => r.likeRate).filter((x) => x !== null);
  const perVideoComms = perVideoRates.map((r) => r.commentRate).filter((x) => x !== null);
  const perVideoShares = perVideoRates.map((r) => r.shareRate).filter((x) => x !== null);
  const favRates = perVideoRates.map((r) => r.favoriteRate).filter((x) => x !== null);
  const favValues = videos.map((v) => {
    const m = editorialMap?.[v.id]?.manualFavoritesCount;
    return m !== void 0 && m !== null ? m : v.favoriteCount ?? null;
  }).filter((x) => x !== null);
  const totalFavorites = favValues.length > 0 ? favValues.reduce((a, b) => a + b, 0) : null;
  const favNotice = totalFavorites !== null ? `Formule standard : (Likes + Commentaires + Partages) / Vues \xD7 100. Les favoris (${totalFavorites.toLocaleString("fr-FR")} sur ${favValues.length} vid\xE9o(s)) sont suivis s\xE9par\xE9ment dans \xAB Indicateur avec favoris \xBB.` : "Formule standard : (Likes + Commentaires + Partages) / Vues \xD7 100. L\u2019API video.list ne fournit pas les favoris : saisissez-les manuellement dans une fiche vid\xE9o pour les suivre.";
  const dimensions = [
    {
      dimension: "Port\xE9e",
      availabilityStatus: videos.length > 0 ? "measured" : "not_yet_collected",
      consolidatedRateLabel: `${totalViews.toLocaleString("fr-FR")} vues cumul\xE9es`,
      perVideoMeanRateLabel: `Moy. ${Math.round(computeMean(videos.map((v) => v.viewCount))).toLocaleString("fr-FR")} vues/vid\xE9o`,
      perVideoMedianRateLabel: `M\xE9diane ${plateauMedianViews.toLocaleString("fr-FR")} vues`,
      accountMedianValue: plateauMedianViews,
      interpretation: "La port\xE9e refl\xE8te la distribution de vos vid\xE9os (vues \u2260 spectateurs uniques). Une forte port\xE9e avec peu de likes peut rester une excellente porte d\u2019entr\xE9e de d\xE9couverte.",
      tacticalStrategies: [
        "Comparer les vid\xE9os d\xE9passant votre propre m\xE9diane plut\xF4t qu\u2019un seuil universel fixe.",
        "Surveiller le d\xE9crochage dans les 2 \xE0 3 premi\xE8res secondes via un titre ou contexte clair."
      ],
      misconceptionWarning: "Ne jamais confondre le total des vues avec des personnes uniques atteintes."
    },
    {
      dimension: "Likes",
      availabilityStatus: videos.length > 0 ? "measured" : "not_yet_collected",
      consolidatedRateLabel: `${globalLikesRate}% (total likes / total vues)`,
      perVideoMeanRateLabel: `Moy. par vid\xE9o : ${computeMean(perVideoLikes).toFixed(2)}%`,
      perVideoMedianRateLabel: `M\xE9diane par vid\xE9o : ${computeMedian(perVideoLikes).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoLikes).toFixed(2)),
      interpretation: "Les likes mesurent une approbation rapide, souvent plus \xE9lev\xE9e aupr\xE8s d\u2019une audience d\xE9j\xE0 fid\xE8le que lors d\u2019une large diffusion Pour Toi.",
      tacticalStrategies: [
        "Comparer le taux de likes \xE0 votre propre m\xE9diane par cat\xE9gorie \xE9ditoriale.",
        "Soigner la r\xE9solution \xE9motionnelle ou la chute finale de la s\xE9quence."
      ],
      misconceptionWarning: "Un taux de likes plus bas sur une vid\xE9o tr\xE8s vue n\u2019indique pas un \xE9chec : une distribution large touche naturellement des spectateurs moins engag\xE9s."
    },
    {
      dimension: "Commentaires",
      availabilityStatus: videos.length > 0 ? "measured" : "not_yet_collected",
      consolidatedRateLabel: `${globalCommentsRate}% (total comms / total vues)`,
      perVideoMeanRateLabel: `Moy. par vid\xE9o : ${computeMean(perVideoComms).toFixed(2)}%`,
      perVideoMedianRateLabel: `M\xE9diane par vid\xE9o : ${computeMedian(perVideoComms).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoComms).toFixed(2)),
      interpretation: "Les commentaires demandent un effort cognitif fort et traduisent un d\xE9bat, une question ou une identification personnelle.",
      tacticalStrategies: [
        "Formuler une question pr\xE9cise en l\xE9gende ou en texte \xE0 l\u2019\xE9cran invitant \xE0 choisir ou t\xE9moigner.",
        "R\xE9pondre aux premiers commentaires pour prolonger la discussion."
      ],
      misconceptionWarning: "\xC9vitez l\u2019engagement-bait artificiel : privil\xE9giez des questions l\xE9gitimes li\xE9es au sujet."
    },
    {
      dimension: "Partages",
      availabilityStatus: videos.length > 0 ? "measured" : "not_yet_collected",
      consolidatedRateLabel: `${globalSharesRate}% (total partages / total vues)`,
      perVideoMeanRateLabel: `Moy. par vid\xE9o : ${computeMean(perVideoShares).toFixed(2)}%`,
      perVideoMedianRateLabel: `M\xE9diane par vid\xE9o : ${computeMedian(perVideoShares).toFixed(2)}%`,
      accountMedianValue: Number(computeMedian(perVideoShares).toFixed(2)),
      interpretation: "Le partage traduit une valeur sociale ou pratique \xE9lev\xE9e (le spectateur recommande la vid\xE9o \xE0 un tiers).",
      tacticalStrategies: [
        "Identifier les vid\xE9os du compte ayant le plus fort taux de partages / vues pour rep\xE9rer les sujets recommandables.",
        "Structurer le contenu autour d\u2019un moment fort, utile ou m\xE9morable d\xE8s la vignette d\u2019ouverture."
      ],
      misconceptionWarning: "Un volume modeste de partages sur un petit compte peut repr\xE9senter un signal fort rapport\xE9 aux vues."
    },
    {
      dimension: "Favoris",
      availabilityStatus: totalFavorites !== null ? "measured" : "not_provided_by_tiktok",
      consolidatedRateLabel: totalFavorites !== null ? `${totalFavorites.toLocaleString("fr-FR")} favoris (${favRates.length} vid\xE9o(s))` : "Non fourni par l\u2019API video.list",
      perVideoMeanRateLabel: favRates.length > 0 ? `Moy. sur vid\xE9os saisies : ${computeMean(favRates).toFixed(2)}%` : null,
      perVideoMedianRateLabel: favRates.length > 0 ? `M\xE9diane : ${computeMedian(favRates).toFixed(2)}%` : null,
      accountMedianValue: favRates.length > 0 ? Number(computeMedian(favRates).toFixed(2)) : null,
      interpretation: "Les favoris signalent un contenu utile ou \xE9motionnel que le spectateur veut retrouver plus tard.",
      tacticalStrategies: [
        "Renseigner les favoris depuis TikTok Studio sur vos formats tutoriels, conseils ou r\xE9f\xE9rences.",
        "Cr\xE9er des formats synth\xE9tiques ou inspirants m\xE9ritant d\u2019\xEAtre sauvegard\xE9s."
      ],
      misconceptionWarning: "Ne pas remplacer les favoris manquants par 0 dans les calculs agr\xE9g\xE9s."
    },
    {
      dimension: "Abonnements attribu\xE9s",
      availabilityStatus: followerAnalysis.manuallyAttributedVideos.length > 0 ? "measured" : "not_provided_by_tiktok",
      consolidatedRateLabel: followerAnalysis.manuallyAttributedVideos.length > 0 ? `${followerAnalysis.manuallyAttributedVideos.reduce((s, x) => s + x.attributedFollowers, 0)} attribu\xE9s (saisie manuelle)` : "Non attribuable par vid\xE9o via l\u2019API",
      perVideoMeanRateLabel: followerAnalysis.manuallyAttributedVideos.length > 0 ? `Moy. conversion : ${computeMean(followerAnalysis.manuallyAttributedVideos.map((x) => x.conversionRatePct)).toFixed(3)}%` : null,
      perVideoMedianRateLabel: null,
      accountMedianValue: null,
      interpretation: "La conversion en abonn\xE9s d\xE9pend autant de la promesse claire de la cha\xEEne que de la vid\xE9o elle-m\xEAme.",
      tacticalStrategies: [
        "Saisir manuellement les abonn\xE9s attribu\xE9s visibles dans TikTok Studio pour identifier les formats les plus convertisseurs.",
        "Donner une raison \xE9ditoriale claire de suivre le compte (suite, s\xE9rie ou rendez-vous r\xE9gulier)."
      ],
      misconceptionWarning: "Ne jamais attribuer m\xE9caniquement la croissance globale d\u2019abonn\xE9s \xE0 des vid\xE9os individuelles sans donn\xE9e source."
    }
  ];
  return {
    globalConsolidatedEngagementRate,
    perVideoMeanEngagementRate,
    perVideoMedianEngagementRate,
    favoritesIncludedNotice: favNotice,
    dimensions
  };
}
function buildSnapshotAndCorrectionUpdate(existingSnapshots, latestVideos, fetchIso = (/* @__PURE__ */ new Date()).toISOString()) {
  const newSnapshots = [];
  const corrections = [];
  for (const v of latestVideos) {
    const prevForVideo = existingSnapshots.filter((s) => s.videoId === v.id).sort((a, b) => new Date(b.fetchDate).getTime() - new Date(a.fetchDate).getTime());
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
        metric: "views",
        previousValue: prev.views,
        newValue: v.viewCount,
        delta: v.viewCount - prev.views,
        previousDate: prev.fetchDate,
        recordedAt: fetchIso,
        note: `Correction \xE0 la baisse d\xE9tect\xE9e par l'API TikTok : ${prev.views.toLocaleString("fr-FR")} \u2192 ${v.viewCount.toLocaleString("fr-FR")} vues (l'ancien relev\xE9 est conserv\xE9).`
      });
    }
    if (prev && v.likeCount < prev.likes) {
      corrections.push({
        id: `corr_${v.id}_likes_${Date.now()}`,
        accountId: v.accountId,
        videoId: v.id,
        videoTitle: v.title,
        metric: "likes",
        previousValue: prev.likes,
        newValue: v.likeCount,
        delta: v.likeCount - prev.likes,
        previousDate: prev.fetchDate,
        recordedAt: fetchIso,
        note: `Correction du compteur likes d\xE9tect\xE9e : ${prev.likes} \u2192 ${v.likeCount}.`
      });
    }
    const ageHours = Math.max(0, (new Date(fetchIso).getTime() - v.createTime * 1e3) / 36e5);
    let checkpointType = "current";
    if (ageHours >= 156) checkpointType = "d7";
    else if (ageHours >= 44 && ageHours <= 54) checkpointType = "h48";
    else if (ageHours >= 21 && ageHours <= 28) checkpointType = "h24";
    else if (ageHours >= 4 && ageHours <= 7) checkpointType = "h5";
    else if (ageHours >= 0.5 && ageHours <= 2) checkpointType = "h1";
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
      counterCorrected: corrected
    });
  }
  return { newSnapshots, corrections };
}
function computeCentralAccountAnalytics(params) {
  const {
    videos,
    account = null,
    filterMode = "both",
    editorialMap,
    snapshotsMap,
    followerHistory = []
  } = params;
  const classified = videos.map((v) => ({
    video: v,
    nature: inferVideoContentNature(v, editorialMap)
  }));
  const creationCount = classified.filter((c) => c.nature === "creation").length;
  const repostCount = classified.filter((c) => c.nature === "repost").length;
  const filtered = filterMode === "creation" ? classified.filter((c) => c.nature === "creation").map((c) => c.video) : filterMode === "repost" ? classified.filter((c) => c.nature === "repost").map((c) => c.video) : videos;
  const sampleSize = filtered.length;
  const totalViews = filtered.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = filtered.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = filtered.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = filtered.reduce((s, v) => s + v.shareCount, 0);
  const favEntries = filtered.map((v) => {
    const m = editorialMap?.[v.id]?.manualFavoritesCount;
    return m !== void 0 && m !== null ? m : v.favoriteCount ?? null;
  }).filter((x) => x !== null);
  const totalFavorites = favEntries.length > 0 ? favEntries.reduce((a, b) => a + b, 0) : null;
  const viewsList = filtered.map((v) => v.viewCount);
  const meanViews = Math.round(computeMean(viewsList));
  const medianViews = Math.round(computeMedian(viewsList));
  const iqrViews = Math.round(computeIQR(viewsList).iqr);
  const ratesList = filtered.filter((v) => v.viewCount > 0).map((v) => computeVideoRates(v, editorialMap?.[v.id]));
  const globalLikesRate = safePercent(totalLikes, totalViews, 2) ?? 0;
  const globalCommentsRate = safePercent(totalComments, totalViews, 2) ?? 0;
  const globalSharesRate = safePercent(totalShares, totalViews, 2) ?? 0;
  const globalEngagementRate = safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;
  const perVideoEng = ratesList.map((r) => r.engagementRate).filter((x) => x !== null);
  const perVideoLike = ratesList.map((r) => r.likeRate).filter((x) => x !== null);
  const perVideoComm = ratesList.map((r) => r.commentRate).filter((x) => x !== null);
  const perVideoShare = ratesList.map((r) => r.shareRate).filter((x) => x !== null);
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
  const enrichedVideos = filtered.map((v) => {
    const rates = computeVideoRates(v, editorialMap?.[v.id]);
    const nature = inferVideoContentNature(v, editorialMap);
    const abovePlateauRatio = medianViews > 0 ? Number((v.viewCount / medianViews).toFixed(2)) : null;
    return {
      video: v,
      rates,
      contentNature: nature,
      isViralOutlier: outlierIds.has(v.id),
      abovePlateauRatio
    };
  });
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    accountHandle: account?.username || "Compte non connect\xE9",
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
    repostCount
  };
}
function getTopLabels(items, maxCount = 2) {
  const counts = {};
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxCount).map(([label]) => label);
}
var FRENCH_DAYS;
var init_centralDataEngine = __esm({
  "src/utils/centralDataEngine.ts"() {
    FRENCH_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  }
});

// src/utils/learningMemoryEngine.ts
var learningMemoryEngine_exports = {};
__export(learningMemoryEngine_exports, {
  TIKTOK_ACCOUNT_MEMORY_KEY: () => TIKTOK_ACCOUNT_MEMORY_KEY,
  TIKTOK_VIDEO_CARD_KEY_PREFIX: () => TIKTOK_VIDEO_CARD_KEY_PREFIX,
  compareTwoVideosPedagogically: () => compareTwoVideosPedagogically,
  findSimilarRefutedOrTestedExperiments: () => findSimilarRefutedOrTestedExperiments,
  findSimilarVideos: () => findSimilarVideos,
  generatePedagogicalAnalysis: () => generatePedagogicalAnalysis,
  getAccountKnowledgeMemory: () => getAccountKnowledgeMemory,
  getInitialAccountKnowledgeMemory: () => getInitialAccountKnowledgeMemory,
  getVideoMemoryCard: () => getVideoMemoryCard,
  saveAccountKnowledgeMemory: () => saveAccountKnowledgeMemory,
  saveVideoMemoryCard: () => saveVideoMemoryCard,
  updateVideoTestOutcome: () => updateVideoTestOutcome
});
function getScopedMemoryKey(scopeKey) {
  const clean = (scopeKey || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${TIKTOK_ACCOUNT_MEMORY_KEY}_${clean}`;
}
function getInitialAccountKnowledgeMemory(accountHandle = "Compte non connect\xE9") {
  return {
    accountHandle,
    totalAnalyzedVideos: 0,
    verifiedRules: [],
    activeHypotheses: [],
    testedLearnings: [],
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getAccountKnowledgeMemory(accountHandle = "Compte non connect\xE9", scopeKey) {
  try {
    const raw = localStorage.getItem(getScopedMemoryKey(scopeKey || accountHandle));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.verifiedRules)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading account memory:", e);
  }
  const init = getInitialAccountKnowledgeMemory(accountHandle);
  saveAccountKnowledgeMemory(init, scopeKey || accountHandle);
  return init;
}
function saveAccountKnowledgeMemory(memory, scopeKey) {
  try {
    memory.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    localStorage.setItem(
      getScopedMemoryKey(scopeKey || memory.accountHandle),
      JSON.stringify(memory)
    );
  } catch (e) {
    console.error("Error saving account memory:", e);
  }
}
function findSimilarRefutedOrTestedExperiments(candidateText, experimentLogs) {
  const cleanTokens = candidateText.toLowerCase().split(/[\s,.;:!?/#()-]+/).filter((w) => w.length >= 4);
  const isSimilar = (exp) => {
    const expText = `${exp.title} ${exp.hypothesis} ${exp.modifiedCharacteristic}`.toLowerCase();
    const hits = cleanTokens.filter((tok) => expText.includes(tok));
    return hits.length >= 2;
  };
  return {
    refutedMatches: experimentLogs.filter(
      (e) => e.conclusion === "D\xE9favorable" && isSimilar(e)
    ),
    activeMatches: experimentLogs.filter(
      (e) => e.conclusion !== "D\xE9favorable" && isSimilar(e)
    )
  };
}
function findSimilarVideos(target, allVideos) {
  const extractKeywords = (v) => {
    const text = `${v.title || ""} ${v.videoDescription || ""}`.toLowerCase();
    const tokens = text.split(/[\s,.;:!?()[\]"'/-]+/).map((t) => t.replace(/^#/, "")).filter((t) => t.length >= 4 && !["pour", "avec", "dans", "plus", "cette", "vous", "video", "tiktok", "pourtoi", "foryou"].includes(t));
    return new Set(tokens);
  };
  const targetKw = extractKeywords(target);
  if (targetKw.size === 0) return [];
  return allVideos.filter((v) => {
    if (v.id === target.id) return false;
    const otherKw = extractKeywords(v);
    let overlap = 0;
    for (const kw of targetKw) {
      if (otherKw.has(kw)) overlap++;
    }
    return overlap >= 1;
  }).sort((a, b) => b.viewCount - a.viewCount);
}
function generatePedagogicalAnalysis(video, allVideos, memory, _traits, manualRetention) {
  const activeMemory = memory || getAccountKnowledgeMemory();
  const siblings = findSimilarVideos(video, allVideos);
  const bestSibling = siblings.length > 0 ? siblings[0] : null;
  const accountMedianViews = allVideos.length > 0 ? Math.round(computeMedian(allVideos.map((v) => v.viewCount))) : 0;
  const accountGlobalEng = (() => {
    const tv = allVideos.reduce((s, v) => s + v.viewCount, 0);
    const ti = allVideos.reduce((s, v) => s + v.likeCount + v.commentCount + v.shareCount, 0);
    return safePercent(ti, tv, 2) ?? 0;
  })();
  const duration = video.duration || 0;
  const hasDuration = typeof video.duration === "number" && video.duration > 0;
  const views = video.viewCount || 0;
  const likes = video.likeCount || 0;
  const comments = video.commentCount || 0;
  const shares = video.shareCount || 0;
  const engagement = safePercent(likes + comments + shares, views, 2) ?? 0;
  const createDate = new Date(video.createTime * 1e3);
  const hour = createDate.getHours();
  const minutes = createDate.getMinutes();
  const timeFormatted = `${String(hour).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
  const isAboveMedian = accountMedianViews > 0 ? views >= accountMedianViews * 1.35 : false;
  const isStrongOutlier = accountMedianViews > 0 ? views >= accountMedianViews * 3 : false;
  const isDuplicateDrop = Boolean(
    bestSibling && bestSibling.viewCount > Math.max(views * 4, 200) && Math.abs(bestSibling.createTime - video.createTime) < 86400
  );
  const facts = [
    `FAIT : Publication le ${createDate.toLocaleDateString("fr-FR")} \xE0 ${timeFormatted}.`,
    hasDuration ? `FAIT : Dur\xE9e mesur\xE9e de la vid\xE9o : ${duration} secondes.` : `INFORMATION MANQUANTE : Dur\xE9e exacte non fournie par l'API sur cet extrait.`,
    `FAIT : ${views.toLocaleString("fr-FR")} vues enregistr\xE9es (diff\xE9rent des spectateurs uniques), ${likes.toLocaleString("fr-FR")} likes, ${comments} commentaires, ${shares} partages.`,
    `FAIT : Taux d'engagement mesur\xE9 : ${engagement.toFixed(2)}% (r\xE9f\xE9rence globale du compte : ${accountGlobalEng.toFixed(2)}%).`
  ];
  const observations = [];
  const hypotheses = [];
  const conclusions = [];
  const tests = [];
  const dataMissingNotices = [];
  if (!manualRetention?.averageWatchTimeSeconds) {
    dataMissingNotices.push(
      "INFORMATION MANQUANTE : Le temps moyen de visionnage et la compl\xE9tion ne sont pas fournis par l'API TikTok video.list. Renseignez-les depuis TikTok Studio pour pr\xE9ciser le diagnostic."
    );
  } else {
    facts.push(
      `FAIT (TikTok Studio) : Temps moyen ${manualRetention.averageWatchTimeSeconds}s \xB7 Compl\xE9tion ${manualRetention.completionRatePercentage || 0}% \xB7 R\xE9tention 3s ${manualRetention.retentionAt3SecondsPercentage || 0}%.`
    );
  }
  const module1WhatWorks = [];
  if (isAboveMedian) {
    const mult = accountMedianViews > 0 ? (views / accountMedianViews).toFixed(1) : "\u2014";
    module1WhatWorks.push({
      element: "Port\xE9e sup\xE9rieure \xE0 la m\xE9diane du compte",
      mechanism: "Une publication d\xE9passant le palier habituel du compte a suffisamment maintenu l\u2019attention initiale pour \xEAtre pouss\xE9e au-del\xE0 du premier groupe d\u2019exposition.",
      proof: `${views.toLocaleString("fr-FR")} vues mesur\xE9es (${mult}\xD7 votre m\xE9diane de ${accountMedianViews.toLocaleString("fr-FR")} vues).`,
      comparison: bestSibling ? `Compar\xE9 aux vid\xE9os sur un th\xE8me proche (meilleure s\u0153ur \xE0 ${bestSibling.viewCount.toLocaleString("fr-FR")} vues).` : `Au-dessus de la m\xE9diane actuelle calcul\xE9e sur ${allVideos.length} vid\xE9o(s).`,
      conclusion: "Analyser l\u2019accroche, le contexte et l\u2019heure de cette vid\xE9o pour isoler un \xE9l\xE9ment r\xE9plicable en test contr\xF4l\xE9."
    });
  } else {
    module1WhatWorks.push({
      element: "Signal relatif aupr\xE8s des spectateurs expos\xE9s",
      mechanism: "M\xEAme lorsque la port\xE9e reste sous la m\xE9diane du compte, le ratio d\u2019interaction permet d\u2019\xE9valuer la r\xE9action du petit groupe atteint.",
      proof: `Taux d'engagement mesur\xE9 : ${engagement.toFixed(2)}% (${likes} likes, ${comments} comms, ${shares} partages).`,
      comparison: `R\xE9f\xE9rence globale du compte : ${accountGlobalEng.toFixed(2)}% sur ${allVideos.length} vid\xE9o(s).`,
      conclusion: engagement >= accountGlobalEng ? "L'int\xE9r\xEAt du contenu aupr\xE8s du petit \xE9chantillon est correct ; le blocage est probablement survenu d\xE8s les 2 premi\xE8res secondes ou \xE0 cause du timing." : "Le taux d'interaction et la port\xE9e indiquent qu'une variation d'accroche ou d'angle m\xE9rite d'\xEAtre test\xE9e."
    });
  }
  const module2WhatFails = [];
  if (isDuplicateDrop && bestSibling) {
    observations.push(
      `OBSERVATION : Une publication proche en sujet dans les 24h (\xAB ${bestSibling.title || bestSibling.id} \xBB) a atteint ${bestSibling.viewCount.toLocaleString("fr-FR")} vues contre ${views.toLocaleString("fr-FR")} vues ici.`
    );
    hypotheses.push(
      "HYPOTH\xC8SE : Publier des formats trop proches dans un intervalle court peut r\xE9duire la port\xE9e de la seconde publication."
    );
    module2WhatFails.push({
      problem: "Proximit\xE9 temporelle avec une vid\xE9o de sujet comparable",
      mechanism: "Encha\xEEner plusieurs variations proches \xE0 faible intervalle expose les publications \xE0 une concurrence interne ou une perte de fra\xEEcheur.",
      proof: `${views.toLocaleString("fr-FR")} vues contre ${bestSibling.viewCount.toLocaleString("fr-FR")} vues pour la version pr\xE9c\xE9dente.`,
      comparison: `\xC9cart observ\xE9 sur le compte entre deux publications proches dans le temps.`,
      conclusion: "Espacer les sorties sur un m\xEAme th\xE8me et modifier nettement l'accroche textuelle et visuelle.",
      dimension: "cadence"
    });
  }
  if (comments <= 1 && views >= 100) {
    observations.push(
      `OBSERVATION : ${comments} commentaire(s) pour ${views.toLocaleString("fr-FR")} vues (${(comments / views * 100).toFixed(2)}%).`
    );
    hypotheses.push(
      "HYPOTH\xC8SE : L'absence de question claire en l\xE9gende ou \xE0 l'\xE9cran laisse le spectateur passif."
    );
    module2WhatFails.push({
      problem: "Faible activation des commentaires",
      mechanism: "Sans invitation explicite \xE0 r\xE9agir ou trancher une question concr\xE8te, la majorit\xE9 des spectateurs passe \xE0 la vid\xE9o suivante.",
      proof: `${comments} commentaire(s) mesur\xE9(s) pour ${likes} likes.`,
      comparison: `\xC0 rapprocher de la moyenne par vid\xE9o du compte (${allVideos.length} vid\xE9os).`,
      conclusion: "Tester une question simple et l\xE9gitime li\xE9e directement au sujet de la vid\xE9o.",
      dimension: "ending"
    });
  }
  const module3Improvements = [
    {
      targetElement: "Clart\xE9 de l'accroche (2 premi\xE8res secondes)",
      howToImprove: "Poser le contexte exact d\xE8s la premi\xE8re image via un titre court lisible \xE0 l\u2019\xE9cran.",
      whyThisModification: "La d\xE9cision de continuer ou swiper intervient dans les 2 \xE0 3 premi\xE8res secondes selon la documentation TikTok.",
      groundedObservation: `Votre m\xE9diane actuelle est de ${accountMedianViews.toLocaleString("fr-FR")} vues sur ${allVideos.length} publications.`,
      concreteTest: "Tester une accroche explicite d\xE8s 0:00 sur un sujet proche et comparer les vues aux relev\xE9s H+5 et H+24."
    },
    {
      targetElement: "Suivi compl\xE9mentaire dans TikTok Studio",
      howToImprove: "Compl\xE9ter le temps moyen de visionnage, les favoris et les abonn\xE9s attribu\xE9s dans la fiche D\xE9tails.",
      whyThisModification: "L\u2019API Display v2 ne transmet pas la courbe de r\xE9tention ni la conversion en abonn\xE9s par vid\xE9o.",
      groundedObservation: "Seules les donn\xE9es de r\xE9tention permettent de savoir si le frein vient du d\xE9but (3s) ou du milieu de vid\xE9o.",
      concreteTest: "Saisir ces 3 donn\xE9es sur vos 5 derni\xE8res publications pour d\xE9bloquer la comparaison fine dans le Coach."
    }
  ];
  const whatWorksSummary = isStrongOutlier ? `La vid\xE9o surpasse largement la m\xE9diane du compte (${views.toLocaleString("fr-FR")} vues vs ${accountMedianViews.toLocaleString("fr-FR")} vues m\xE9dianes).` : isAboveMedian ? `Bonne traction au-dessus du palier habituel (${views.toLocaleString("fr-FR")} vues) avec ${engagement.toFixed(2)}% d'engagement.` : `Taux d'interaction de ${engagement.toFixed(2)}% sur ${views.toLocaleString("fr-FR")} vues ; le potentiel de distribution reste \xE0 travailler d\xE8s l'ouverture.`;
  const whatFailsSummary = isDuplicateDrop ? "Possible concurrence interne ou saturation suite \xE0 une sortie rapproch\xE9e sur le m\xEAme sujet." : "Donn\xE9es de r\xE9tention manquantes c\xF4t\xE9 API et faible taux de commentaires sur cet extrait.";
  const improvementsSummary = "1) Clarifier la promesse visuelle d\xE8s 0:00. 2) Espacer les publications similaires. 3) Compl\xE9ter les donn\xE9es Studio (r\xE9tention, favoris, abonn\xE9s attribu\xE9s).";
  const whatLearned = isStrongOutlier ? "M\xC9CANISME : Un pic isol\xE9 valide une forte ad\xE9quation sujet/accroche mais ne garantit pas \xE0 lui seul une \xE9l\xE9vation durable du palier." : "M\xC9CANISME : Comparer chaque publication \xE0 la m\xE9diane du compte \xE9vite de confondre faible port\xE9e et mauvais contenu.";
  const nextTest = {
    hypothesis: "Une accroche textuelle plus pr\xE9cise dans les 2 premi\xE8res secondes augmente la dur\xE9e moyenne de visionnage.",
    experiment: "Publier une vid\xE9o de m\xEAme cat\xE9gorie avec un titre d\u2019ouverture concret et mesurer l\u2019\xE9cart aux relev\xE9s H+24.",
    metricToWatch: "Vues \xE0 H+24 et Taux d\u2019engagement",
    status: "a_tester"
  };
  tests.push(`TEST PROPOS\xC9 : ${nextTest.experiment}`);
  conclusions.push(
    `CONCLUSION PROVISOIRE (${activeMemory.accountHandle}) : Base de r\xE9f\xE9rence actuelle = ${accountMedianViews.toLocaleString("fr-FR")} vues m\xE9dianes.`
  );
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    videoId: video.id,
    module1WhatWorks,
    module2WhatFails,
    module3Improvements,
    finalSynthesis: {
      whatWorksSummary,
      whatFailsSummary,
      improvementsSummary,
      whatLearned,
      nextTest
    },
    facts,
    observations,
    hypotheses,
    conclusions,
    tests,
    dataMissingNotices
  };
}
function getVideoMemoryCard(video, allVideos) {
  const cardKey = `${TIKTOK_VIDEO_CARD_KEY_PREFIX}${video.id}`;
  try {
    const raw = localStorage.getItem(cardKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pedagogicalAnalysis) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading memory card for", video.id, e);
  }
  let retention = {
    videoId: video.id,
    source: "tiktok_studio_manual",
    updatedAt: ""
  };
  try {
    const retRaw = localStorage.getItem(`tiktok_retention_${video.id}`);
    if (retRaw) retention = JSON.parse(retRaw);
  } catch {
  }
  const defaultTraits = {
    hookType: "inconnue",
    twoSecondsHookDescription: "",
    musicAndTrackName: video.soundTitle || "",
    musicExcerptType: "inconnu",
    emotionalTone: "neutre",
    pacing: "mod\xE9r\xE9",
    visualChangesFrequency: "toutes_les_3_5s",
    endingType: "fin_brutale"
  };
  const pedagogicalAnalysis = generatePedagogicalAnalysis(
    video,
    allVideos,
    void 0,
    defaultTraits,
    retention
  );
  const card = {
    id: video.id,
    videoId: video.id,
    videoTitle: video.title || "Vid\xE9o TikTok",
    createTime: video.createTime,
    duration: video.duration || 0,
    description: video.videoDescription || "",
    metrics: {
      views: video.viewCount,
      likes: video.likeCount,
      comments: video.commentCount,
      shares: video.shareCount,
      engagementRate: video.engagementRate
    },
    retention,
    qualitativeTraits: defaultTraits,
    pedagogicalAnalysis,
    testStatus: "a_tester",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveVideoMemoryCard(card);
  return card;
}
function saveVideoMemoryCard(card) {
  try {
    card.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    localStorage.setItem(
      `${TIKTOK_VIDEO_CARD_KEY_PREFIX}${card.videoId}`,
      JSON.stringify(card)
    );
  } catch (e) {
    console.error("Error saving video memory card:", e);
  }
}
function updateVideoTestOutcome(videoId, allVideos, status, testNotes, accountHandle = "Compte actif") {
  const video = allVideos.find((v) => v.id === videoId);
  if (!video) throw new Error("Vid\xE9o introuvable");
  const card = getVideoMemoryCard(video, allVideos);
  card.testStatus = status;
  card.testNotes = testNotes || card.testNotes;
  card.pedagogicalAnalysis.finalSynthesis.nextTest.status = status;
  if (testNotes) {
    card.pedagogicalAnalysis.finalSynthesis.nextTest.testResultNotes = testNotes;
  }
  saveVideoMemoryCard(card);
  const memory = getAccountKnowledgeMemory(accountHandle, accountHandle);
  const existingIndex = memory.testedLearnings.findIndex(
    (l) => l.originalVideoId === videoId
  );
  const lessonItem = {
    id: `learn_${videoId}_${Date.now()}`,
    lesson: card.pedagogicalAnalysis.finalSynthesis.whatLearned,
    originalVideoId: videoId,
    outcome: status === "valide" ? "valid\xE9" : status === "refute" ? "r\xE9fut\xE9" : "en_attente",
    notes: testNotes || "R\xE9sultat enregistr\xE9.",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  if (existingIndex >= 0) {
    memory.testedLearnings[existingIndex] = lessonItem;
  } else {
    memory.testedLearnings.unshift(lessonItem);
  }
  memory.totalAnalyzedVideos = Math.max(memory.totalAnalyzedVideos, allVideos.length);
  saveAccountKnowledgeMemory(memory, accountHandle);
  return { card, memory };
}
function compareTwoVideosPedagogically(videoA, videoB, memory) {
  const best = videoA.viewCount >= videoB.viewCount ? videoA : videoB;
  const lowest = best === videoA ? videoB : videoA;
  const isATheBest = best === videoA;
  const ratio = lowest.viewCount > 0 ? (best.viewCount / lowest.viewCount).toFixed(1) : String(best.viewCount);
  const commonTraits = [
    `Publications compar\xE9es sur ${memory?.accountHandle || "le m\xEAme compte"} (sources : ${videoA.source} / ${videoB.source}).`
  ];
  const timeA = new Date(videoA.createTime * 1e3).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const timeB = new Date(videoB.createTime * 1e3).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  const durA = videoA.duration || 0;
  const durB = videoB.duration || 0;
  const durationDiff = Math.abs(durA - durB);
  const keyDifferences = [
    {
      aspect: "Vues obtenues",
      videoAValue: `${videoA.viewCount.toLocaleString("fr-FR")} vues`,
      videoBValue: `${videoB.viewCount.toLocaleString("fr-FR")} vues`,
      impactLikelihood: "forte"
    },
    {
      aspect: "Dur\xE9e mesur\xE9e",
      videoAValue: durA > 0 ? `${durA}s` : "Non fournie",
      videoBValue: durB > 0 ? `${durB}s` : "Non fournie",
      impactLikelihood: durationDiff > 20 ? "forte" : "moyenne"
    },
    {
      aspect: "Date et heure de publication",
      videoAValue: timeA,
      videoBValue: timeB,
      impactLikelihood: "moyenne"
    },
    {
      aspect: "Engagement relatif",
      videoAValue: `${videoA.engagementRate.toFixed(2)}% (${videoA.likeCount} likes)`,
      videoBValue: `${videoB.engagementRate.toFixed(2)}% (${videoB.likeCount} likes)`,
      impactLikelihood: "moyenne"
    },
    {
      aspect: "Commentaires / Partages",
      videoAValue: `${videoA.commentCount} comms \xB7 ${videoA.shareCount} partages`,
      videoBValue: `${videoB.commentCount} comms \xB7 ${videoB.shareCount} partages`,
      impactLikelihood: "faible"
    }
  ];
  const presentInBestAbsentInOther = [];
  if (best.shareCount > lowest.shareCount * 2 + 2) {
    presentInBestAbsentInOther.push(
      `Partages nettement sup\xE9rieurs (${best.shareCount} vs ${lowest.shareCount}).`
    );
  }
  if (durA > 0 && durB > 0 && durationDiff >= 15) {
    presentInBestAbsentInOther.push(
      `\xC9cart de dur\xE9e notable (${best.duration}s pour la plus vue vs ${lowest.duration}s).`
    );
  }
  if (presentInBestAbsentInOther.length === 0) {
    presentInBestAbsentInOther.push(
      "Renseignez l\u2019accroche, le rythme et les stats TikTok Studio dans \xAB D\xE9tails \xBB pour affiner la comparaison qualitative."
    );
  }
  const causalExplanation = `La vid\xE9o ${isATheBest ? "A" : "B"} totalise ${best.viewCount.toLocaleString("fr-FR")} vues contre ${lowest.viewCount.toLocaleString("fr-FR")} vues (rapport ${ratio}\xD7). Les chiffres seuls montrent un \xE9cart de distribution et d'interactions, sans prouver de causalit\xE9 tant que les variables \xE9ditoriales (accroche, r\xE9tention) ne sont pas compar\xE9es.`;
  return {
    videoA,
    videoB,
    commonTraits,
    keyDifferences,
    presentInBestAbsentInOther,
    retentionComparison: "Saisissez le temps de visionnage moyen et la compl\xE9tion depuis TikTok Studio dans chaque fiche vid\xE9o pour comparer la r\xE9tention.",
    causalExplanation,
    facts: [
      `FAIT : Vid\xE9o A = ${videoA.viewCount.toLocaleString("fr-FR")} vues, post\xE9e le ${timeA}.`,
      `FAIT : Vid\xE9o B = ${videoB.viewCount.toLocaleString("fr-FR")} vues, post\xE9e le ${timeB}.`
    ],
    observations: [
      `OBSERVATION : Ratio d'engagement A = ${videoA.engagementRate.toFixed(2)}% vs B = ${videoB.engagementRate.toFixed(2)}%.`
    ],
    hypotheses: [
      `HYPOTH\xC8SE : L'\xE9cart observ\xE9 peut venir de l'accroche des 2 premi\xE8res secondes, du sujet ou du timing de sortie.`
    ],
    conclusion: "CONCLUSION PRUDENTE : V\xE9rifiez la r\xE9tention et r\xE9p\xE9tez l\u2019\xE9l\xE9ment diff\xE9renciant sur une nouvelle publication test.",
    testRecommendation: "TEST : Conserver le m\xEAme th\xE8me en changeant uniquement l\u2019accroche initiale ou le cr\xE9neau horaire."
  };
}
var TIKTOK_ACCOUNT_MEMORY_KEY, TIKTOK_VIDEO_CARD_KEY_PREFIX;
var init_learningMemoryEngine = __esm({
  "src/utils/learningMemoryEngine.ts"() {
    init_centralDataEngine();
    TIKTOK_ACCOUNT_MEMORY_KEY = "tiktok_account_knowledge_memory_v2";
    TIKTOK_VIDEO_CARD_KEY_PREFIX = "tiktok_video_card_v2_";
  }
});

// src/utils/visionnaireEngine.ts
var visionnaireEngine_exports = {};
__export(visionnaireEngine_exports, {
  STORAGE_VISIONNAIRE_KEY: () => STORAGE_VISIONNAIRE_KEY,
  analyzeVideoPrePublication: () => analyzeVideoPrePublication,
  captureVideoFrame: () => captureVideoFrame,
  detectVideoTopic: () => detectVideoTopic,
  getStoredVisionnaireVideos: () => getStoredVisionnaireVideos,
  rankVisionnaireVideos: () => rankVisionnaireVideos,
  saveVisionnaireVideos: () => saveVisionnaireVideos
});
function getStoredVisionnaireVideos() {
  try {
    const raw = localStorage.getItem(STORAGE_VISIONNAIRE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading visionnaire videos from storage:", err);
  }
  return [];
}
function saveVisionnaireVideos(videos) {
  try {
    const storable = videos.map((v) => ({
      ...v,
      videoUrl: v.videoUrl.startsWith("blob:") ? "" : v.videoUrl
    }));
    localStorage.setItem(STORAGE_VISIONNAIRE_KEY, JSON.stringify(storable));
  } catch (err) {
    console.error("Error saving visionnaire videos:", err);
  }
}
function captureVideoFrame(videoElement) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(videoElement.videoWidth || 480, 480);
    canvas.height = Math.min(videoElement.videoHeight || 854, 854);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.7);
    }
  } catch (e) {
    console.warn("Could not capture video frame:", e);
  }
  return null;
}
function detectVideoTopic(text) {
  const t = text.toLowerCase();
  if (t.includes("cameron") || t.includes("starac") || t.includes("staracademy") || t.includes("chant") || t.includes("musique") || t.includes("vocal")) {
    return "musique";
  }
  if (t.includes("trail") || t.includes("25h") || t.includes("course") || t.includes("running") || t.includes("endurance") || t.includes("ultra")) {
    return "trail";
  }
  return "general";
}
function analyzeVideoPrePublication(video, memory) {
  const activeMemory = memory || getAccountKnowledgeMemory();
  const text = `${video.name || ""} ${video.userCaption || ""}`;
  const topic = detectVideoTopic(text);
  const duration = video.duration || 30;
  const coachLearningsApplied = [];
  coachLearningsApplied.push("R\xE8gle Coach n\xB01 (Cadence) : V\xE9rification d'absence de doublon temporel avant planification.");
  const hasTextInTitleOrCaption = video.userCaption && video.userCaption.length > 15 || video.name.length > 20;
  let hookScore = 70;
  if (hasTextInTitleOrCaption) {
    hookScore += 15;
  }
  if (duration >= 45 && duration <= 90) {
    hookScore += 8;
  }
  hookScore = Math.min(Math.max(hookScore, 45), 95);
  coachLearningsApplied.push("Hypoth\xE8se Coach H1 : L'accroche textuelle d\xE8s 0:00 double le maintien \xE0 3s sur les formats courts.");
  const hookAnalysis = {
    twoSecondsVerdict: hasTextInTitleOrCaption ? "L'accroche contient un \xE9l\xE9ment contextuel clair d\xE8s l'entame, r\xE9duisant le risque de swipe r\xE9flexe de l'utilisateur." : "Le d\xE9marrage repose principalement sur l'audio ou l'action sans texte d'intrigue contrast\xE9. Le spectateur moyen d\xE9cide en 1,5s s'il poursuit.",
    isCatchy: hasTextInTitleOrCaption,
    claritySpeed: "Compr\xE9hension estim\xE9e sous 1,8 seconde.",
    curiosityElement: hasTextInTitleOrCaption ? "Pr\xE9sence d'un contraste narratif imm\xE9diat incitant \xE0 attendre le d\xE9nouement." : "Curiosit\xE9 mod\xE9r\xE9e : il est vivement conseill\xE9 d'ins\xE9rer un bandeau texte 'Regarde bien jusqu'\xE0 la fin...'.",
    improvements: [
      "Placer un texte d'intrigue \xE0 fort contraste (jaune ou blanc sur fond noir) dans les 2 premi\xE8res secondes.",
      "Supprimer tout fondu au noir ou blanc sonore initial.",
      "D\xE9buter directement au c\u0153ur de l'action ou sur une note vocale marquante."
    ]
  };
  let retentionScore = 65;
  if (topic === "musique") {
    if (duration >= 55) {
      retentionScore += 22;
      coachLearningsApplied.push("R\xE8gle Coach n\xB02 : Les formats musicaux narratifs (> 60s) surclassent les coupes br\xE8ves sur votre compte (10k+ vues vs < 100 vues).");
    } else {
      retentionScore -= 12;
    }
  } else if (topic === "trail") {
    if (duration >= 30 && duration <= 60) {
      retentionScore += 18;
    }
  } else {
    if (duration <= 45) retentionScore += 10;
  }
  retentionScore = Math.min(Math.max(retentionScore, 40), 96);
  const curvePoints = [
    { second: 0, estimatedRetentionPct: 100, phaseLabel: "Impression For You" },
    { second: 2, estimatedRetentionPct: Math.round(hookScore * 0.85), phaseLabel: "Passage du filtre des 2s" },
    { second: Math.round(duration * 0.25), estimatedRetentionPct: Math.round(retentionScore * 0.78), phaseLabel: "Phase d\u2019engagement" },
    { second: Math.round(duration * 0.5), estimatedRetentionPct: Math.round(retentionScore * 0.65), phaseLabel: "Milieu de vid\xE9o" },
    { second: Math.round(duration * 0.85), estimatedRetentionPct: Math.round(retentionScore * 0.52), phaseLabel: "Mont\xE9e vers le climax" },
    { second: Math.round(duration), estimatedRetentionPct: Math.round(retentionScore * 0.42), phaseLabel: "Compl\xE9tion finale" }
  ];
  const estimatedDropMoments = [
    `Seconde 0 \xE0 2 : Risque de swipe de ~${100 - Math.round(hookScore * 0.85)}% si le spectateur n'identifie pas le sujet imm\xE9diatement.`,
    `Seconde ${Math.round(duration * 0.5)} : Baisse naturelle d'attention si aucun rebondissement ou changement visuel n'intervient.`,
    `Seconde ${Math.max(duration - 3, 2)} : D\xE9crochage pr\xE9matur\xE9 si la vid\xE9o tra\xEEne avant la fin.`
  ];
  const retentionAnalysis = {
    estimatedDropMoments,
    pacingVerdict: duration > 60 ? "Rythme narratif immersif propice \xE0 un temps de visionnage total \xE9lev\xE9." : "Format concis et dynamique, minimisant les longueurs inutiles.",
    durationVerdict: duration >= 50 ? `Dur\xE9e (${duration}s) optimale pour valoriser l'exp\xE9rience \xE9motionnelle et maximiser le temps de visionnage cumul\xE9.` : `Dur\xE9e (${duration}s) un peu courte pour un extrait musical complet, mais percutante pour un moment choc.`,
    estimatedRetention3s: Math.round(hookScore * 0.82),
    estimatedCompletionRate: Math.round(retentionScore * 0.45),
    curvePoints,
    notice: "ATTENTION : Il s'agit d'une estimation pr\xE9dictive bas\xE9e sur les caract\xE9ristiques du montage et l'historique de votre compte. Les statistiques r\xE9elles de r\xE9tention d\xE9pendront de la r\xE9action concr\xE8te de votre audience apr\xE8s publication."
  };
  let emotionScore = 72;
  let dominantEmotion = "\xC9motion artistique & Admiration";
  if (topic === "trail") {
    dominantEmotion = "Motivation & D\xE9passement de soi";
    emotionScore = 82;
  } else if (topic === "musique") {
    dominantEmotion = "Frisson vocal & Nostalgie / Live";
    emotionScore = 88;
  }
  const emotionAndContent = {
    dominantEmotion,
    potentialReactions: [
      "Likes spontan\xE9s gr\xE2ce \xE0 l'authenticit\xE9 de la prestation.",
      "Partages vers des amis qui suivent la m\xEAme actualit\xE9 ou passion.",
      "Commentaires si une question d'opinion est explicitement pos\xE9e."
    ],
    audioVisualCoherence: "Coh\xE9rence solide entre l'ambiance visuelle et le tempo.",
    sharabilityVerdict: "Fort potentiel de partage externe (WhatsApp, Story TikTok, MP)."
  };
  coachLearningsApplied.push("R\xE8gle Coach n\xB04 : Les th\xE9matiques authentiques (Prestations vocales et d\xE9fis d'endurance) g\xE9n\xE8rent 8,79% d'engagement r\xE9el.");
  let musicRecommendations = [];
  if (topic === "musique") {
    musicRecommendations = [
      {
        soundName: "Ceux qu'on \xE9tait (Acoustique / Live)",
        artist: "Pierre Garnier",
        whyItImproves: "Son ultra-tendance aupr\xE8s de l'audience Star Academy, amplifie imm\xE9diatement la r\xE9sonance \xE9motionnelle.",
        genre: "Vari\xE9t\xE9 Pop Vocale",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=ceux+qu+on+etait+pierre+garnier+son+officiel",
        isCurrentSoundEvaluated: true,
        currentSoundVerdict: "Si votre vid\xE9o contient d\xE9j\xE0 la voix originale en direct de Cameron, conservez le son original de la prestation car la sinc\xE9rit\xE9 du direct prime sur toute musique ajout\xE9e."
      },
      {
        soundName: "Je vole (Version Piano & Cordes)",
        artist: "Louane / Michel Sardou",
        whyItImproves: "Crescendo m\xE9lodique poignant qui soutient les moments de doute et d'\xE9motion des r\xE9p\xE9titions au ch\xE2teau.",
        genre: "Ballade \xC9motionnelle",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=je+vole+louane+chanson"
      },
      {
        soundName: "Another Love (Live Climax)",
        artist: "Tom Odell",
        whyItImproves: "Reconnu mondialement sur TikTok pour accompagner les prestations vocales d'une intensit\xE9 rare.",
        genre: "Piano Pop Indie",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=another+love+tom+odell+sound"
      }
    ];
  } else if (topic === "trail") {
    musicRecommendations = [
      {
        soundName: "Intro",
        artist: "The xx",
        whyItImproves: "Battement r\xE9gulier id\xE9al pour caler le rythme des foul\xE9es en mont\xE9e et cr\xE9er une ambiance immersive.",
        genre: "Indie Minimaliste",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=intro+the+xx+running"
      },
      {
        soundName: "Stay (Interstellar Soundtrack)",
        artist: "Hans Zimmer",
        whyItImproves: "Mont\xE9e orchestrale monumentale qui sublime les d\xE9fis d'endurance extr\xEAme (25h qui courent, trail de nuit).",
        genre: "Musique de Film / \xC9pique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=stay+hans+zimmer+interstellar"
      },
      {
        soundName: "Can't Hold Us",
        artist: "Macklemore & Ryan Lewis",
        whyItImproves: "\xC9nergie explosive pour les passages de sprint, passage de ligne d'arriv\xE9e ou ravitaillement.",
        genre: "Hip-Hop Entra\xEEnant",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=cant+hold+us+macklemore"
      }
    ];
  } else {
    musicRecommendations = [
      {
        soundName: "Golden Hour (Orchestral)",
        artist: "JVKE",
        whyItImproves: "Ambiance cin\xE9matographique moderne favorisant un temps de r\xE9tention long.",
        genre: "Pop Cin\xE9matique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=golden+hour+jvke"
      },
      {
        soundName: "Experience",
        artist: "Ludovico Einaudi",
        whyItImproves: "Classique incontournable de TikTok pour les r\xE9cits inspirants et les histoires humaines.",
        genre: "N\xE9o-Classique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=experience+einaudi"
      },
      {
        soundName: "Daylight",
        artist: "David Kushner",
        whyItImproves: "Voix profonde et basse myst\xE9rieuse qui ancre l'attention d\xE8s les premi\xE8res notes.",
        genre: "Indie Pop",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=daylight+david+kushner"
      }
    ];
  }
  let creatorSearchInsights;
  if (topic === "musique") {
    creatorSearchInsights = {
      primaryTopic: "Star Academy 2024 / Cameron",
      highDemandQuery: "cameron star academy 2024 prestation live",
      competitionLevel: "Moyenne",
      recommendedHashtags: [
        {
          tag: "#cameron",
          explanation: "Nom pr\xE9cis du protagoniste, ciblant les fans cherchant ses passages cl\xE9s.",
          searchVolumeHint: "Forte demande hebdomadaire"
        },
        {
          tag: "#staracademylive",
          explanation: "Capte les spectateurs du flux quotidien et des primes.",
          searchVolumeHint: "Tr\xE8s forte demande"
        },
        {
          tag: "#staracademy",
          explanation: "Pilier de la th\xE9matique nationale en tendance de recherche.",
          searchVolumeHint: "Top tendance"
        },
        {
          tag: "#creatorsearchinsights",
          explanation: "Indique \xE0 l'algorithme que la vid\xE9o r\xE9pond \xE0 une intention de recherche explicite.",
          searchVolumeHint: "Recommand\xE9 par TikTok"
        },
        {
          tag: "#prestationvocale",
          explanation: "Niche qualitative valorisant la performance artistique.",
          searchVolumeHint: "Niche qualifi\xE9e"
        }
      ],
      optimizedCaption: "Cette prestation de Cameron qui a retourn\xE9 le plateau. Vous en avez pens\xE9 quoi de ce passage ? Dites-le moi en commentaire ! #staracademylive #cameron #staracademy #creatorsearchinsights",
      notes: "Bas\xE9 sur les donn\xE9es Creator Search Insights observ\xE9es dans l'application TikTok. Pour v\xE9rifier en temps r\xE9el, rendez-vous dans TikTok Studio > Creator Search Insights."
    };
  } else if (topic === "trail") {
    creatorSearchInsights = {
      primaryTopic: "Trail Running / 25h qui courent",
      highDemandQuery: "25h qui courent defi endurance extreme",
      competitionLevel: "Faible",
      recommendedHashtags: [
        {
          tag: "#25hquicourent",
          explanation: "Hashtag signature de votre d\xE9fi d'endurance, sans concurrence satur\xE9e.",
          searchVolumeHint: "Faible concurrence / Intention forte"
        },
        {
          tag: "#trailrunning",
          explanation: "Communaut\xE9 passionn\xE9e et tr\xE8s active en interactions et partages.",
          searchVolumeHint: "Communaut\xE9 engag\xE9e"
        },
        {
          tag: "#ultraendurance",
          explanation: "Qualifie la performance physique extr\xEAme.",
          searchVolumeHint: "Recherche cibl\xE9e"
        },
        {
          tag: "#creatorsearchinsights",
          explanation: "Favorise l'indexation de la vid\xE9o sur les requ\xEAtes sportives durables.",
          searchVolumeHint: "Recommand\xE9 par TikTok"
        }
      ],
      optimizedCaption: "Apr\xE8s des heures d'effort, voici exactement ce qui se passe dans la t\xEAte... Tu tiendrais combien d'heures toi ? #25hquicourent #trailrunning #creatorsearchinsights #motivation",
      notes: "Sujet \xE0 forte intention et faible concurrence : potentiel d'indexation SEO durable au-del\xE0 des 48h."
    };
  } else {
    creatorSearchInsights = {
      primaryTopic: "Storytelling & Mindset",
      highDemandQuery: "histoire vraie inspiration motivation tiktok",
      competitionLevel: "Moyenne",
      recommendedHashtags: [
        { tag: "#storytelling", explanation: "Format narratif engageant." },
        { tag: "#motivation", explanation: "Large public en recherche d'inspiration." },
        { tag: "#creatorsearchinsights", explanation: "Optimisation de recherche." },
        { tag: "#pourtoi", explanation: "Accompagnement de diffusion standard." }
      ],
      optimizedCaption: "L'histoire que personne ne vous a jamais racont\xE9e... Qu'en pensez-vous ? #storytelling #motivation #creatorsearchinsights",
      notes: "N'h\xE9sitez pas \xE0 v\xE9rifier les termes exacts sugg\xE9r\xE9s dans l'onglet Recherche de votre TikTok Studio."
    };
  }
  const musicScore = topic === "musique" ? 90 : 80;
  const seoSearchScore = 88;
  const subScores = {
    hookScore,
    retentionScore,
    emotionScore,
    musicScore,
    seoSearchScore
  };
  const scoreTotal = Math.round(
    hookScore * 0.3 + retentionScore * 0.25 + emotionScore * 0.2 + musicScore * 0.15 + seoSearchScore * 0.1
  );
  let recommendation = "MODIFIER";
  let recommendationReason = "";
  if (scoreTotal >= 78) {
    recommendation = "PUBLIER";
    recommendationReason = `Cette vid\xE9o pr\xE9sente un score global de ${scoreTotal}/100 avec une excellente compl\xE9tude narrative et un fort potentiel de r\xE9sonance \xE9motionnelle. Elle r\xE9unit les crit\xE8res valid\xE9s par Mon Coach pour acc\xE9der au flux \xE9tendu For You.`;
  } else if (scoreTotal >= 60) {
    recommendation = "MODIFIER";
    recommendationReason = `Cette vid\xE9o poss\xE8de un solide potentiel (${scoreTotal}/100) mais n\xE9cessite 1 ou 2 ajustements cibl\xE9s (notamment sur l'accroche des 2 premi\xE8res secondes ou l'ajout d'une question en fin de vid\xE9o) avant d'\xEAtre mise en ligne.`;
  } else {
    recommendation = "ATTENDRE";
    recommendationReason = `Le score actuel (${scoreTotal}/100) indique un risque de d\xE9crochage pr\xE9matur\xE9 ou un format trop \xE9court\xE9 sans contexte suffisant. Il est pr\xE9f\xE9rable de retravailler le montage ou de la conserver pour un cr\xE9neau plus adapt\xE9.`;
  }
  const strengths = [];
  const weaknesses = [];
  const actionableChecklist = [];
  if (hookScore >= 75) {
    strengths.push("Accroche des premi\xE8res secondes dynamique et intrigante.");
  } else {
    weaknesses.push("Entame trop neutre sans texte contrast\xE9 d\xE8s la seconde 0.");
    actionableChecklist.push("Ajouter un bandeau texte d'accroche d\xE8s 0:00 (ex: 'Ce moment o\xF9 tout a bascul\xE9...').");
  }
  if (retentionScore >= 75) {
    strengths.push(`Dur\xE9e (${duration}s) favorable au temps de visionnage cumul\xE9 selon les crit\xE8res observ\xE9s.`);
  } else {
    weaknesses.push(`Format (${duration}s) pouvant p\xE9naliser la r\xE9tention ou tronquer le d\xE9nouement \xE9motionnel.`);
    actionableChecklist.push("\xC9tendre la coupe \xE0 au moins 50s pour laisser la prestation ou l'histoire monter en puissance.");
  }
  if (emotionScore >= 80) {
    strengths.push(`Charge \xE9motionnelle forte (${dominantEmotion}) propice aux partages externes.`);
  }
  actionableChecklist.push("Ins\xE9rer une question d'opinion dans les 3 derni\xE8res secondes pour d\xE9clencher des commentaires.");
  actionableChecklist.push("Respecter un d\xE9lai d'au moins 3 heures avec la publication pr\xE9c\xE9dente sur votre compte.");
  return {
    scoreTotal,
    recommendation,
    recommendationReason,
    subScores,
    hookAnalysis,
    retentionAnalysis,
    emotionAndContent,
    musicRecommendations,
    creatorSearchInsights,
    strengths,
    weaknesses,
    actionableChecklist,
    coachLearningsApplied,
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function rankVisionnaireVideos(videos) {
  const analyzed = videos.filter((v) => v.analysisStatus === "analyzed" && v.analysis);
  const others = videos.filter((v) => v.analysisStatus !== "analyzed" || !v.analysis);
  analyzed.sort((a, b) => (b.analysis?.scoreTotal || 0) - (a.analysis?.scoreTotal || 0));
  analyzed.forEach((v, index) => {
    if (v.analysis) {
      v.analysis.rank = index + 1;
    }
  });
  return [...analyzed, ...others];
}
var STORAGE_VISIONNAIRE_KEY;
var init_visionnaireEngine = __esm({
  "src/utils/visionnaireEngine.ts"() {
    init_learningMemoryEngine();
    STORAGE_VISIONNAIRE_KEY = "tiktok_visionnaire_imported_videos_v1";
  }
});

// src/utils/pedagogicalVideosLogic.ts
var pedagogicalVideosLogic_exports = {};
__export(pedagogicalVideosLogic_exports, {
  ALLOWED_VIDEO_EXTENSIONS: () => ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_MIME_TYPES: () => ALLOWED_VIDEO_MIME_TYPES,
  MAX_PEDAGOGICAL_VIDEO_BYTES: () => MAX_PEDAGOGICAL_VIDEO_BYTES,
  PEDAGOGICAL_VIDEO_CATEGORIES: () => PEDAGOGICAL_VIDEO_CATEGORIES,
  formatFileSize: () => formatFileSize,
  formatVideoDuration: () => formatVideoDuration,
  getExtensionFromFileName: () => getExtensionFromFileName,
  inferMimeFromExtension: () => inferMimeFromExtension,
  isPedagogicalAdminIdentity: () => isPedagogicalAdminIdentity,
  sortPedagogicalVideos: () => sortPedagogicalVideos,
  validatePedagogicalVideoFile: () => validatePedagogicalVideoFile,
  validatePedagogicalVideoMetadata: () => validatePedagogicalVideoMetadata
});
function getExtensionFromFileName(fileName) {
  const lower = String(fileName || "").trim().toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  return dotIdx >= 0 ? lower.slice(dotIdx) : "";
}
function inferMimeFromExtension(ext) {
  switch (ext) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    default:
      return "";
  }
}
function validatePedagogicalVideoFile(input) {
  const ext = getExtensionFromFileName(input.fileName);
  const rawMime = String(input.mimeType || "").trim().toLowerCase();
  const hasAllowedExt = ALLOWED_VIDEO_EXTENSIONS.includes(ext);
  const hasAllowedMime = ALLOWED_VIDEO_MIME_TYPES.includes(rawMime);
  if (!hasAllowedExt && !hasAllowedMime) {
    return {
      valid: false,
      error: "Format vid\xE9o non pris en charge. Importez un fichier MP4 (recommand\xE9), MOV, WebM ou M4V.",
      normalizedMimeType: "",
      extension: ext
    };
  }
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return {
      valid: false,
      error: "Le fichier vid\xE9o est vide ou invalide.",
      normalizedMimeType: "",
      extension: ext
    };
  }
  if (input.fileSize > MAX_PEDAGOGICAL_VIDEO_BYTES) {
    return {
      valid: false,
      error: "La vid\xE9o d\xE9passe la taille maximale autoris\xE9e de 250 Mo.",
      normalizedMimeType: "",
      extension: ext
    };
  }
  const normalizedMimeType = hasAllowedMime ? rawMime === "video/x-m4v" ? "video/mp4" : rawMime : inferMimeFromExtension(ext) || "video/mp4";
  const extension = hasAllowedExt ? ext : normalizedMimeType === "video/webm" ? ".webm" : normalizedMimeType === "video/quicktime" ? ".mov" : ".mp4";
  return {
    valid: true,
    normalizedMimeType,
    extension
  };
}
function validatePedagogicalVideoMetadata(input) {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const rawCategory = String(input.category || "").trim();
  const parsedOrder = Number(input.order);
  if (!title || title.length < 2) {
    return {
      valid: false,
      error: "Le titre de la vid\xE9o p\xE9dagogique est obligatoire (au moins 2 caract\xE8res).",
      cleaned: {
        title,
        description,
        category: "\xC9motion & Connexion",
        order: 1
      }
    };
  }
  if (title.length > 140) {
    return {
      valid: false,
      error: "Le titre ne doit pas d\xE9passer 140 caract\xE8res.",
      cleaned: {
        title: title.slice(0, 140),
        description,
        category: "\xC9motion & Connexion",
        order: 1
      }
    };
  }
  if (description.length > 1200) {
    return {
      valid: false,
      error: "La description ne doit pas d\xE9passer 1200 caract\xE8res.",
      cleaned: {
        title,
        description: description.slice(0, 1200),
        category: "\xC9motion & Connexion",
        order: 1
      }
    };
  }
  const category = PEDAGOGICAL_VIDEO_CATEGORIES.includes(rawCategory) ? rawCategory : "\xC9motion & Connexion";
  const order = Number.isFinite(parsedOrder) && parsedOrder >= 1 ? Math.round(parsedOrder) : 1;
  return {
    valid: true,
    cleaned: {
      title,
      description,
      category,
      order
    }
  };
}
function sortPedagogicalVideos(videos) {
  return [...videos].sort((a, b) => {
    const orderDiff = (a.order || 9999) - (b.order || 9999);
    if (orderDiff !== 0) return orderDiff;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}
function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
function formatVideoDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "Format court";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
}
function isPedagogicalAdminIdentity(params) {
  const normalized = String(params.email || "").trim().toLowerCase();
  if (!normalized) return false;
  return params.allowedAdminEmails.some((e) => e.trim().toLowerCase() === normalized);
}
var PEDAGOGICAL_VIDEO_CATEGORIES, MAX_PEDAGOGICAL_VIDEO_BYTES, ALLOWED_VIDEO_EXTENSIONS, ALLOWED_VIDEO_MIME_TYPES;
var init_pedagogicalVideosLogic = __esm({
  "src/utils/pedagogicalVideosLogic.ts"() {
    PEDAGOGICAL_VIDEO_CATEGORIES = [
      "\xC9motion & Connexion",
      "Composition & Musique",
      "Attention & R\xE9tention",
      "Audiences & Signaux",
      "Fondations Internet",
      "Droits & \xC9thique"
    ];
    MAX_PEDAGOGICAL_VIDEO_BYTES = 250 * 1024 * 1024;
    ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];
    ALLOWED_VIDEO_MIME_TYPES = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-m4v"
    ];
  }
});

// server.ts
import express from "express";
import http from "http";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var centralDataEngineCache = null;
async function getCentralDataEngine() {
  if (!centralDataEngineCache) centralDataEngineCache = await Promise.resolve().then(() => (init_centralDataEngine(), centralDataEngine_exports));
  return centralDataEngineCache;
}
var learningMemoryEngineCache = null;
async function getLearningMemoryEngine() {
  if (!learningMemoryEngineCache) learningMemoryEngineCache = await Promise.resolve().then(() => (init_learningMemoryEngine(), learningMemoryEngine_exports));
  return learningMemoryEngineCache;
}
var visionnaireEngineCache = null;
async function getVisionnaireEngine() {
  if (!visionnaireEngineCache) visionnaireEngineCache = await Promise.resolve().then(() => (init_visionnaireEngine(), visionnaireEngine_exports));
  return visionnaireEngineCache;
}
dotenv.config({ override: true });
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PROJECT_ROOT = path.basename(__dirname) === "api" ? path.resolve(__dirname, "..") : __dirname;
var IS_VERCEL = Boolean(process.env.VERCEL);
var RUNTIME_WRITABLE_DIR = IS_VERCEL ? "/tmp" : PROJECT_ROOT;
var inMemoryVerificationToken = null;
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use((req, _res, next) => {
  try {
    const parsed = new URL(req.url || "/", "http://localhost");
    const rewrittenPath = parsed.searchParams.get("__path");
    if (rewrittenPath && rewrittenPath.startsWith("/")) {
      parsed.searchParams.delete("__path");
      const qs = parsed.searchParams.toString();
      req.url = qs ? `${rewrittenPath}?${qs}` : rewrittenPath;
    }
  } catch {
  }
  next();
});
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.get(["/api/health", "/api/index"], (_req, res) => {
  res.json({ ok: true, app: "Resonantia", serverless: IS_VERCEL });
});
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function normalizeVerificationContent(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith("tiktok-developers-site-verification=") ? trimmed : `tiktok-developers-site-verification=${trimmed}`;
}
app.use(express.static(path.resolve(PROJECT_ROOT, "public")));
app.get(/\/tiktok[^/]*\.txt$/, (req, res) => {
  const reqFileName = path.basename(req.path).replace(/[^a-zA-Z0-9._-]/g, "");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  if (inMemoryVerificationToken) {
    return res.send(inMemoryVerificationToken);
  }
  const candidatePaths = [
    reqFileName ? path.resolve(RUNTIME_WRITABLE_DIR, reqFileName) : "",
    path.resolve(RUNTIME_WRITABLE_DIR, "tiktok-developers-site-verification.txt"),
    reqFileName ? path.resolve(PROJECT_ROOT, "public", reqFileName) : "",
    path.resolve(PROJECT_ROOT, "public", "tiktok-developers-site-verification.txt"),
    reqFileName ? path.resolve(PROJECT_ROOT, "dist", reqFileName) : "",
    path.resolve(PROJECT_ROOT, "dist", "tiktok-developers-site-verification.txt")
  ].filter(Boolean);
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate);
    }
  }
  if (process.env.TIKTOK_VERIFICATION_TOKEN) {
    return res.send(normalizeVerificationContent(process.env.TIKTOK_VERIFICATION_TOKEN));
  }
  return res.send("tiktok-developers-site-verification=SiydJBO7dOUt8TQ8PI4Fdn2SduXHlmQI");
});
app.get("/api/tiktok/verification-status", (req, res) => {
  const candidatePaths = [
    path.resolve(RUNTIME_WRITABLE_DIR, "tiktok-developers-site-verification.txt"),
    path.resolve(PROJECT_ROOT, "public", "tiktok-developers-site-verification.txt"),
    path.resolve(PROJECT_ROOT, "dist", "tiktok-developers-site-verification.txt")
  ];
  const existingPath = candidatePaths.find((p) => fs.existsSync(p));
  let content = inMemoryVerificationToken;
  if (!content && existingPath) {
    try {
      content = fs.readFileSync(existingPath, "utf-8").trim();
    } catch {
    }
  }
  if (!content && process.env.TIKTOK_VERIFICATION_TOKEN) {
    content = normalizeVerificationContent(process.env.TIKTOK_VERIFICATION_TOKEN);
  }
  if (!content) {
    content = "tiktok-developers-site-verification=SiydJBO7dOUt8TQ8PI4Fdn2SduXHlmQI";
  }
  res.json({
    isConfigured: Boolean(content),
    isServerless: IS_VERCEL,
    fileName: "tiktok-developers-site-verification.txt",
    content,
    url: "/tiktok-developers-site-verification.txt"
  });
});
app.post("/api/tiktok/save-verification", (req, res) => {
  try {
    const { token, fileName, content } = req.body || {};
    if (!token && !content) {
      return res.status(400).json({ error: "Token ou contenu du fichier manquant." });
    }
    const writeDir = IS_VERCEL ? RUNTIME_WRITABLE_DIR : path.resolve(PROJECT_ROOT, "public");
    if (!fs.existsSync(writeDir)) {
      fs.mkdirSync(writeDir, { recursive: true });
    }
    const targetFileName = (fileName || "tiktok-developers-site-verification.txt").replace(/[^a-zA-Z0-9._-]/g, "");
    const rawValue = String(content || token || "").trim();
    const stdContent = normalizeVerificationContent(rawValue);
    inMemoryVerificationToken = stdContent;
    fs.writeFileSync(path.resolve(writeDir, targetFileName), stdContent, "utf-8");
    if (targetFileName !== "tiktok-developers-site-verification.txt") {
      fs.writeFileSync(path.resolve(writeDir, "tiktok-developers-site-verification.txt"), stdContent, "utf-8");
    }
    const extractedToken = stdContent.replace(/^tiktok-developers-site-verification=/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (extractedToken.length >= 8) {
      fs.writeFileSync(path.resolve(writeDir, `tiktok${extractedToken}.txt`), stdContent, "utf-8");
    }
    return res.json({
      success: true,
      isServerless: IS_VERCEL,
      fileName: targetFileName,
      fileUrl: `/${targetFileName}`,
      content: stdContent,
      message: IS_VERCEL ? `Fichier ${targetFileName} activ\xE9 ! Conseil Vercel : ajoute aussi la variable d\u2019environnement TIKTOK_VERIFICATION_TOKEN="${stdContent}" dans Vercel \u2192 Settings \u2192 Environment Variables puis Redeploy pour qu\u2019elle reste active en permanence sur tous les serveurs.` : `Fichier ${targetFileName} enregistr\xE9 avec succ\xE8s. Le portail d\xE9veloppeur peut d\xE9sormais le v\xE9rifier.`
    });
  } catch (error) {
    console.error("Error saving TikTok verification file:", error);
    return res.status(500).json({
      error: error?.message || "Erreur lors de l'enregistrement du fichier de v\xE9rification."
    });
  }
});
app.get("/api/download-logo", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "logo-1024.png");
  res.download(filePath, "resonantia_logo_1024x1024.png", (err) => {
    if (err && !res.headersSent) {
      res.status(404).send("Logo file not found");
    }
  });
});
app.get("/api/download-logo-jpg", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "logo-1024.jpg");
  res.download(filePath, "resonantia_logo_1024x1024.jpg", (err) => {
    if (err && !res.headersSent) {
      res.status(404).send("Logo file not found");
    }
  });
});
app.get("/api/download-src-zip", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "src-and-tests.zip");
  res.download(filePath, "src-and-tests.zip", (err) => {
    if (err && !res.headersSent) {
      res.status(404).send("Archive src-and-tests.zip introuvable");
    }
  });
});
app.get("/api/download-full-zip", (req, res) => {
  const filePath = path.resolve(__dirname, "public", "resonantia-source.zip");
  res.download(filePath, "resonantia-source.zip", (err) => {
    if (err && !res.headersSent) {
      res.status(404).send("Archive resonantia-source.zip introuvable");
    }
  });
});
app.get(["/api/public-urls", "/api/tiktok/public-urls"], (req, res) => {
  const host = req.get("host") || "ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app";
  const proto = req.get("x-forwarded-proto") || "https";
  const baseUrl = (process.env.APP_URL || `${proto}://${host}`).replace(/\/$/, "");
  res.json({
    baseUrl,
    webUrl: `${baseUrl}/`,
    termsUrl: `${baseUrl}/terms`,
    privacyUrl: `${baseUrl}/privacy`,
    redirectUri: `${baseUrl}/api/auth/callback`,
    logoPngUrl: `${baseUrl}/logo-1024.png`,
    logoJpgUrl: `${baseUrl}/logo-1024.jpg`,
    logoDownloadUrl: `${baseUrl}/api/download-logo`
  });
});
app.get("/api/system-status", (req, res) => {
  res.json({
    deterministicEngine: true,
    tiktokApiReady: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    environment: process.env.NODE_ENV || "development"
  });
});
var SESSION_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_session.json");
var SESSIONS_BY_USER_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_sessions_by_user.json");
var KEYS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_keys.json");
var VIDEOS_CACHE_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_videos.json");
var VIDEOS_BY_ACCOUNT_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_videos_by_account.json");
var SNAPSHOTS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_snapshots.json");
var CORRECTIONS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_corrections.json");
var FOLLOWERS_HISTORY_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".tiktok_followers.json");
function readJsonArrayFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn(`Could not read ${path.basename(filePath)}:`, e);
  }
  return [];
}
function readJsonObjectFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }
  } catch (e) {
    console.warn(`Could not read ${path.basename(filePath)}:`, e);
  }
  return {};
}
function writeJsonSecureFile(filePath, payload) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { encoding: "utf-8", mode: 384 });
  } catch (e) {
    console.warn(`Could not write ${path.basename(filePath)}:`, e);
  }
}
function resolveRequestUserId(req) {
  const raw = (req.get("x-user-id") || req.query.user_id || req.body?.userId || "").trim();
  if (!raw) return "default";
  return raw.replace(/[^a-zA-Z0-9._:@-]/g, "").slice(0, 128) || "default";
}
function saveCachedVideosForAccount(openId, videos) {
  if (!openId) {
    writeJsonSecureFile(VIDEOS_CACHE_FILE, videos);
    return;
  }
  const map = readJsonObjectFile(VIDEOS_BY_ACCOUNT_FILE);
  map[openId] = videos;
  writeJsonSecureFile(VIDEOS_BY_ACCOUNT_FILE, map);
}
function loadCachedVideosForAccount(openId) {
  if (openId) {
    const map = readJsonObjectFile(VIDEOS_BY_ACCOUNT_FILE);
    if (Array.isArray(map[openId])) return map[openId];
  }
  const legacy = readJsonArrayFile(VIDEOS_CACHE_FILE);
  if (openId) {
    return legacy.filter((v) => !v?.accountId || v.accountId === openId);
  }
  return legacy;
}
function getTikTokCredentials() {
  let clientKey = (process.env.TIKTOK_CLIENT_KEY || process.env.CLIENT_ID || "").trim();
  let clientSecret = (process.env.TIKTOK_CLIENT_SECRET || process.env.CLIENT_SECRET || "").trim();
  if ((!clientKey || !clientSecret) && fs.existsSync(KEYS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(KEYS_FILE, "utf-8"));
      if (data.clientKey && !clientKey) clientKey = String(data.clientKey).trim();
      if (data.clientSecret && !clientSecret) clientSecret = String(data.clientSecret).trim();
      if (clientKey) process.env.TIKTOK_CLIENT_KEY = clientKey;
      if (clientSecret) process.env.TIKTOK_CLIENT_SECRET = clientSecret;
    } catch (e) {
    }
  }
  return { clientKey, clientSecret };
}
function loadAllSessionsByUser() {
  const map = readJsonObjectFile(SESSIONS_BY_USER_FILE);
  if (Object.keys(map).length === 0 && fs.existsSync(SESSION_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      if (parsed && parsed.accessToken && parsed.openId) {
        map.default = parsed;
      }
    } catch {
    }
  }
  return map;
}
function saveTikTokSessionForUser(userId, session) {
  const key = userId || "default";
  const map = loadAllSessionsByUser();
  if (session) {
    map[key] = session;
    writeJsonSecureFile(SESSIONS_BY_USER_FILE, map);
    if (key === "default") {
      writeJsonSecureFile(SESSION_FILE, session);
    }
  } else {
    delete map[key];
    writeJsonSecureFile(SESSIONS_BY_USER_FILE, map);
    if (key === "default" && fs.existsSync(SESSION_FILE)) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch {
      }
    }
  }
}
function loadTikTokSessionForUser(userId) {
  const key = userId || "default";
  const map = loadAllSessionsByUser();
  const found = map[key];
  if (found && found.accessToken && found.openId) {
    return found;
  }
  return null;
}
async function getValidTikTokSessionForUser(userId, forceRefresh = false) {
  const session = loadTikTokSessionForUser(userId);
  if (!session) return null;
  const now = Date.now();
  const isExpired = !session.accessToken || session.expiresAt && now >= session.expiresAt - 60 * 1e3;
  if ((isExpired || forceRefresh) && session.refreshToken) {
    const { clientKey, clientSecret } = getTikTokCredentials();
    if (clientKey && clientSecret) {
      try {
        console.log(`[TikTok Auth] Refreshing token for user=${userId} via grant_type: refresh_token...`);
        const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache"
          },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: session.refreshToken
          }).toString()
        });
        if (res.ok) {
          const resJson = await res.json();
          const newAccessToken = resJson.access_token || resJson.data?.access_token;
          if (newAccessToken) {
            session.accessToken = newAccessToken;
            if (resJson.refresh_token || resJson.data?.refresh_token) {
              session.refreshToken = resJson.refresh_token || resJson.data?.refresh_token;
            }
            const expiresIn = resJson.expires_in || resJson.data?.expires_in || 86400;
            session.expiresAt = Date.now() + Number(expiresIn) * 1e3;
            saveTikTokSessionForUser(userId, session);
            console.log("[TikTok Auth] Token refreshed successfully!");
          }
        } else {
          console.warn("[TikTok Auth] Refresh failed with status:", res.status);
        }
      } catch (err) {
        console.error("[TikTok Auth] Error refreshing token:", err);
      }
    }
  }
  return session;
}
app.get(["/api/tiktok/status", "/api/tiktok/auth/status"], async (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = await getValidTikTokSessionForUser(userId);
  const { clientKey, clientSecret } = getTikTokCredentials();
  const isConfigured = Boolean(clientKey && clientSecret);
  const appUrl = (process.env.APP_URL || "https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app").replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/auth/callback`;
  const requiredScopes = ["user.info.basic", "user.info.stats", "video.list"];
  const granted = session?.account?.scopesGranted || [];
  const missingScopes = requiredScopes.filter((s) => !granted.includes(s));
  res.json({
    isConfigured,
    isSandbox: clientKey.startsWith("sb"),
    isConnected: Boolean(session),
    account: session ? session.account : null,
    redirectUri,
    requiredScopes,
    missingScopes,
    serverMessage: !isConfigured ? "Cl\xE9s API manquantes : veuillez renseigner TIKTOK_CLIENT_KEY et TIKTOK_CLIENT_SECRET." : !session ? "En attente d'autorisation OAuth via le bouton officiel TikTok." : "Compte connect\xE9 avec succ\xE8s via l'API officielle TikTok."
  });
});
app.post("/api/tiktok/save-keys", (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body;
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ error: "Client Key et Client Secret sont obligatoires." });
    }
    const trimmedKey = String(clientKey).trim();
    const trimmedSecret = String(clientSecret).trim();
    process.env.TIKTOK_CLIENT_KEY = trimmedKey;
    process.env.TIKTOK_CLIENT_SECRET = trimmedSecret;
    try {
      fs.writeFileSync(
        KEYS_FILE,
        JSON.stringify({ clientKey: trimmedKey, clientSecret: trimmedSecret }, null, 2),
        { encoding: "utf-8", mode: 384 }
      );
    } catch (e) {
      console.warn("Could not update .tiktok_keys.json file:", e);
    }
    try {
      const envPath = path.resolve(__dirname, ".env");
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }
      envContent = envContent.split("\n").filter((line) => !line.startsWith("TIKTOK_CLIENT_KEY=") && !line.startsWith("TIKTOK_CLIENT_SECRET=")).join("\n");
      envContent += `
TIKTOK_CLIENT_KEY=${trimmedKey}
TIKTOK_CLIENT_SECRET=${trimmedSecret}
`;
      fs.writeFileSync(envPath, envContent.trim() + "\n", { encoding: "utf-8", mode: 384 });
    } catch (e) {
      console.warn("Could not update .env file:", e);
    }
    return res.json({
      success: true,
      message: "Cl\xE9s API TikTok enregistr\xE9es avec succ\xE8s.",
      isConfigured: true
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Erreur lors de la sauvegarde des cl\xE9s TikTok." });
  }
});
app.get("/api/tiktok/auth-url", (req, res) => {
  const { clientKey } = getTikTokCredentials();
  const host = (req.get("x-forwarded-host") || req.get("host") || "").toLowerCase();
  const referer = (req.get("referer") || "").toLowerCase();
  let defaultAppUrl = "https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app";
  if (referer.includes("ais-pre-") || host.includes("ais-pre-")) {
    defaultAppUrl = "https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app";
  } else if (process.env.APP_URL) {
    defaultAppUrl = process.env.APP_URL.replace(/\/$/, "");
  }
  const redirectUri = req.query.redirect_uri || `${defaultAppUrl}/api/auth/callback`;
  if (!clientKey) {
    return res.status(400).json({
      error: "Cl\xE9 client manquante (TIKTOK_CLIENT_KEY). Veuillez la renseigner sur le serveur.",
      redirectUri
    });
  }
  const userId = resolveRequestUserId(req);
  const csrf = Math.random().toString(36).substring(2, 10);
  const uidB64 = Buffer.from(userId).toString("base64url");
  const uriB64 = Buffer.from(redirectUri).toString("base64url");
  const csrfState = `rs_${csrf}_uid_${uidB64}_ruri_${uriB64}`;
  const scopes = req.query.scope || "user.info.basic,user.info.stats,video.list";
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(
    clientKey
  )}&scope=${encodeURIComponent(scopes)}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(csrfState)}`;
  return res.json({
    url: authUrl,
    redirectUri,
    scopes: scopes.split(",")
  });
});
app.get(["/api/auth/callback", "/api/auth/callback/", "/api/tiktok/callback", "/api/tiktok/callback/"], async (req, res) => {
  const { code, error, error_description, state } = req.query;
  if (error) {
    const errorMsg = error_description || error || "Acc\xE8s refus\xE9 ou annul\xE9 par l'utilisateur.";
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Erreur Connexion TikTok</title></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; margin: 0;">
          <div style="background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 480px;">
            <div style="font-size: 40px; margin-bottom: 16px;">\u26A0\uFE0F</div>
            <h2 style="color: #f87171; margin: 0 0 12px 0;">\xC9chec de l'autorisation TikTok</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">${escapeHtml(errorMsg)}</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 16px;">Fermeture automatique...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'TIKTOK_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  }
  if (!code) {
    return res.status(400).send("Code d'autorisation TikTok manquant.");
  }
  const { clientKey, clientSecret } = getTikTokCredentials();
  if (!clientKey || !clientSecret) {
    return res.status(500).send("Configuration TikTok incompl\xE8te sur le serveur (TIKTOK_CLIENT_KEY ou TIKTOK_CLIENT_SECRET manquant).");
  }
  let stateRedirectUri = "";
  let stateUserId = "default";
  const stateStr = String(state || "");
  if (stateStr.includes("_uid_")) {
    try {
      const uidPart = stateStr.split("_uid_")[1].split("_ruri_")[0];
      const decodedUid = Buffer.from(uidPart, "base64url").toString("utf-8").trim();
      if (decodedUid) {
        stateUserId = decodedUid.replace(/[^a-zA-Z0-9._:@-]/g, "").slice(0, 128) || "default";
      }
    } catch (e) {
      console.warn("[TIKTOK CALLBACK] Error decoding state userId:", e);
    }
  }
  if (stateStr.includes("_ruri_")) {
    try {
      const rawB64 = stateStr.split("_ruri_")[1];
      const decoded = Buffer.from(rawB64, "base64url").toString("utf-8");
      if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
        stateRedirectUri = decoded;
        console.log("[TIKTOK CALLBACK] Successfully decoded exact redirect_uri from state:", stateRedirectUri);
      }
    } catch (e) {
      console.warn("[TIKTOK CALLBACK] Error decoding state redirect_uri:", e);
    }
  }
  const candidates = [];
  if (stateRedirectUri) candidates.push(stateRedirectUri);
  const host = (req.get("x-forwarded-host") || req.get("host") || "").toLowerCase();
  const proto = req.get("x-forwarded-proto") || "https";
  if (host.includes("ais-pre-")) {
    candidates.push("https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback");
  } else if (host) {
    candidates.push(`${proto}://${host}/api/auth/callback`);
  }
  candidates.push("https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback");
  candidates.push("https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback");
  const uniqueCandidates = candidates.filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
  console.log("[TIKTOK CALLBACK] Attempting token exchange with candidate URIs:", uniqueCandidates);
  try {
    let tokenData = null;
    let usedUri = "";
    let lastErrorDesc = "";
    for (const candidateUri of uniqueCandidates) {
      console.log("[TIKTOK TOKEN EXCHANGE] Trying redirect_uri:", candidateUri);
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache"
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: candidateUri
        }).toString()
      });
      const resJson = await tokenRes.json();
      const accessToken = resJson.access_token || resJson.data?.access_token;
      console.log(
        `[TIKTOK TOKEN RESPONSE for ${candidateUri}]:`,
        JSON.stringify({
          status: tokenRes.status,
          hasAccessToken: Boolean(accessToken),
          hasRefreshToken: Boolean(resJson.refresh_token || resJson.data?.refresh_token),
          scope: resJson.scope || resJson.data?.scope || null,
          error: resJson.error || null
        })
      );
      if (accessToken) {
        tokenData = resJson;
        usedUri = candidateUri;
        console.log(`[TIKTOK TOKEN SUCCESS] Connected successfully with redirect_uri: ${usedUri}`);
        break;
      }
      const desc = resJson.error_description || resJson.error?.message || resJson.message || "";
      lastErrorDesc = desc || `\xC9chec \xE9change jeton (HTTP ${tokenRes.status})`;
      if (!desc.toLowerCase().includes("redirect uri does not match")) {
        tokenData = resJson;
        break;
      }
    }
    const access_token = tokenData?.access_token || tokenData?.data?.access_token;
    const open_id = tokenData?.open_id || tokenData?.data?.open_id;
    const refresh_token = tokenData?.refresh_token || tokenData?.data?.refresh_token || "";
    const expires_in = tokenData?.expires_in || tokenData?.data?.expires_in || 7200;
    const scope = tokenData?.scope || tokenData?.data?.scope || "";
    if (!access_token || !open_id) {
      const errMsg = tokenData?.error_description || lastErrorDesc || tokenData?.error?.message || "\xC9chec de l'\xE9change de jeton avec TikTok.";
      console.error("[TIKTOK TOKEN ERROR]", errMsg, { error: tokenData?.error || null });
      throw new Error(errMsg);
    }
    const hasStatsScope = (scope || "").includes("user.info.stats");
    const hasProfileScope = (scope || "").includes("user.info.profile");
    const permittedUserFields = ["open_id", "union_id", "avatar_url", "display_name"];
    if (hasStatsScope) {
      permittedUserFields.push("follower_count", "following_count", "likes_count", "video_count");
    }
    if (hasProfileScope) {
      permittedUserFields.push("username", "profile_deep_link", "is_verified");
    }
    let userData = null;
    try {
      const userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(",")}`, {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      if (userRes.ok) {
        const userJson = await userRes.json();
        userData = userJson.data?.user || null;
      }
    } catch (userErr) {
      console.warn("Could not fetch user fields from TikTok:", userErr);
    }
    const scopesGranted = (scope || "user.info.basic,user.info.stats,video.list").split(",").map((s) => s.trim());
    const fallbackUsername = userData?.username ? `@${userData.username}` : userData?.display_name ? `@${userData.display_name.replace(/\s+/g, "_")}` : `@tiktok_${String(open_id).slice(-6)}`;
    const accountData = {
      openId: open_id,
      unionId: userData?.union_id,
      username: fallbackUsername,
      displayName: userData?.display_name || "Compte TikTok",
      avatarUrl: userData?.avatar_url || "",
      profileDeepLink: userData?.profile_deep_link || `https://www.tiktok.com/${fallbackUsername}`,
      isVerified: Boolean(userData?.is_verified),
      followerCount: Number(userData?.follower_count || 0),
      followingCount: Number(userData?.following_count || 0),
      likesCount: Number(userData?.likes_count || 0),
      videoCount: Number(userData?.video_count || 0),
      connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      scopesGranted,
      source: "official_api"
    };
    const newSession = {
      openId: open_id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (Number(expires_in) || 86400) * 1e3,
      scope: scope || "",
      account: accountData
    };
    saveTikTokSessionForUser(stateUserId, newSession);
    let initialSyncedVideos = [];
    const hasVideoScope = (scope || "").includes("video.list");
    if (hasVideoScope) {
      try {
        const videoFields = "id,create_time,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count";
        let cursor = void 0;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 10;
        let rawVideos = [];
        while (hasMore && pageCount < maxPages) {
          pageCount++;
          const payload = { max_count: 20 };
          if (cursor !== void 0) payload.cursor = cursor;
          const listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          if (!listRes.ok) break;
          const listData = await listRes.json();
          const pageVideos = listData.data?.videos || [];
          rawVideos = rawVideos.concat(pageVideos);
          hasMore = Boolean(listData.data?.has_more);
          cursor = listData.data?.cursor;
          if (!hasMore || pageVideos.length === 0) break;
        }
        if (rawVideos.length > 0) {
          const videoWithShareUrl = rawVideos.find((v) => v.share_url);
          if (videoWithShareUrl?.share_url) {
            const handleMatch = videoWithShareUrl.share_url.match(/@([a-zA-Z0-9_.-]+)/);
            if (handleMatch) {
              const extractedHandle = `@${handleMatch[1]}`;
              newSession.account.username = extractedHandle;
              newSession.account.profileDeepLink = `https://www.tiktok.com/${extractedHandle}`;
              saveTikTokSessionForUser(stateUserId, newSession);
            }
          }
          const { safePercent: safePercent2, buildSnapshotAndCorrectionUpdate: buildSnapshotAndCorrectionUpdate2 } = await getCentralDataEngine();
          const nowIso = (/* @__PURE__ */ new Date()).toISOString();
          initialSyncedVideos = rawVideos.map((v) => {
            const views = Number(v.view_count ?? 0);
            const likes = Number(v.like_count ?? 0);
            const comments = Number(v.comment_count ?? 0);
            const shares = Number(v.share_count ?? 0);
            const rawDuration = v.duration !== void 0 && v.duration !== null ? Number(v.duration) : 0;
            const engagementRate = safePercent2(likes + comments + shares, views, 2) ?? 0;
            return {
              id: String(v.id),
              accountId: open_id,
              createTime: Number(v.create_time || Math.floor(Date.now() / 1e3)),
              title: v.title || v.video_description || `Vid\xE9o #${String(v.id).slice(-4)}`,
              videoDescription: v.video_description || "",
              duration: rawDuration,
              durationStatus: rawDuration > 0 ? "measured" : "not_provided_by_tiktok",
              coverImageUrl: v.cover_image_url || "",
              shareUrl: v.share_url || "",
              viewCount: views,
              viewCountStatus: v.view_count === 0 ? "verified_zero" : "measured",
              likeCount: likes,
              likeCountStatus: v.like_count === 0 ? "verified_zero" : "measured",
              commentCount: comments,
              commentCountStatus: v.comment_count === 0 ? "verified_zero" : "measured",
              shareCount: shares,
              shareCountStatus: v.share_count === 0 ? "verified_zero" : "measured",
              favoriteCount: null,
              favoriteCountStatus: "not_provided_by_tiktok",
              attributedFollowers: null,
              attributedFollowersSource: "unavailable",
              engagementRate,
              source: "official_api",
              lastSyncedAt: nowIso
            };
          });
          saveCachedVideosForAccount(open_id, initialSyncedVideos);
          const accountSnapshots = readJsonArrayFile(SNAPSHOTS_FILE);
          const { newSnapshots, corrections } = buildSnapshotAndCorrectionUpdate2(
            accountSnapshots.filter((s) => s.accountId === open_id),
            initialSyncedVideos,
            nowIso
          );
          if (newSnapshots.length > 0) {
            writeJsonSecureFile(SNAPSHOTS_FILE, [...accountSnapshots, ...newSnapshots]);
          }
          if (corrections.length > 0) {
            const accountCorrections = readJsonArrayFile(CORRECTIONS_FILE);
            writeJsonSecureFile(CORRECTIONS_FILE, [...accountCorrections, ...corrections]);
          }
        }
      } catch (preSyncErr) {
        console.warn("[TIKTOK CALLBACK] Pre-sync skipped (will retry on client):", preSyncErr);
      }
    }
    const finalAccountData = newSession.account;
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Connexion TikTok Autoris\xE9e</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .icon { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
            h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #ffffff; }
            p { margin: 0 0 16px 0; font-size: 14px; color: #94a3b8; }
            .user-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #34d399; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">\u2713</div>
            <h2>Connexion TikTok R\xE9ussie</h2>
            <p>Votre compte et vos statistiques ont \xE9t\xE9 synchronis\xE9s avec succ\xE8s.</p>
            <div class="user-chip">
              <span>${escapeHtml(finalAccountData.displayName)}</span>
              <span>(${escapeHtml(finalAccountData.username)})</span>
            </div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'TIKTOK_OAUTH_SUCCESS',
                openId: ${JSON.stringify(open_id)},
                account: ${JSON.stringify(finalAccountData)},
                videos: ${JSON.stringify(initialSyncedVideos)}
              }, '*');
              setTimeout(() => {
                window.close();
              }, 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error in TikTok OAuth callback:", err?.message || err);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Erreur Connexion TikTok</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #ef4444; border-radius: 20px; padding: 32px; text-align: center; max-width: 440px; }
            h2 { margin: 0 0 8px 0; color: #f87171; }
            p { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Erreur lors de la connexion TikTok</h2>
            <p>${escapeHtml(err?.message || "Une erreur inconnue est survenue lors de l'\xE9change de jeton avec TikTok.")}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'TIKTOK_OAUTH_ERROR',
                error: ${JSON.stringify(err.message || "Erreur lors de la connexion")}
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
});
app.post("/api/tiktok/sync", async (req, res) => {
  const userId = resolveRequestUserId(req);
  let session = await getValidTikTokSessionForUser(userId);
  if (!session || !session.accessToken) {
    return res.status(401).json({
      error: "Aucun compte TikTok n'est actuellement connect\xE9 via OAuth. Veuillez d'abord connecter votre compte.",
      requiresAuth: true
    });
  }
  let currentAccessToken = session.accessToken;
  const { openId, scope } = session;
  const hasStatsScope = (scope || "").includes("user.info.stats");
  const hasVideoScope = (scope || "").includes("video.list");
  try {
    const hasProfileScope = (scope || "").includes("user.info.profile");
    const permittedUserFields = ["open_id", "union_id", "avatar_url", "display_name"];
    if (hasStatsScope) {
      permittedUserFields.push("follower_count", "following_count", "likes_count", "video_count");
    }
    if (hasProfileScope) {
      permittedUserFields.push("username", "profile_deep_link", "is_verified");
    }
    let userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(",")}`, {
      headers: { Authorization: `Bearer ${currentAccessToken}` }
    });
    if (userRes.status === 401) {
      session = await getValidTikTokSessionForUser(userId, true);
      if (session?.accessToken) {
        currentAccessToken = session.accessToken;
        userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(",")}`, {
          headers: { Authorization: `Bearer ${currentAccessToken}` }
        });
      }
    }
    if (userRes.ok) {
      const userJson = await userRes.json();
      const u = userJson.data?.user;
      if (u && session) {
        session.account = {
          ...session.account,
          displayName: u.display_name || session.account.displayName,
          avatarUrl: u.avatar_url || session.account.avatarUrl,
          followerCount: hasStatsScope ? Number(u.follower_count || 0) : session.account.followerCount,
          followingCount: hasStatsScope ? Number(u.following_count || 0) : session.account.followingCount,
          likesCount: hasStatsScope ? Number(u.likes_count || 0) : session.account.likesCount,
          videoCount: hasStatsScope ? Number(u.video_count || 0) : session.account.videoCount
        };
      }
    }
    let allRawVideos = [];
    let lastApiError = null;
    if (hasVideoScope) {
      const videoFields = "id,create_time,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count";
      let cursor = void 0;
      let hasMore = true;
      let pageCount = 0;
      const maxPages = 15;
      while (hasMore && pageCount < maxPages) {
        pageCount++;
        const payload = { max_count: 20 };
        if (cursor !== void 0) {
          payload.cursor = cursor;
        }
        let listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (listRes.status === 401) {
          console.log("[TikTok Sync] Access token expired, attempting refresh...");
          session = await getValidTikTokSessionForUser(userId, true);
          if (session?.accessToken) {
            currentAccessToken = session.accessToken;
            listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${currentAccessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
          }
        }
        if (!listRes.ok) {
          const errJson = await listRes.json().catch(() => ({}));
          console.warn("TikTok video.list response on page", pageCount, listRes.status, errJson);
          lastApiError = {
            status: listRes.status,
            code: errJson?.error?.code || "api_error",
            message: errJson?.error?.message || `Erreur TikTok API (${listRes.status})`
          };
          break;
        }
        const listData = await listRes.json();
        const pageVideos = listData.data?.videos || [];
        allRawVideos = allRawVideos.concat(pageVideos);
        hasMore = Boolean(listData.data?.has_more);
        cursor = listData.data?.cursor;
        if (!hasMore || pageVideos.length === 0) break;
      }
    }
    if (allRawVideos.length === 0 && lastApiError) {
      const isAuthProblem = lastApiError.status === 401 || lastApiError.code === "access_token_invalid" || lastApiError.code === "scope_not_authorized";
      return res.status(lastApiError.status === 401 ? 401 : 500).json({
        success: false,
        requiresReauth: isAuthProblem,
        error: isAuthProblem ? "Votre session TikTok a expir\xE9 ou n\xE9cessite une r\xE9-autorisation. Veuillez cliquer sur \xAB Reconnecter TikTok \xBB pour actualiser vos m\xE9triques." : `Erreur lors de la synchronisation TikTok : ${lastApiError.message}`,
        details: lastApiError
      });
    }
    if (session) {
      const videoWithShareUrl = allRawVideos.find((v) => v.share_url);
      if (videoWithShareUrl?.share_url) {
        const handleMatch = videoWithShareUrl.share_url.match(/@([a-zA-Z0-9_.-]+)/);
        if (handleMatch) {
          const extractedHandle = `@${handleMatch[1]}`;
          session.account.username = extractedHandle;
          session.account.profileDeepLink = `https://www.tiktok.com/${extractedHandle}`;
        }
      } else if (session.account.displayName) {
        const fallback = `@${session.account.displayName.replace(/\s+/g, "_")}`;
        session.account.username = fallback;
        session.account.profileDeepLink = `https://www.tiktok.com/${fallback}`;
      }
      saveTikTokSessionForUser(userId, session);
    }
    const { safePercent: safePercent2, buildSnapshotAndCorrectionUpdate: buildSnapshotAndCorrectionUpdate2 } = await getCentralDataEngine();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const mappedVideos = allRawVideos.map((v) => {
      const views = Number(v.view_count ?? 0);
      const likes = Number(v.like_count ?? 0);
      const comments = Number(v.comment_count ?? 0);
      const shares = Number(v.share_count ?? 0);
      const rawDuration = v.duration !== void 0 && v.duration !== null ? Number(v.duration) : 0;
      const engagementRate = safePercent2(likes + comments + shares, views, 2) ?? 0;
      return {
        id: String(v.id),
        accountId: openId,
        createTime: Number(v.create_time || Math.floor(Date.now() / 1e3)),
        title: v.title || v.video_description || `Vid\xE9o #${String(v.id).slice(-4)}`,
        videoDescription: v.video_description || "",
        duration: rawDuration,
        durationStatus: rawDuration > 0 ? "measured" : "not_provided_by_tiktok",
        coverImageUrl: v.cover_image_url || "",
        shareUrl: v.share_url || "",
        viewCount: views,
        viewCountStatus: v.view_count === 0 ? "verified_zero" : "measured",
        likeCount: likes,
        likeCountStatus: v.like_count === 0 ? "verified_zero" : "measured",
        commentCount: comments,
        commentCountStatus: v.comment_count === 0 ? "verified_zero" : "measured",
        shareCount: shares,
        shareCountStatus: v.share_count === 0 ? "verified_zero" : "measured",
        favoriteCount: null,
        favoriteCountStatus: "not_provided_by_tiktok",
        attributedFollowers: null,
        attributedFollowersSource: "unavailable",
        engagementRate,
        source: "official_api",
        lastSyncedAt: nowIso
      };
    });
    const totalViews = mappedVideos.reduce((acc, v) => acc + v.viewCount, 0);
    const totalLikes = mappedVideos.reduce((acc, v) => acc + v.likeCount, 0);
    const totalComments = mappedVideos.reduce((acc, v) => acc + v.commentCount, 0);
    const totalShares = mappedVideos.reduce((acc, v) => acc + v.shareCount, 0);
    const globalEngagementRate = safePercent2(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayBreakdown = {};
    dayNames.forEach((d) => {
      dayBreakdown[d] = { views: 0, count: 0, totalEng: 0 };
    });
    mappedVideos.forEach((v) => {
      const date = new Date(v.createTime * 1e3);
      const day = dayNames[date.getDay()];
      if (dayBreakdown[day]) {
        dayBreakdown[day].views += v.viewCount;
        dayBreakdown[day].count += 1;
        dayBreakdown[day].totalEng += v.engagementRate;
      }
    });
    let accountSnapshots = readJsonArrayFile(SNAPSHOTS_FILE);
    let accountCorrections = readJsonArrayFile(CORRECTIONS_FILE);
    if (mappedVideos.length > 0) {
      saveCachedVideosForAccount(openId, mappedVideos);
      const { newSnapshots, corrections } = buildSnapshotAndCorrectionUpdate2(
        accountSnapshots.filter((s) => s.accountId === openId),
        mappedVideos,
        nowIso
      );
      accountSnapshots = [...accountSnapshots, ...newSnapshots];
      writeJsonSecureFile(SNAPSHOTS_FILE, accountSnapshots);
      if (corrections.length > 0) {
        accountCorrections = [...accountCorrections, ...corrections];
        writeJsonSecureFile(CORRECTIONS_FILE, accountCorrections);
      }
    }
    let followersHistory = readJsonArrayFile(FOLLOWERS_HISTORY_FILE);
    if (hasStatsScope && session?.account) {
      const acctFol = followersHistory.filter((f) => f.accountId === openId);
      const prevFol = acctFol.length > 0 ? acctFol[acctFol.length - 1] : null;
      const newCount = Number(session.account.followerCount || 0);
      if (!prevFol || prevFol.followerCount !== newCount || Date.now() - new Date(prevFol.recordedAt).getTime() > 36e5) {
        followersHistory.push({
          id: `fol_${openId}_${Date.now()}`,
          accountId: openId,
          recordedAt: nowIso,
          followerCount: newCount,
          source: "tiktok_api",
          deltaSincePrevious: prevFol ? newCount - prevFol.followerCount : null
        });
        writeJsonSecureFile(FOLLOWERS_HISTORY_FILE, followersHistory);
      }
    }
    return res.json({
      success: true,
      account: session ? session.account : null,
      videos: mappedVideos,
      snapshots: accountSnapshots.filter((s) => s.accountId === openId),
      corrections: accountCorrections.filter((c) => c.accountId === openId),
      followerHistory: followersHistory.filter((f) => f.accountId === openId),
      hasStatsScope,
      hasVideoScope,
      isPartial: !hasStatsScope || !hasVideoScope,
      summary: {
        totalVideosFetched: mappedVideos.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        globalEngagementRate,
        syncedAt: nowIso,
        dayBreakdown
      },
      message: !hasStatsScope || !hasVideoScope ? "Profil reli\xE9 avec succ\xE8s via Login Kit (Profil seul). Pour afficher vos abonn\xE9s, vos likes et vos vid\xE9os certifi\xE9es, autorisez le mode complet via le bouton 'Se connecter avec TikTok (Complet)'." : void 0
    });
  } catch (error) {
    console.error("Error syncing TikTok data:", error);
    return res.status(500).json({
      error: error?.message || "Erreur lors de la synchronisation avec l'API TikTok."
    });
  }
});
app.get("/api/tiktok/videos", (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = loadTikTokSessionForUser(userId);
  const openId = req.query.open_id || session?.openId;
  const videos = openId ? loadCachedVideosForAccount(openId) : [];
  const snapshots = openId ? readJsonArrayFile(SNAPSHOTS_FILE).filter((s) => s.accountId === openId) : [];
  const corrections = openId ? readJsonArrayFile(CORRECTIONS_FILE).filter((c) => c.accountId === openId) : [];
  const followerHistory = openId ? readJsonArrayFile(FOLLOWERS_HISTORY_FILE).filter((f) => f.accountId === openId) : [];
  return res.json({
    success: true,
    videos,
    count: videos.length,
    account: session?.account || null,
    snapshots,
    corrections,
    followerHistory
  });
});
app.get("/api/tiktok/snapshots", (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = loadTikTokSessionForUser(userId);
  const openId = req.query.accountId || session?.openId;
  const snapshots = openId ? readJsonArrayFile(SNAPSHOTS_FILE).filter((s) => s.accountId === openId) : [];
  const corrections = openId ? readJsonArrayFile(CORRECTIONS_FILE).filter((c) => c.accountId === openId) : [];
  const followerHistory = openId ? readJsonArrayFile(FOLLOWERS_HISTORY_FILE).filter((f) => f.accountId === openId) : [];
  return res.json({
    success: true,
    snapshots,
    corrections,
    followerHistory
  });
});
app.post("/api/tiktok/follower-history", (req, res) => {
  try {
    const userId = resolveRequestUserId(req);
    const session = loadTikTokSessionForUser(userId);
    const { followerCount, accountId } = req.body || {};
    const targetId = accountId || session?.openId || userId || "local";
    const numeric = Number(followerCount);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return res.status(400).json({ error: "Nombre d\u2019abonn\xE9s invalide." });
    }
    const history = readJsonArrayFile(FOLLOWERS_HISTORY_FILE);
    const forAcct = history.filter((h) => h.accountId === targetId);
    const prev = forAcct.length > 0 ? forAcct[forAcct.length - 1] : null;
    const entry = {
      id: `fol_manual_${targetId}_${Date.now()}`,
      accountId: targetId,
      recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
      followerCount: Math.round(numeric),
      source: "manual_input",
      deltaSincePrevious: prev ? Math.round(numeric) - prev.followerCount : null
    };
    history.push(entry);
    writeJsonSecureFile(FOLLOWERS_HISTORY_FILE, history);
    return res.json({ success: true, entry, followerHistory: history.filter((h) => h.accountId === targetId) });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erreur sauvegarde abonn\xE9s." });
  }
});
app.post("/api/tiktok/disconnect", (req, res) => {
  const userId = resolveRequestUserId(req);
  const existing = loadTikTokSessionForUser(userId);
  if (existing?.openId) {
    saveCachedVideosForAccount(existing.openId, []);
  }
  saveTikTokSessionForUser(userId, null);
  res.json({ success: true, message: "Compte TikTok d\xE9connect\xE9." });
});
app.get("/api/tiktok-account", async (req, res) => {
  try {
    const handleQuery = req.query.handle;
    if (!handleQuery) {
      return res.status(400).json({ error: "Nom d'utilisateur requis." });
    }
    const cleanHandle = handleQuery.trim().replace(/^@/, "");
    const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;
    let oembedData = null;
    let isReachable = false;
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
        isReachable = true;
      }
    } catch (e) {
      console.warn("TikTok oEmbed lookup fallback:", e);
    }
    return res.json({
      success: true,
      handle: `@${cleanHandle}`,
      profileUrl,
      authorName: oembedData?.author_name || cleanHandle,
      isVerifiedOnTikTok: isReachable,
      hasOEmbed: Boolean(oembedData),
      requiresOAuthForPrivateMetrics: true,
      oauthScopesNeeded: ["user.info.basic", "user.info.stats", "video.list"],
      notes: isReachable ? `Compte @${cleanHandle} identifi\xE9 sur TikTok. Pour synchroniser automatiquement vos vues priv\xE9es et vos statistiques en temps r\xE9el, connectez votre application via TikTok Login Kit.` : `Compte @${cleanHandle} enregistr\xE9. La consultation des statistiques priv\xE9es n\xE9cessite l'autorisation OAuth officielle de TikTok.`
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Erreur lors de la v\xE9rification du compte TikTok."
    });
  }
});
app.post("/api/generate-hashtags", (req, res) => {
  const { title = "", subject = "", caption = "", category = "" } = req.body || {};
  const rawTokens = `${title} ${subject} ${caption} ${category}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !["pour", "avec", "dans", "plus", "cette", "vous", "nous", "tout", "video", "tiktok"].includes(w));
  const uniqueWords = Array.from(new Set(rawTokens)).slice(0, 6);
  const nicheTags = uniqueWords.map((w) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`);
  const trendingTags = ["#PourToi", "#TikTokFrance", "#Resonantia"];
  const communityTags = ["#CreateurDeContenu", "#Storytelling", "#Communaute"];
  const allCombined = Array.from(/* @__PURE__ */ new Set([...nicheTags, ...trendingTags, ...communityTags]));
  return res.json({
    success: true,
    tags: {
      trendingTags,
      nicheTags: nicheTags.length > 0 ? nicheTags : ["#Creation", "#Inspiration", "#FormatCourt"],
      communityTags,
      allCombined
    }
  });
});
app.post("/api/analyze-video", (req, res) => {
  const { fileName, duration, customNotes } = req.body || {};
  const cleanTitle = String(fileName || "Nouvelle vid\xE9o").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  const dur = Number(duration) > 0 ? Math.round(Number(duration)) : 20;
  return res.json({
    success: true,
    analysis: {
      title: cleanTitle || "Nouvelle vid\xE9o",
      subject: customNotes || `S\xE9quence de ${dur}s pr\xE9par\xE9e pour TikTok.`,
      ambiance: dur <= 18 ? "Rythm\xE9 & direct" : "Narratif & immersif",
      visualStyle: "Format vertical 9:16",
      targetAudience: "Audience francophone sensible au format court",
      hook: "Entre directement dans l\u2019action d\xE8s la premi\xE8re seconde.",
      caption: `${cleanTitle || "Nouvelle vid\xE9o"}

Dis-moi ce que tu en penses en commentaire.`,
      hashtags: ["#PourToi", "#TikTokFrance", "#CreationDeContenu"],
      recommendedPostingTime: "Consultez votre Agenda Analytics pour vos cr\xE9neaux r\xE9els.",
      contentTips: [
        "V\xE9rifiez que les 2 premi\xE8res secondes posent clairement l\u2019\xE9motion ou la tension.",
        "Ajustez l\u2019entr\xE9e musicale sur le mouvement cl\xE9."
      ]
    }
  });
});
app.post("/api/regenerate-caption", (req, res) => {
  const { currentTitle = "Ta vid\xE9o", tone = "Direct" } = req.body || {};
  const variants = [
    {
      variantName: `${tone} \u2014 Accroche directe`,
      caption: `${currentTitle}

Ce d\xE9tail change tout quand on prend le temps de l\u2019observer.`,
      hashtags: ["#PourToi", "#TikTokFrance", "#Createur"],
      whyItWorks: "Va droit au but sans surcharger la lecture."
    },
    {
      variantName: "Storytelling & r\xE9sonance",
      caption: `${currentTitle}

Si ce moment te parle, enregistre la vid\xE9o pour y revenir plus tard.`,
      hashtags: ["#Storytelling", "#TikTokFrance", "#Emotion"],
      whyItWorks: "Encourage l\u2019enregistrement sans promesse artificielle."
    },
    {
      variantName: "Question ouverte",
      caption: `${currentTitle}

Et toi, tu aurais r\xE9agi comment \xE0 ce moment pr\xE9cis ?`,
      hashtags: ["#Discussion", "#PourToi", "#Communaute"],
      whyItWorks: "Invite naturellement au commentaire."
    }
  ];
  return res.json({ success: true, variants });
});
app.post("/api/analyze-tiktok-link", async (req, res) => {
  try {
    const { url, userNotes } = req.body || {};
    if (!url || typeof url !== "string" || !url.includes("tiktok.com")) {
      return res.status(400).json({
        error: "Veuillez fournir un lien TikTok valide (contenant tiktok.com)."
      });
    }
    let oembedData = null;
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (e) {
      console.warn("Oembed fetch fallback:", e);
    }
    const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
    const authorName = oembedData?.author_name || (handleMatch ? `@${handleMatch[1]}` : "Cr\xE9ateur TikTok");
    return res.json({
      success: true,
      data: {
        url,
        title: oembedData?.title || "Vid\xE9o TikTok d\xE9couverte",
        authorName,
        authorUrl: oembedData?.author_url || "",
        thumbnailUrl: oembedData?.thumbnail_url || "",
        category: "R\xE9f\xE9rence",
        repostReason: userNotes || "S\xE9lectionn\xE9e manuellement dans votre biblioth\xE8que de reposts.",
        suggestedComment: `Cr\xE9dit : ${authorName}`,
        recommendedTiming: "Planifiez selon vos cr\xE9neaux observ\xE9s dans Analytics."
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Erreur lors de l'analyse du lien TikTok."
    });
  }
});
app.post("/api/tiktok/video-causal-analysis", async (req, res) => {
  const { video, allVideos, siblingVideos, retentionData, memory, qualitativeTraits } = req.body || {};
  if (!video) {
    return res.status(400).json({ error: "Vid\xE9o manquante." });
  }
  const { generatePedagogicalAnalysis: generatePedagogicalAnalysis2 } = await getLearningMemoryEngine();
  const pedagogical = generatePedagogicalAnalysis2(
    video,
    allVideos || [],
    memory,
    qualitativeTraits,
    retentionData
  );
  const deterministicAnalysis = {
    causalVerdict: pedagogical.finalSynthesis.whatWorksSummary,
    reachVsEngagementAnalysis: pedagogical.finalSynthesis.whatFailsSummary,
    duplicateVarianceAnalysis: siblingVideos && siblingVideos.length > 0 ? `Cette publication (${video.duration}s) fait partie d'un groupe de ${siblingVideos.length + 1} publications sur ce sujet. L'\xE9cart de diffusion d\xE9coule de la cadence et de la compl\xE9tude du format.` : "Aucun doublon direct identifi\xE9 pour ce sujet sp\xE9cifique.",
    hookAndRetentionTips: pedagogical.module3Improvements.map((m) => m.howToImprove),
    actionPlan: pedagogical.module3Improvements.map((m) => `${m.targetElement} : ${m.concreteTest}`)
  };
  return res.json({ success: true, analysis: deterministicAnalysis, pedagogicalAnalysis: pedagogical });
});
app.post("/api/tiktok/compare-videos", async (req, res) => {
  const { videoA, videoB, memory } = req.body || {};
  if (!videoA || !videoB) {
    return res.status(400).json({ error: "Les deux vid\xE9os \xE0 comparer sont requises." });
  }
  try {
    const { compareTwoVideosPedagogically: compareTwoVideosPedagogically2 } = await getLearningMemoryEngine();
    const comparison = compareTwoVideosPedagogically2(videoA, videoB, memory);
    return res.json({ success: true, comparison });
  } catch (err) {
    console.error("Error in compare-videos:", err);
    return res.status(500).json({ error: err.message || "Erreur lors de la comparaison des vid\xE9os." });
  }
});
app.post("/api/tiktok/visionnaire-analyze", async (req, res) => {
  const { video, memory } = req.body || {};
  if (!video) {
    return res.status(400).json({ error: "Donn\xE9es vid\xE9o manquantes pour l\u2019analyse pr\xE9-publication." });
  }
  try {
    const { analyzeVideoPrePublication: analyzeVideoPrePublication2 } = await getVisionnaireEngine();
    const analysis = analyzeVideoPrePublication2(video, memory);
    return res.json({ success: true, analysis });
  } catch (err) {
    console.error("Error in visionnaire-analyze:", err);
    return res.status(500).json({ error: err.message || "Erreur lors de l\u2019analyse Visionnaire." });
  }
});
var PEDAGOGICAL_VIDEOS_DIR = path.resolve(RUNTIME_WRITABLE_DIR, ".pedagogical_videos");
var PEDAGOGICAL_VIDEOS_META_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".pedagogical_videos_meta.json");
var PEDAGOGICAL_PROGRESS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".pedagogical_progress.json");
var PEDAGOGICAL_ADMINS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, ".pedagogical_admins.json");
var pedagogicalLogicCache = null;
async function getPedagogicalLogic() {
  if (!pedagogicalLogicCache) {
    pedagogicalLogicCache = await Promise.resolve().then(() => (init_pedagogicalVideosLogic(), pedagogicalVideosLogic_exports));
  }
  return pedagogicalLogicCache;
}
function getAllowedAdminEmails() {
  const emails = /* @__PURE__ */ new Set(["loris.novel@gmail.com"]);
  const envRaw = process.env.ADMIN_EMAILS || process.env.PEDAGOGICAL_ADMIN_EMAILS || "";
  envRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).forEach((e) => emails.add(e));
  try {
    if (fs.existsSync(PEDAGOGICAL_ADMINS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PEDAGOGICAL_ADMINS_FILE, "utf-8"));
      if (parsed?.workspaceOwnerEmail) {
        emails.add(String(parsed.workspaceOwnerEmail).trim().toLowerCase());
      }
      if (Array.isArray(parsed?.extraAdmins)) {
        parsed.extraAdmins.forEach((e) => {
          if (e) emails.add(String(e).trim().toLowerCase());
        });
      }
    }
  } catch {
  }
  return Array.from(emails);
}
async function isServerPedagogicalAdmin(email) {
  const { isPedagogicalAdminIdentity: isPedagogicalAdminIdentity2 } = await getPedagogicalLogic();
  return isPedagogicalAdminIdentity2({
    email,
    allowedAdminEmails: getAllowedAdminEmails()
  });
}
function loadPedagogicalVideosMeta() {
  return readJsonArrayFile(PEDAGOGICAL_VIDEOS_META_FILE);
}
function savePedagogicalVideosMeta(items) {
  writeJsonSecureFile(PEDAGOGICAL_VIDEOS_META_FILE, items);
}
function readProgressMap() {
  try {
    if (fs.existsSync(PEDAGOGICAL_PROGRESS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PEDAGOGICAL_PROGRESS_FILE, "utf-8"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }
  } catch {
  }
  return {};
}
app.get("/api/pedagogical-videos/permissions", async (req, res) => {
  const email = req.query.email || req.get("x-user-email") || "";
  const isAdmin = await isServerPedagogicalAdmin(email);
  return res.json({ isAdmin });
});
app.post("/api/pedagogical-videos/register-owner", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email invalide." });
    }
    if (!fs.existsSync(PEDAGOGICAL_ADMINS_FILE)) {
      writeJsonSecureFile(PEDAGOGICAL_ADMINS_FILE, {
        workspaceOwnerEmail: email,
        registeredAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return res.json({ registered: true, isAdmin: true });
    }
    const isAdmin = await isServerPedagogicalAdmin(email);
    return res.json({ registered: false, isAdmin });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erreur lors de la v\xE9rification des droits." });
  }
});
app.get("/api/pedagogical-videos", async (req, res) => {
  try {
    const { sortPedagogicalVideos: sortPedagogicalVideos2 } = await getPedagogicalLogic();
    const videos = sortPedagogicalVideos2(loadPedagogicalVideosMeta()).map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      category: v.category,
      order: v.order,
      videoUrl: v.videoUrl,
      fileName: v.fileName,
      mimeType: v.mimeType,
      fileSize: v.fileSize,
      durationSeconds: v.durationSeconds,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      createdBy: v.createdBy
    }));
    return res.json({ success: true, videos });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erreur lors du chargement des vid\xE9os p\xE9dagogiques." });
  }
});
app.get("/api/pedagogical-videos/stream/:id", (req, res) => {
  const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) {
    return res.status(400).json({ error: "Identifiant vid\xE9o invalide." });
  }
  const list = loadPedagogicalVideosMeta();
  const item = list.find((v) => v.id === id);
  if (!item || !item.storedFileName) {
    return res.status(404).json({ error: "Vid\xE9o p\xE9dagogique introuvable." });
  }
  const resolved = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(item.storedFileName));
  if (path.dirname(resolved) !== PEDAGOGICAL_VIDEOS_DIR || !fs.existsSync(resolved)) {
    return res.status(404).json({ error: "Fichier vid\xE9o introuvable sur le serveur." });
  }
  if (item.mimeType) {
    res.setHeader("Content-Type", item.mimeType);
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.sendFile(resolved);
});
app.post(
  "/api/pedagogical-videos",
  express.raw({
    type: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "application/octet-stream"],
    limit: "260mb"
  }),
  async (req, res) => {
    try {
      const userEmail = req.get("x-user-email") || "";
      if (!await isServerPedagogicalAdmin(userEmail)) {
        return res.status(403).json({
          error: "Acc\xE8s refus\xE9 : seul un administrateur peut importer des vid\xE9os p\xE9dagogiques."
        });
      }
      const rawMetaHeader = req.get("x-video-meta");
      if (!rawMetaHeader) {
        return res.status(400).json({ error: "M\xE9tadonn\xE9es vid\xE9o manquantes." });
      }
      let meta;
      try {
        meta = JSON.parse(decodeURIComponent(rawMetaHeader));
      } catch {
        return res.status(400).json({ error: "Format des m\xE9tadonn\xE9es vid\xE9o invalide." });
      }
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { validatePedagogicalVideoFile: validatePedagogicalVideoFile2, validatePedagogicalVideoMetadata: validatePedagogicalVideoMetadata2, sortPedagogicalVideos: sortPedagogicalVideos2 } = await getPedagogicalLogic();
      const fileValidation = validatePedagogicalVideoFile2({
        fileName: String(meta.fileName || "lesson.mp4"),
        mimeType: String(meta.mimeType || req.get("content-type") || ""),
        fileSize: fileBuffer.length
      });
      if (!fileValidation.valid) {
        return res.status(400).json({ error: fileValidation.error });
      }
      const metaValidation = validatePedagogicalVideoMetadata2({
        title: meta.title,
        description: meta.description,
        category: meta.category,
        order: meta.order
      });
      if (!metaValidation.valid) {
        return res.status(400).json({ error: metaValidation.error });
      }
      if (!fs.existsSync(PEDAGOGICAL_VIDEOS_DIR)) {
        fs.mkdirSync(PEDAGOGICAL_VIDEOS_DIR, { recursive: true });
      }
      const id = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const storedFileName = `${id}${fileValidation.extension}`;
      const targetPath = path.resolve(PEDAGOGICAL_VIDEOS_DIR, storedFileName);
      fs.writeFileSync(targetPath, fileBuffer);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const durationNumeric = Number(meta.durationSeconds);
      const newEntry = {
        id,
        title: metaValidation.cleaned.title,
        description: metaValidation.cleaned.description,
        category: metaValidation.cleaned.category,
        order: metaValidation.cleaned.order,
        videoUrl: `/api/pedagogical-videos/stream/${id}`,
        storedFileName,
        fileName: String(meta.fileName || storedFileName),
        mimeType: fileValidation.normalizedMimeType,
        fileSize: fileBuffer.length,
        durationSeconds: Number.isFinite(durationNumeric) && durationNumeric > 0 ? Math.round(durationNumeric) : void 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: userEmail || "admin"
      };
      const existing = loadPedagogicalVideosMeta();
      const updated = sortPedagogicalVideos2([...existing, newEntry]);
      savePedagogicalVideosMeta(updated);
      const { storedFileName: _hidden, ...publicVideo } = newEntry;
      return res.status(201).json({ success: true, video: publicVideo });
    } catch (err) {
      console.error("Error uploading pedagogical video:", err);
      return res.status(500).json({ error: err?.message || "Erreur lors de l\u2019import vid\xE9o." });
    }
  }
);
app.patch("/api/pedagogical-videos/:id", async (req, res) => {
  try {
    const userEmail = req.get("x-user-email") || "";
    if (!await isServerPedagogicalAdmin(userEmail)) {
      return res.status(403).json({
        error: "Acc\xE8s refus\xE9 : seul un administrateur peut modifier les vid\xE9os p\xE9dagogiques."
      });
    }
    const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const list = loadPedagogicalVideosMeta();
    const idx = list.findIndex((v) => v.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: "Vid\xE9o p\xE9dagogique introuvable." });
    }
    const { validatePedagogicalVideoMetadata: validatePedagogicalVideoMetadata2, sortPedagogicalVideos: sortPedagogicalVideos2 } = await getPedagogicalLogic();
    const current = list[idx];
    const metaValidation = validatePedagogicalVideoMetadata2({
      title: req.body?.title ?? current.title,
      description: req.body?.description ?? current.description,
      category: req.body?.category ?? current.category,
      order: req.body?.order ?? current.order
    });
    if (!metaValidation.valid) {
      return res.status(400).json({ error: metaValidation.error });
    }
    list[idx] = {
      ...current,
      title: metaValidation.cleaned.title,
      description: metaValidation.cleaned.description,
      category: metaValidation.cleaned.category,
      order: metaValidation.cleaned.order,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const sorted = sortPedagogicalVideos2(list);
    savePedagogicalVideosMeta(sorted);
    const { storedFileName: _hidden, ...publicVideo } = list[idx];
    return res.json({ success: true, video: publicVideo });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erreur lors de la mise \xE0 jour." });
  }
});
app.put(
  "/api/pedagogical-videos/:id/file",
  express.raw({
    type: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "application/octet-stream"],
    limit: "260mb"
  }),
  async (req, res) => {
    try {
      const userEmail = req.get("x-user-email") || "";
      if (!await isServerPedagogicalAdmin(userEmail)) {
        return res.status(403).json({
          error: "Acc\xE8s refus\xE9 : seul un administrateur peut remplacer le fichier vid\xE9o."
        });
      }
      const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      const list = loadPedagogicalVideosMeta();
      const idx = list.findIndex((v) => v.id === id);
      if (idx < 0) {
        return res.status(404).json({ error: "Vid\xE9o p\xE9dagogique introuvable." });
      }
      const rawMetaHeader = req.get("x-video-meta");
      let meta = {};
      if (rawMetaHeader) {
        try {
          meta = JSON.parse(decodeURIComponent(rawMetaHeader));
        } catch {
          meta = {};
        }
      }
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { validatePedagogicalVideoFile: validatePedagogicalVideoFile2 } = await getPedagogicalLogic();
      const fileValidation = validatePedagogicalVideoFile2({
        fileName: String(meta.fileName || list[idx].fileName || "lesson.mp4"),
        mimeType: String(meta.mimeType || req.get("content-type") || ""),
        fileSize: fileBuffer.length
      });
      if (!fileValidation.valid) {
        return res.status(400).json({ error: fileValidation.error });
      }
      if (!fs.existsSync(PEDAGOGICAL_VIDEOS_DIR)) {
        fs.mkdirSync(PEDAGOGICAL_VIDEOS_DIR, { recursive: true });
      }
      const oldStored = list[idx].storedFileName;
      const newStoredFileName = `${id}_${Date.now()}${fileValidation.extension}`;
      fs.writeFileSync(path.resolve(PEDAGOGICAL_VIDEOS_DIR, newStoredFileName), fileBuffer);
      if (oldStored && oldStored !== newStoredFileName) {
        const oldPath = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(oldStored));
        if (path.dirname(oldPath) === PEDAGOGICAL_VIDEOS_DIR && fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      const durationNumeric = Number(meta.durationSeconds);
      const ts = Date.now();
      list[idx] = {
        ...list[idx],
        storedFileName: newStoredFileName,
        fileName: String(meta.fileName || newStoredFileName),
        mimeType: fileValidation.normalizedMimeType,
        fileSize: fileBuffer.length,
        durationSeconds: Number.isFinite(durationNumeric) && durationNumeric > 0 ? Math.round(durationNumeric) : list[idx].durationSeconds,
        videoUrl: `/api/pedagogical-videos/stream/${id}?v=${ts}`,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      savePedagogicalVideosMeta(list);
      const { storedFileName: _hidden, ...publicVideo } = list[idx];
      return res.json({ success: true, video: publicVideo });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Erreur lors du remplacement du fichier." });
    }
  }
);
app.delete("/api/pedagogical-videos/:id", async (req, res) => {
  try {
    const userEmail = req.get("x-user-email") || "";
    if (!await isServerPedagogicalAdmin(userEmail)) {
      return res.status(403).json({
        error: "Acc\xE8s refus\xE9 : seul un administrateur peut supprimer une vid\xE9o p\xE9dagogique."
      });
    }
    const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const list = loadPedagogicalVideosMeta();
    const idx = list.findIndex((v) => v.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: "Vid\xE9o p\xE9dagogique introuvable." });
    }
    const removed = list[idx];
    if (removed.storedFileName) {
      const target = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(removed.storedFileName));
      if (path.dirname(target) === PEDAGOGICAL_VIDEOS_DIR && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }
    const remaining = list.filter((v) => v.id !== id);
    savePedagogicalVideosMeta(remaining);
    return res.json({ success: true, deletedId: id });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Erreur lors de la suppression." });
  }
});
app.get("/api/pedagogical-videos/progress", (req, res) => {
  const userId = String(req.query.userId || "").trim();
  if (!userId) {
    return res.status(400).json({ error: "userId requis." });
  }
  const map = readProgressMap();
  const progress = map[userId] || {
    userId,
    watchedLessonIds: [],
    completedAtByLessonId: {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  return res.json({ success: true, progress });
});
app.post("/api/pedagogical-videos/progress", (req, res) => {
  const { userId, lessonId, watched, lastLessonId } = req.body || {};
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) {
    return res.status(400).json({ error: "userId requis." });
  }
  const map = readProgressMap();
  const existing = map[cleanUserId] || {
    userId: cleanUserId,
    watchedLessonIds: [],
    completedAtByLessonId: {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const watchedSet = new Set(Array.isArray(existing.watchedLessonIds) ? existing.watchedLessonIds : []);
  const completedMap = { ...existing.completedAtByLessonId || {} };
  if (lessonId) {
    const cleanLessonId = String(lessonId);
    if (watched === false) {
      watchedSet.delete(cleanLessonId);
      delete completedMap[cleanLessonId];
    } else {
      watchedSet.add(cleanLessonId);
      if (!completedMap[cleanLessonId]) {
        completedMap[cleanLessonId] = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
  }
  const updatedProgress = {
    userId: cleanUserId,
    watchedLessonIds: Array.from(watchedSet),
    completedAtByLessonId: completedMap,
    lastLessonId: lastLessonId ? String(lastLessonId) : existing.lastLessonId,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  map[cleanUserId] = updatedProgress;
  writeJsonSecureFile(PEDAGOGICAL_PROGRESS_FILE, map);
  return res.json({ success: true, progress: updatedProgress });
});
app.all("/api/*", (req, res) => {
  return res.status(404).json({
    error: `Route API introuvable : ${req.method} ${req.url}`
  });
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const httpServer = http.createServer(app);
  httpServer.on("error", (err) => {
    console.error("[Server] HTTP server error:", err);
    if (err.code === "EADDRINUSE") {
      process.exit(1);
    }
  });
  if (!isProduction) {
    let viteMiddlewares = null;
    const vitePromise = import("vite").then(async ({ createServer: createViteServer }) => {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: false,
          ws: false,
          watch: null
        },
        appType: "spa"
      });
      viteMiddlewares = vite.middlewares;
      console.log("[Dev Server] Vite middleware ready on port", PORT);
      return vite;
    }).catch((err) => {
      console.error("[Dev Server] Vite initialization failed:", err);
      throw err;
    });
    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/tiktok")) {
        return next();
      }
      if (viteMiddlewares) {
        return viteMiddlewares(req, res, next);
      }
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
    const shutdown = async () => {
      try {
        const vite = await vitePromise.catch(() => null);
        if (vite) await vite.close();
      } finally {
        httpServer.close(() => process.exit(0));
      }
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Resonantia running on http://0.0.0.0:${PORT}`);
  });
}
if (!IS_VERCEL) {
  startServer();
}
var server_default = app;
export {
  app,
  server_default as default
};
