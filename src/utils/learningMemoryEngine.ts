import {
  AccountKnowledgeMemory,
  ComparativeAnalysisResult,
  ExperimentLog,
  Module1WhatWorksItem,
  Module2WhatFailsItem,
  Module3ImprovementItem,
  PedagogicalAnalysis,
  TikTokOfficialVideo,
  VideoMemoryCard,
  VideoQualitativeTraits,
  VideoRetentionData,
} from '../types';
import { computeMean, computeMedian, safePercent } from './centralDataEngine';

export const TIKTOK_ACCOUNT_MEMORY_KEY = 'tiktok_account_knowledge_memory_v2';
export const TIKTOK_VIDEO_CARD_KEY_PREFIX = 'tiktok_video_card_v2_';

function getScopedMemoryKey(scopeKey?: string): string {
  const clean = (scopeKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${TIKTOK_ACCOUNT_MEMORY_KEY}_${clean}`;
}

/**
 * Initialise une mémoire vierge et honnête (sans chiffres ni règles inventés).
 */
export function getInitialAccountKnowledgeMemory(
  accountHandle: string = 'Compte non connecté'
): AccountKnowledgeMemory {
  return {
    accountHandle,
    totalAnalyzedVideos: 0,
    verifiedRules: [],
    activeHypotheses: [],
    testedLearnings: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getAccountKnowledgeMemory(
  accountHandle: string = 'Compte non connecté',
  scopeKey?: string
): AccountKnowledgeMemory {
  try {
    const raw = localStorage.getItem(getScopedMemoryKey(scopeKey || accountHandle));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.verifiedRules)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading account memory:', e);
  }
  const init = getInitialAccountKnowledgeMemory(accountHandle);
  saveAccountKnowledgeMemory(init, scopeKey || accountHandle);
  return init;
}

export function saveAccountKnowledgeMemory(
  memory: AccountKnowledgeMemory,
  scopeKey?: string
): void {
  try {
    memory.updatedAt = new Date().toISOString();
    localStorage.setItem(
      getScopedMemoryKey(scopeKey || memory.accountHandle),
      JSON.stringify(memory)
    );
  } catch (e) {
    console.error('Error saving account memory:', e);
  }
}

/**
 * PARTIE 4.6 : Détecte si une recommandation / caractéristique similaire a déjà été
 * testée et jugée « Défavorable » ou déjà enregistrée en mémoire, pour éviter
 * de répéter les mêmes conseils invalidés sans nouvelle justification.
 */
export function findSimilarRefutedOrTestedExperiments(
  candidateText: string,
  experimentLogs: ExperimentLog[]
): {
  refutedMatches: ExperimentLog[];
  activeMatches: ExperimentLog[];
} {
  const cleanTokens = candidateText
    .toLowerCase()
    .split(/[\s,.;:!?/#()-]+/)
    .filter((w) => w.length >= 4);

  const isSimilar = (exp: ExperimentLog) => {
    const expText = `${exp.title} ${exp.hypothesis} ${exp.modifiedCharacteristic}`.toLowerCase();
    const hits = cleanTokens.filter((tok) => expText.includes(tok));
    return hits.length >= 2;
  };

  return {
    refutedMatches: experimentLogs.filter(
      (e) => e.conclusion === 'Défavorable' && isSimilar(e)
    ),
    activeMatches: experimentLogs.filter(
      (e) => e.conclusion !== 'Défavorable' && isSimilar(e)
    ),
  };
}

/**
 * Trouve des vidéos sœurs par recouvrement réel de hashtags ou mots-clés significatifs.
 */
export function findSimilarVideos(
  target: TikTokOfficialVideo,
  allVideos: TikTokOfficialVideo[]
): TikTokOfficialVideo[] {
  const extractKeywords = (v: TikTokOfficialVideo) => {
    const text = `${v.title || ''} ${v.videoDescription || ''}`.toLowerCase();
    const tokens = text
      .split(/[\s,.;:!?()[\]"'/-]+/)
      .map((t) => t.replace(/^#/, ''))
      .filter((t) => t.length >= 4 && !['pour', 'avec', 'dans', 'plus', 'cette', 'vous', 'video', 'tiktok', 'pourtoi', 'foryou'].includes(t));
    return new Set(tokens);
  };

  const targetKw = extractKeywords(target);
  if (targetKw.size === 0) return [];

  return allVideos
    .filter((v) => {
      if (v.id === target.id) return false;
      const otherKw = extractKeywords(v);
      let overlap = 0;
      for (const kw of targetKw) {
        if (otherKw.has(kw)) overlap++;
      }
      return overlap >= 1;
    })
    .sort((a, b) => b.viewCount - a.viewCount);
}

/**
 * Génère une analyse pédagogique dynamique strictement ancrée dans les vraies
 * médianes et ratios calculés sur `allVideos` (aucune donnée d'un tiers hardcodée).
 */
export function generatePedagogicalAnalysis(
  video: TikTokOfficialVideo,
  allVideos: TikTokOfficialVideo[],
  memory?: AccountKnowledgeMemory,
  _traits?: Partial<VideoQualitativeTraits>,
  manualRetention?: VideoRetentionData
): PedagogicalAnalysis {
  const activeMemory = memory || getAccountKnowledgeMemory();
  const siblings = findSimilarVideos(video, allVideos);
  const bestSibling = siblings.length > 0 ? siblings[0] : null;

  const accountMedianViews =
    allVideos.length > 0 ? Math.round(computeMedian(allVideos.map((v) => v.viewCount))) : 0;
  const accountGlobalEng = (() => {
    const tv = allVideos.reduce((s, v) => s + v.viewCount, 0);
    const ti = allVideos.reduce((s, v) => s + v.likeCount + v.commentCount + v.shareCount, 0);
    return safePercent(ti, tv, 2) ?? 0;
  })();

  const duration = video.duration || 0;
  const hasDuration = typeof video.duration === 'number' && video.duration > 0;
  const views = video.viewCount || 0;
  const likes = video.likeCount || 0;
  const comments = video.commentCount || 0;
  const shares = video.shareCount || 0;
  const engagement = safePercent(likes + comments + shares, views, 2) ?? 0;
  const createDate = new Date(video.createTime * 1000);
  const hour = createDate.getHours();
  const minutes = createDate.getMinutes();
  const timeFormatted = `${String(hour).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;

  const isAboveMedian = accountMedianViews > 0 ? views >= accountMedianViews * 1.35 : false;
  const isStrongOutlier = accountMedianViews > 0 ? views >= accountMedianViews * 3 : false;
  const isDuplicateDrop = Boolean(
    bestSibling && bestSibling.viewCount > Math.max(views * 4, 200) && Math.abs(bestSibling.createTime - video.createTime) < 86400
  );

  const facts: string[] = [
    `FAIT : Publication le ${createDate.toLocaleDateString('fr-FR')} à ${timeFormatted}.`,
    hasDuration
      ? `FAIT : Durée mesurée de la vidéo : ${duration} secondes.`
      : `INFORMATION MANQUANTE : Durée exacte non fournie par l'API sur cet extrait.`,
    `FAIT : ${views.toLocaleString('fr-FR')} vues enregistrées (différent des spectateurs uniques), ${likes.toLocaleString('fr-FR')} likes, ${comments} commentaires, ${shares} partages.`,
    `FAIT : Taux d'engagement mesuré : ${engagement.toFixed(2)}% (référence globale du compte : ${accountGlobalEng.toFixed(2)}%).`,
  ];

  const observations: string[] = [];
  const hypotheses: string[] = [];
  const conclusions: string[] = [];
  const tests: string[] = [];
  const dataMissingNotices: string[] = [];

  if (!manualRetention?.averageWatchTimeSeconds) {
    dataMissingNotices.push(
      "INFORMATION MANQUANTE : Le temps moyen de visionnage et la complétion ne sont pas fournis par l'API TikTok video.list. Renseignez-les depuis TikTok Studio pour préciser le diagnostic."
    );
  } else {
    facts.push(
      `FAIT (TikTok Studio) : Temps moyen ${manualRetention.averageWatchTimeSeconds}s · Complétion ${manualRetention.completionRatePercentage || 0}% · Rétention 3s ${manualRetention.retentionAt3SecondsPercentage || 0}%.`
    );
  }

  const module1WhatWorks: Module1WhatWorksItem[] = [];
  if (isAboveMedian) {
    const mult = accountMedianViews > 0 ? (views / accountMedianViews).toFixed(1) : '—';
    module1WhatWorks.push({
      element: 'Portée supérieure à la médiane du compte',
      mechanism:
        'Une publication dépassant le palier habituel du compte a suffisamment maintenu l’attention initiale pour être poussée au-delà du premier groupe d’exposition.',
      proof: `${views.toLocaleString('fr-FR')} vues mesurées (${mult}× votre médiane de ${accountMedianViews.toLocaleString('fr-FR')} vues).`,
      comparison: bestSibling
        ? `Comparé aux vidéos sur un thème proche (meilleure sœur à ${bestSibling.viewCount.toLocaleString('fr-FR')} vues).`
        : `Au-dessus de la médiane actuelle calculée sur ${allVideos.length} vidéo(s).`,
      conclusion:
        'Analyser l’accroche, le contexte et l’heure de cette vidéo pour isoler un élément réplicable en test contrôlé.',
    });
  } else {
    module1WhatWorks.push({
      element: 'Signal relatif auprès des spectateurs exposés',
      mechanism:
        'Même lorsque la portée reste sous la médiane du compte, le ratio d’interaction permet d’évaluer la réaction du petit groupe atteint.',
      proof: `Taux d'engagement mesuré : ${engagement.toFixed(2)}% (${likes} likes, ${comments} comms, ${shares} partages).`,
      comparison: `Référence globale du compte : ${accountGlobalEng.toFixed(2)}% sur ${allVideos.length} vidéo(s).`,
      conclusion:
        engagement >= accountGlobalEng
          ? "L'intérêt du contenu auprès du petit échantillon est correct ; le blocage est probablement survenu dès les 2 premières secondes ou à cause du timing."
          : "Le taux d'interaction et la portée indiquent qu'une variation d'accroche ou d'angle mérite d'être testée.",
    });
  }

  const module2WhatFails: Module2WhatFailsItem[] = [];
  if (isDuplicateDrop && bestSibling) {
    observations.push(
      `OBSERVATION : Une publication proche en sujet dans les 24h (« ${bestSibling.title || bestSibling.id} ») a atteint ${bestSibling.viewCount.toLocaleString('fr-FR')} vues contre ${views.toLocaleString('fr-FR')} vues ici.`
    );
    hypotheses.push(
      'HYPOTHÈSE : Publier des formats trop proches dans un intervalle court peut réduire la portée de la seconde publication.'
    );
    module2WhatFails.push({
      problem: 'Proximité temporelle avec une vidéo de sujet comparable',
      mechanism:
        'Enchaîner plusieurs variations proches à faible intervalle expose les publications à une concurrence interne ou une perte de fraîcheur.',
      proof: `${views.toLocaleString('fr-FR')} vues contre ${bestSibling.viewCount.toLocaleString('fr-FR')} vues pour la version précédente.`,
      comparison: `Écart observé sur le compte entre deux publications proches dans le temps.`,
      conclusion:
        "Espacer les sorties sur un même thème et modifier nettement l'accroche textuelle et visuelle.",
      dimension: 'cadence',
    });
  }

  if (comments <= 1 && views >= 100) {
    observations.push(
      `OBSERVATION : ${comments} commentaire(s) pour ${views.toLocaleString('fr-FR')} vues (${((comments / views) * 100).toFixed(2)}%).`
    );
    hypotheses.push(
      "HYPOTHÈSE : L'absence de question claire en légende ou à l'écran laisse le spectateur passif."
    );
    module2WhatFails.push({
      problem: 'Faible activation des commentaires',
      mechanism:
        'Sans invitation explicite à réagir ou trancher une question concrète, la majorité des spectateurs passe à la vidéo suivante.',
      proof: `${comments} commentaire(s) mesuré(s) pour ${likes} likes.`,
      comparison: `À rapprocher de la moyenne par vidéo du compte (${allVideos.length} vidéos).`,
      conclusion: 'Tester une question simple et légitime liée directement au sujet de la vidéo.',
      dimension: 'ending',
    });
  }

  const module3Improvements: Module3ImprovementItem[] = [
    {
      targetElement: "Clarté de l'accroche (2 premières secondes)",
      howToImprove:
        'Poser le contexte exact dès la première image via un titre court lisible à l’écran.',
      whyThisModification:
        'La décision de continuer ou swiper intervient dans les 2 à 3 premières secondes selon la documentation TikTok.',
      groundedObservation: `Votre médiane actuelle est de ${accountMedianViews.toLocaleString('fr-FR')} vues sur ${allVideos.length} publications.`,
      concreteTest:
        'Tester une accroche explicite dès 0:00 sur un sujet proche et comparer les vues aux relevés H+5 et H+24.',
    },
    {
      targetElement: 'Suivi complémentaire dans TikTok Studio',
      howToImprove:
        'Compléter le temps moyen de visionnage, les favoris et les abonnés attribués dans la fiche Détails.',
      whyThisModification:
        'L’API Display v2 ne transmet pas la courbe de rétention ni la conversion en abonnés par vidéo.',
      groundedObservation:
        'Seules les données de rétention permettent de savoir si le frein vient du début (3s) ou du milieu de vidéo.',
      concreteTest:
        'Saisir ces 3 données sur vos 5 dernières publications pour débloquer la comparaison fine dans le Coach.',
    },
  ];

  const whatWorksSummary = isStrongOutlier
    ? `La vidéo surpasse largement la médiane du compte (${views.toLocaleString('fr-FR')} vues vs ${accountMedianViews.toLocaleString('fr-FR')} vues médianes).`
    : isAboveMedian
    ? `Bonne traction au-dessus du palier habituel (${views.toLocaleString('fr-FR')} vues) avec ${engagement.toFixed(2)}% d'engagement.`
    : `Taux d'interaction de ${engagement.toFixed(2)}% sur ${views.toLocaleString('fr-FR')} vues ; le potentiel de distribution reste à travailler dès l'ouverture.`;

  const whatFailsSummary = isDuplicateDrop
    ? 'Possible concurrence interne ou saturation suite à une sortie rapprochée sur le même sujet.'
    : 'Données de rétention manquantes côté API et faible taux de commentaires sur cet extrait.';

  const improvementsSummary =
    "1) Clarifier la promesse visuelle dès 0:00. 2) Espacer les publications similaires. 3) Compléter les données Studio (rétention, favoris, abonnés attribués).";

  const whatLearned = isStrongOutlier
    ? 'MÉCANISME : Un pic isolé valide une forte adéquation sujet/accroche mais ne garantit pas à lui seul une élévation durable du palier.'
    : 'MÉCANISME : Comparer chaque publication à la médiane du compte évite de confondre faible portée et mauvais contenu.';

  const nextTest = {
    hypothesis:
      'Une accroche textuelle plus précise dans les 2 premières secondes augmente la durée moyenne de visionnage.',
    experiment:
      'Publier une vidéo de même catégorie avec un titre d’ouverture concret et mesurer l’écart aux relevés H+24.',
    metricToWatch: 'Vues à H+24 et Taux d’engagement',
    status: 'a_tester' as const,
  };

  tests.push(`TEST PROPOSÉ : ${nextTest.experiment}`);
  conclusions.push(
    `CONCLUSION PROVISOIRE (${activeMemory.accountHandle}) : Base de référence actuelle = ${accountMedianViews.toLocaleString('fr-FR')} vues médianes.`
  );

  return {
    generatedAt: new Date().toISOString(),
    videoId: video.id,
    module1WhatWorks,
    module2WhatFails,
    module3Improvements,
    finalSynthesis: {
      whatWorksSummary,
      whatFailsSummary,
      improvementsSummary,
      whatLearned,
      nextTest,
    },
    facts,
    observations,
    hypotheses,
    conclusions,
    tests,
    dataMissingNotices,
  };
}

export function getVideoMemoryCard(
  video: TikTokOfficialVideo,
  allVideos: TikTokOfficialVideo[]
): VideoMemoryCard {
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
    console.warn('Error reading memory card for', video.id, e);
  }

  let retention: VideoRetentionData = {
    videoId: video.id,
    source: 'tiktok_studio_manual',
    updatedAt: '',
  };
  try {
    const retRaw = localStorage.getItem(`tiktok_retention_${video.id}`);
    if (retRaw) retention = JSON.parse(retRaw);
  } catch {}

  const defaultTraits: VideoQualitativeTraits = {
    hookType: 'inconnue',
    twoSecondsHookDescription: '',
    musicAndTrackName: video.soundTitle || '',
    musicExcerptType: 'inconnu',
    emotionalTone: 'neutre',
    pacing: 'modéré',
    visualChangesFrequency: 'toutes_les_3_5s',
    endingType: 'fin_brutale',
  };

  const pedagogicalAnalysis = generatePedagogicalAnalysis(
    video,
    allVideos,
    undefined,
    defaultTraits,
    retention
  );

  const card: VideoMemoryCard = {
    id: video.id,
    videoId: video.id,
    videoTitle: video.title || 'Vidéo TikTok',
    createTime: video.createTime,
    duration: video.duration || 0,
    description: video.videoDescription || '',
    metrics: {
      views: video.viewCount,
      likes: video.likeCount,
      comments: video.commentCount,
      shares: video.shareCount,
      engagementRate: video.engagementRate,
    },
    retention,
    qualitativeTraits: defaultTraits,
    pedagogicalAnalysis,
    testStatus: 'a_tester',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveVideoMemoryCard(card);
  return card;
}

export function saveVideoMemoryCard(card: VideoMemoryCard): void {
  try {
    card.updatedAt = new Date().toISOString();
    localStorage.setItem(
      `${TIKTOK_VIDEO_CARD_KEY_PREFIX}${card.videoId}`,
      JSON.stringify(card)
    );
  } catch (e) {
    console.error('Error saving video memory card:', e);
  }
}

export function updateVideoTestOutcome(
  videoId: string,
  allVideos: TikTokOfficialVideo[],
  status: 'valide' | 'refute' | 'a_tester',
  testNotes?: string,
  accountHandle = 'Compte actif'
): { card: VideoMemoryCard; memory: AccountKnowledgeMemory } {
  const video = allVideos.find((v) => v.id === videoId);
  if (!video) throw new Error('Vidéo introuvable');

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
    outcome:
      status === 'valide'
        ? ('validé' as const)
        : status === 'refute'
        ? ('réfuté' as const)
        : ('en_attente' as const),
    notes: testNotes || 'Résultat enregistré.',
    date: new Date().toISOString().split('T')[0],
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

export function compareTwoVideosPedagogically(
  videoA: TikTokOfficialVideo,
  videoB: TikTokOfficialVideo,
  memory?: AccountKnowledgeMemory
): ComparativeAnalysisResult {
  const best = videoA.viewCount >= videoB.viewCount ? videoA : videoB;
  const lowest = best === videoA ? videoB : videoA;
  const isATheBest = best === videoA;

  const ratio =
    lowest.viewCount > 0 ? (best.viewCount / lowest.viewCount).toFixed(1) : String(best.viewCount);

  const commonTraits: string[] = [
    `Publications comparées sur ${memory?.accountHandle || 'le même compte'} (sources : ${videoA.source} / ${videoB.source}).`,
  ];

  const timeA = new Date(videoA.createTime * 1000).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeB = new Date(videoB.createTime * 1000).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const durA = videoA.duration || 0;
  const durB = videoB.duration || 0;
  const durationDiff = Math.abs(durA - durB);

  const keyDifferences: ComparativeAnalysisResult['keyDifferences'] = [
    {
      aspect: 'Vues obtenues',
      videoAValue: `${videoA.viewCount.toLocaleString('fr-FR')} vues`,
      videoBValue: `${videoB.viewCount.toLocaleString('fr-FR')} vues`,
      impactLikelihood: 'forte',
    },
    {
      aspect: 'Durée mesurée',
      videoAValue: durA > 0 ? `${durA}s` : 'Non fournie',
      videoBValue: durB > 0 ? `${durB}s` : 'Non fournie',
      impactLikelihood: durationDiff > 20 ? 'forte' : 'moyenne',
    },
    {
      aspect: 'Date et heure de publication',
      videoAValue: timeA,
      videoBValue: timeB,
      impactLikelihood: 'moyenne',
    },
    {
      aspect: 'Engagement relatif',
      videoAValue: `${videoA.engagementRate.toFixed(2)}% (${videoA.likeCount} likes)`,
      videoBValue: `${videoB.engagementRate.toFixed(2)}% (${videoB.likeCount} likes)`,
      impactLikelihood: 'moyenne',
    },
    {
      aspect: 'Commentaires / Partages',
      videoAValue: `${videoA.commentCount} comms · ${videoA.shareCount} partages`,
      videoBValue: `${videoB.commentCount} comms · ${videoB.shareCount} partages`,
      impactLikelihood: 'faible',
    },
  ];

  const presentInBestAbsentInOther: string[] = [];
  if (best.shareCount > lowest.shareCount * 2 + 2) {
    presentInBestAbsentInOther.push(
      `Partages nettement supérieurs (${best.shareCount} vs ${lowest.shareCount}).`
    );
  }
  if (durA > 0 && durB > 0 && durationDiff >= 15) {
    presentInBestAbsentInOther.push(
      `Écart de durée notable (${best.duration}s pour la plus vue vs ${lowest.duration}s).`
    );
  }
  if (presentInBestAbsentInOther.length === 0) {
    presentInBestAbsentInOther.push(
      'Renseignez l’accroche, le rythme et les stats TikTok Studio dans « Détails » pour affiner la comparaison qualitative.'
    );
  }

  const causalExplanation =
    `La vidéo ${isATheBest ? 'A' : 'B'} totalise ${best.viewCount.toLocaleString('fr-FR')} vues contre ${lowest.viewCount.toLocaleString('fr-FR')} vues (rapport ${ratio}×). ` +
    `Les chiffres seuls montrent un écart de distribution et d'interactions, sans prouver de causalité tant que les variables éditoriales (accroche, rétention) ne sont pas comparées.`;

  return {
    videoA,
    videoB,
    commonTraits,
    keyDifferences,
    presentInBestAbsentInOther,
    retentionComparison:
      'Saisissez le temps de visionnage moyen et la complétion depuis TikTok Studio dans chaque fiche vidéo pour comparer la rétention.',
    causalExplanation,
    facts: [
      `FAIT : Vidéo A = ${videoA.viewCount.toLocaleString('fr-FR')} vues, postée le ${timeA}.`,
      `FAIT : Vidéo B = ${videoB.viewCount.toLocaleString('fr-FR')} vues, postée le ${timeB}.`,
    ],
    observations: [
      `OBSERVATION : Ratio d'engagement A = ${videoA.engagementRate.toFixed(2)}% vs B = ${videoB.engagementRate.toFixed(2)}%.`,
    ],
    hypotheses: [
      `HYPOTHÈSE : L'écart observé peut venir de l'accroche des 2 premières secondes, du sujet ou du timing de sortie.`,
    ],
    conclusion:
      'CONCLUSION PRUDENTE : Vérifiez la rétention et répétez l’élément différenciant sur une nouvelle publication test.',
    testRecommendation:
      'TEST : Conserver le même thème en changeant uniquement l’accroche initiale ou le créneau horaire.',
  };
}
