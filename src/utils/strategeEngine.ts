import {
  StrategicAccountDiagnostic,
  StrategicActionRecommendation,
  StrategicExperiment,
  StrategicLesson,
  StrategicMemory,
  StrategicOpportunity,
  StrategicWeeklyPlanItem,
  StatisticalSituationAnalysis,
  TikTokAccountData,
  TikTokOfficialVideo,
} from '../types';
import { computeMean, computeMedian, computeQuantile, safePercent } from './centralDataEngine';
import { computeInterestingRemarks } from './interestingRemarksEngine';

const STRATEGE_MEMORY_KEY = 'tiktok_stratege_memory_v3';

function getScopedStrategeKey(scope?: string): string {
  const clean = (scope || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STRATEGE_MEMORY_KEY}_${clean}`;
}

export function computeStrategicDiagnostic(
  videos: TikTokOfficialVideo[],
  account?: TikTokAccountData | null
): StrategicAccountDiagnostic {
  const totalVideos = videos.length;
  const accountHandle = account?.username || 'Compte non connecté';

  if (totalVideos === 0) {
    return {
      accountHandle,
      totalVideos: 0,
      totalViews: 0,
      avgViews: 0,
      medianViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      engagementRate: 0,
      likesToViewsRatio: 0,
      medianLikesToViewsRatio: 0,
      commentsToViewsRatio: 0,
      sharesToViewsRatio: 0,
      followersEngagementRate: 0,
      sampleSize: 0,
      topPerformers: [],
      lowPerformers: [],
      durationAnalysis: {
        shortUnder30s: { count: 0, avgViews: 0, medianViews: 0 },
        medium30to60s: { count: 0, avgViews: 0, medianViews: 0 },
        longOver60s: { count: 0, avgViews: 0, medianViews: 0 },
        verdict: 'Aucune vidéo synchronisée pour analyser les durées.',
      },
      cadenceWarning: 'Aucune publication enregistrée.',
      coreStrengths: [],
      coreWeaknesses: [],
      immediatePriorities: ['Connecter et synchroniser votre compte TikTok pour lancer l’analyse.'],
      actionRecommendations: [],
      statisticalSituations: [],
      interestingRemarks: [],
    };
  }

  const totalViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
  const totalLikes = videos.reduce((acc, v) => acc + (v.likeCount || 0), 0);
  const totalComments = videos.reduce((acc, v) => acc + (v.commentCount || 0), 0);
  const totalShares = videos.reduce((acc, v) => acc + (v.shareCount || 0), 0);
  const avgViews = Math.round(totalViews / totalVideos);
  const medianViews = Math.round(computeMedian(videos.map((v) => v.viewCount || 0)));

  const engagementRate =
    safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

  const videoLikeRatios = videos
    .filter((v) => (v.viewCount || 0) > 0)
    .map((v) => safePercent(v.likeCount || 0, v.viewCount, 2) ?? 0);
  const medianLikesToViewsRatio = Number(computeMedian(videoLikeRatios).toFixed(2));

  const likesToViewsRatio = safePercent(totalLikes, totalViews, 2) ?? 0;
  const commentsToViewsRatio = safePercent(totalComments, totalViews, 3) ?? 0;
  const sharesToViewsRatio = safePercent(totalShares, totalViews, 3) ?? 0;
  const followerCount = account?.followerCount ?? 0;
  const followersEngagementRate =
    followerCount > 0
      ? Number((((totalLikes + totalComments + totalShares) / followerCount) * 100).toFixed(1))
      : 0;

  // Duration buckets excluding unknown duration (0)
  const shortVids = videos.filter((v) => (v.duration || 0) > 0 && (v.duration || 0) < 30);
  const medVids = videos.filter((v) => (v.duration || 0) >= 30 && (v.duration || 0) <= 60);
  const longVids = videos.filter((v) => (v.duration || 0) > 60);

  const calcBucket = (bucket: TikTokOfficialVideo[]) => {
    if (bucket.length === 0) return { count: 0, avgViews: 0, medianViews: 0 };
    const vList = bucket.map((v) => v.viewCount || 0);
    return {
      count: bucket.length,
      avgViews: Math.round(computeMean(vList)),
      medianViews: Math.round(computeMedian(vList)),
    };
  };

  const shortStats = calcBucket(shortVids);
  const medStats = calcBucket(medVids);
  const longStats = calcBucket(longVids);

  let durationVerdict = 'Données de durée insuffisantes sur cet échantillon.';
  const nonEmptyBuckets = [
    { label: 'Courts (< 30s)', ...shortStats },
    { label: 'Moyens (30–60s)', ...medStats },
    { label: 'Longs (> 60s)', ...longStats },
  ].filter((b) => b.count >= 2);
  if (nonEmptyBuckets.length >= 2) {
    const bestBucket = nonEmptyBuckets.slice().sort((a, b) => b.medianViews - a.medianViews)[0];
    durationVerdict = `Sur votre compte, les formats « ${bestBucket.label} » (${bestBucket.count} vidéo(s)) affichent la médiane la plus élevée (${bestBucket.medianViews.toLocaleString('fr-FR')} vues).`;
  } else if (shortStats.count + medStats.count + longStats.count > 0) {
    durationVerdict = 'Au moins 2 vidéos par tranche de durée sont requises pour comparer objectivement.';
  }

  const sortedDesc = [...videos].sort((a, b) => b.viewCount - a.viewCount);
  const topPerformers = sortedDesc.slice(0, 3).map((v) => {
    const eng = safePercent(v.likeCount + v.commentCount + v.shareCount, v.viewCount, 2) ?? 0;
    return {
      title: v.title || 'Sans titre',
      views: v.viewCount,
      reason: `Taux d’engagement de ${eng}% (${v.likeCount.toLocaleString('fr-FR')} likes, ${v.shareCount} partages)${
        medianViews > 0 ? ` · ${(v.viewCount / medianViews).toFixed(1)}× votre médiane` : ''
      }.`,
    };
  });

  const lowThreshold = Math.max(50, Math.round(medianViews * 0.35));
  const lowPerformers = sortedDesc
    .filter((v) => v.viewCount < lowThreshold)
    .slice(-3)
    .reverse()
    .map((v) => ({
      title: v.title || 'Sans titre',
      views: v.viewCount,
      reason: `Sous 35% de la médiane du compte (${medianViews.toLocaleString('fr-FR')} vues). Vérifier accroche initiale, espacement entre publications et rétention.`,
    }));

  // Detect real rapid-posting pairs (< 15 min)
  const timeAsc = [...videos].sort((a, b) => a.createTime - b.createTime);
  let rapidPairsCount = 0;
  for (let i = 1; i < timeAsc.length; i++) {
    if (timeAsc[i].createTime - timeAsc[i - 1].createTime < 900) rapidPairsCount++;
  }

  const actionRecommendations: StrategicActionRecommendation[] = [];

  if (rapidPairsCount > 0) {
    actionRecommendations.push({
      id: 'rec_cadence_spacing',
      priority: 'Élevée',
      title: 'Espacer les publications rapprochées détectées sur votre historique',
      constat: `${rapidPairsCount} paire(s) de vidéos sur votre compte ont été publiées à moins de 15 minutes d’intervalle.`,
      explication:
        'Publier plusieurs vidéos coup sur coup peut réduire la distribution initiale d’au moins une d’elles et brouiller les tests de performance.',
      action:
        'Respecter un espacement d’au moins 3 heures entre deux publications (ou 24h entre deux formats sur un sujet proche).',
      objectif: 'Mesurer la portée de chaque vidéo sans concurrence interne.',
      mesure: 'Comparer la médiane de vues des vidéos espacées > 3h vs < 15 min dans Analytics.',
      targetMetric: `Dépasser la médiane actuelle (${medianViews.toLocaleString('fr-FR')} vues)`,
      themeTag: 'Algorithme & Cadence',
    });
  }

  actionRecommendations.push({
    id: 'rec_hook_level_up',
    priority: 'Élevée',
    title: 'Tester une variation contrôlée d’accroche pour dépasser votre palier',
    constat: `Médiane actuelle du compte : ${medianViews.toLocaleString('fr-FR')} vues sur ${totalVideos} vidéo(s) (moyenne : ${avgViews.toLocaleString('fr-FR')} vues).`,
    explication:
      'La décision de continuer ou quitter une vidéo se prend principalement dans les 2 à 3 premières secondes ; la comparaison à votre propre médiane permet de mesurer un progrès réel.',
    action:
      'Modifier une seule variable (titre à l’écran dès 0:00 ou angle d’ouverture) sur vos 3 prochaines vidéos comparables et consigner l’essai dans « Expérimentations ».',
    objectif: 'Élever durablement votre médiane hors pics viraux isolés.',
    mesure: 'Comparer la médiane des 5 prochaines vidéos aux 5 précédentes.',
    targetMetric: `+20% sur la médiane (${Math.round(medianViews * 1.2).toLocaleString('fr-FR')} vues)`,
    themeTag: 'Accroche & Paliers',
  });

  if (commentsToViewsRatio < 0.35 && totalViews > 0) {
    actionRecommendations.push({
      id: 'rec_comments_activation',
      priority: 'Moyenne',
      title: 'Tester un déclencheur de commentaires ciblé',
      constat: `Votre taux global commentaires/vues est de ${commentsToViewsRatio}% (${totalComments} commentaires sur ${totalViews.toLocaleString('fr-FR')} vues).`,
      explication:
        'Les commentaires demandent une implication active et traduisent un débat ou une identification au sujet.',
      action:
        'Poser une question précise et légitime liée directement au contenu dans la légende ou à l’écran.',
      objectif: 'Vérifier si la conversation augmente sans pénaliser la rétention.',
      mesure: 'Suivre le ratio commentaires/vues par publication dans Analytics.',
      targetMetric: `> ${Math.max(0.4, Number((commentsToViewsRatio * 1.5).toFixed(2)))}%`,
      themeTag: 'Engagement & Conversation',
    });
  }

  if (sharesToViewsRatio < 0.35 && totalViews > 0) {
    actionRecommendations.push({
      id: 'rec_shares_value',
      priority: 'Secondaire',
      title: 'Renforcer la valeur de partage sur les sujets phares',
      constat: `Votre taux global partages/vues est de ${sharesToViewsRatio}% (${totalShares} partages).`,
      explication:
        'Le partage augmente lorsque le spectateur estime que la séquence est utile, marquante ou digne d’être envoyée à un proche.',
      action:
        'Isoler vos vidéos ayant déjà le meilleur taux de partages dans « Remarque intéressante » et en reproduire la structure narrative.',
      objectif: 'Développer le bouche-à-oreille hors flux Pour toi.',
      mesure: 'Suivre le taux de partages par vue dans Analytics.',
      targetMetric: `> ${Math.max(0.3, Number((sharesToViewsRatio * 1.5).toFixed(2)))}%`,
      themeTag: 'Partages & Viralité',
    });
  }

  // Dynamic Statistical Situations strictly matched against real videos
  const statisticalSituations: StatisticalSituationAnalysis[] = [];
  const p75Views = Math.round(computeQuantile(videos.map((v) => v.viewCount), 0.75));

  const highViewsLowLikesMatches = videos
    .filter((v) => v.viewCount >= Math.max(p75Views, medianViews) && v.viewCount > 0 && (v.likeCount / v.viewCount) * 100 < medianLikesToViewsRatio * 0.7)
    .slice(0, 3);
  if (highViewsLowLikesMatches.length > 0) {
    const sample = highViewsLowLikesMatches[0];
    statisticalSituations.push({
      id: 'situation_b',
      code: 'Cas observé A',
      title: 'Portée élevée mais taux de likes inférieur à votre médiane',
      scenarioDescription: `${highViewsLowLikesMatches.length} vidéo(s) dépassent votre seuil de portée avec un taux likes/vues sous ${(medianLikesToViewsRatio * 0.7).toFixed(2)}%.`,
      exampleMetrics: {
        views: sample.viewCount,
        likes: sample.likeCount,
        comments: sample.commentCount,
        shares: sample.shareCount,
        likesToViewsRatio: safePercent(sample.likeCount, sample.viewCount, 2) ?? 0,
      },
      observedFacts: [
        `La vidéo « ${sample.title || sample.id} » totalise ${sample.viewCount.toLocaleString('fr-FR')} vues (médiane du compte : ${medianViews.toLocaleString('fr-FR')}).`,
        `Son taux de likes est de ${(safePercent(sample.likeCount, sample.viewCount, 2) ?? 0)}% contre ${medianLikesToViewsRatio}% en médiane.`,
      ],
      plausibleHypotheses: [
        'Distribution auprès d’une audience froide hors abonnés : les nouveaux spectateurs regardent mais likent moins spontanément.',
        'Fin abrupte ou valeur informative consommée sans émotion de cœur.',
      ],
      actionToTest: 'Tester une conclusion plus marquante ou un repère d’émotion sans rallonger artificiellement.',
      matchedRealVideos: highViewsLowLikesMatches.map((v) => ({
        title: v.title || 'Sans titre',
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        shares: v.shareCount,
        likesToViewsRatio: safePercent(v.likeCount, v.viewCount, 2) ?? 0,
      })),
    });
  }

  const highSharesCommsMatches = videos
    .filter((v) => v.viewCount > 0 && (v.shareCount >= 3 || v.commentCount >= 5))
    .sort((a, b) => (b.shareCount + b.commentCount) / b.viewCount - (a.shareCount + a.commentCount) / a.viewCount)
    .slice(0, 3);
  if (highSharesCommsMatches.length > 0) {
    const sample = highSharesCommsMatches[0];
    statisticalSituations.push({
      id: 'situation_d',
      code: 'Cas observé B',
      title: 'Forte proportion de partages et/ou commentaires',
      scenarioDescription: `${highSharesCommsMatches.length} vidéo(s) se distinguent par des interactions actives (commentaires ou partages).`,
      exampleMetrics: {
        views: sample.viewCount,
        likes: sample.likeCount,
        comments: sample.commentCount,
        shares: sample.shareCount,
        likesToViewsRatio: safePercent(sample.likeCount, sample.viewCount, 2) ?? 0,
      },
      observedFacts: [
        `« ${sample.title || sample.id} » obtient ${sample.commentCount} commentaires et ${sample.shareCount} partages sur ${sample.viewCount.toLocaleString('fr-FR')} vues.`,
      ],
      plausibleHypotheses: [
        'Le sujet suscite une prise de position ou une envie d’envoi à un proche.',
      ],
      actionToTest: 'Créer un suivi ou une variation éditoriale en conservant la même problématique centrale.',
      matchedRealVideos: highSharesCommsMatches.map((v) => ({
        title: v.title || 'Sans titre',
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        shares: v.shareCount,
        likesToViewsRatio: safePercent(v.likeCount, v.viewCount, 2) ?? 0,
      })),
    });
  }

  const outlierMatches = videos
    .filter((v) => medianViews > 0 && v.viewCount >= Math.max(medianViews * 3, p75Views * 1.5))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 2);
  if (outlierMatches.length > 0) {
    const sample = outlierMatches[0];
    const mult = medianViews > 0 ? (sample.viewCount / medianViews).toFixed(1) : '—';
    statisticalSituations.push({
      id: 'situation_e',
      code: 'Cas observé C',
      title: 'Outlier positif nettement au-dessus du palier médian',
      scenarioDescription: `Vidéo culminant à ${sample.viewCount.toLocaleString('fr-FR')} vues (${mult}× la médiane de ${medianViews.toLocaleString('fr-FR')} vues).`,
      exampleMetrics: {
        views: sample.viewCount,
        likes: sample.likeCount,
        comments: sample.commentCount,
        shares: sample.shareCount,
        likesToViewsRatio: safePercent(sample.likeCount, sample.viewCount, 2) ?? 0,
      },
      observedFacts: [
        `Écart majeur de ${mult}× par rapport au palier médian habituel du compte.`,
      ],
      plausibleHypotheses: [
        'Forte adéquation sujet/demande ou accroche très nette ayant passé plusieurs paliers de distribution.',
      ],
      actionToTest: 'Analyser cette vidéo face aux vidéos du palier pour formuler une hypothèse testable (corrélation ≠ causalité).',
      matchedRealVideos: outlierMatches.map((v) => ({
        title: v.title || 'Sans titre',
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        shares: v.shareCount,
        likesToViewsRatio: safePercent(v.likeCount, v.viewCount, 2) ?? 0,
      })),
    });
  }

  return {
    accountHandle,
    totalVideos,
    totalViews,
    avgViews,
    medianViews,
    totalLikes,
    totalComments,
    totalShares,
    engagementRate,
    likesToViewsRatio,
    medianLikesToViewsRatio,
    commentsToViewsRatio,
    sharesToViewsRatio,
    followersEngagementRate,
    sampleSize: totalVideos,
    topPerformers,
    lowPerformers,
    durationAnalysis: {
      shortUnder30s: shortStats,
      medium30to60s: medStats,
      longOver60s: longStats,
      verdict: durationVerdict,
    },
    cadenceWarning:
      rapidPairsCount > 0
        ? `${rapidPairsCount} publication(s) détectée(s) à moins de 15 minutes d'intervalle sur votre historique : privilégiez au moins 3h entre sorties.`
        : 'Aucune publication rafale (< 15 min) détectée sur cet historique.',
    coreStrengths: [
      `Taux d’engagement global consolidé de ${engagementRate}% (likes/vues médian : ${medianLikesToViewsRatio}%).`,
      topPerformers[0]
        ? `Meilleure portée mesurée : ${topPerformers[0].views.toLocaleString('fr-FR')} vues sur « ${topPerformers[0].title} ».`
        : 'Premières statistiques collectées.',
    ],
    coreWeaknesses: [
      lowPerformers.length > 0
        ? `${lowPerformers.length} publication(s) sous ${lowThreshold.toLocaleString('fr-FR')} vues tirent la dispersion vers le bas.`
        : 'Peu de dispersion extrême observée sur le bas du tableau.',
      'Absence de mesure directe de rétention et d’abonnés attribués par vidéo dans l’API (complément manuel TikTok Studio recommandé).',
    ],
    immediatePriorities: [
      '1. Analyser vos vidéos au-dessus du palier et compléter leur fiche éditoriale dans « Détails ».',
      '2. Lancer au moins 1 expérimentation contrôlée à une seule variable modifiée.',
      '3. Saisir les favoris et abonnés attribués depuis TikTok Studio pour piloter la conversion.',
    ],
    actionRecommendations,
    statisticalSituations,
    interestingRemarks: computeInterestingRemarks(videos, account),
  };
}

export function getInitialStrategicOpportunities(): StrategicOpportunity[] {
  return [
    {
      id: 'opp_generic_before',
      timing: 'AVANT',
      subject: 'Anticiper un événement ou une sortie attendue dans votre thématique',
      category: 'Mindset & Général',
      whyItMatters:
        'Publier avant un pic d’intérêt capte les recherches précoces et les débats de pronostic.',
      freshness: 'Anticipation',
      recommendedAngle: 'Question ouverte ou enjeu concret posé dès les 2 premières secondes.',
      suggestedHook: '« Voici ce qu’il faut surveiller avant que tout le monde en parle… »',
      suggestedSlot: 'Selon les créneaux qualifiés par votre historique dans l’Agenda',
      strategicJustification:
        'Hypothèse éditoriale à valider contre votre médiane habituelle.',
      priority: 'Moyenne',
      verificationStatus: 'Hypothèse éditoriale',
    },
    {
      id: 'opp_generic_after',
      timing: 'APRÈS',
      subject: 'Retour d’analyse ou moment marquant juste après un temps fort',
      category: 'Mindset & Général',
      whyItMatters:
        'Le public recherche activement le détail clé ou le décryptage juste après un événement.',
      freshness: 'Immédiat (< 24h)',
      recommendedAngle: 'Isolement d’un moment précis avec texte contextuel clair à l’écran.',
      suggestedHook: '« Le moment exact qui a tout changé… »',
      suggestedSlot: 'Selon votre meilleur créneau mesuré dans Analytics',
      strategicJustification: 'Format orienté rétention et partages à tester.',
      priority: 'Haute',
      verificationStatus: 'Hypothèse éditoriale',
    },
  ];
}

export function getInitialWeeklyPlan(): StrategicWeeklyPlanItem[] {
  return [];
}

export function getStrategicLessons(): StrategicLesson[] {
  return [
    {
      id: 'lesson_two_seconds',
      title: '1. La clarté immédiate des 2 premières secondes',
      category: 'Accroche & 2 secondes',
      concept:
        'Dans un flux de défilement rapide, l’utilisateur juge quasi instantanément si le sujet l’intéresse ou s’il swipe.',
      whyItWorks:
        'TikTok Newsroom confirme que le temps de visionnage et le visionnage complet sont des signaux majeurs de recommandation.',
      concreteExample:
        'Remplacer une introduction vague par un repère textuel ou visuel clair posant l’enjeu dès 0:00.',
      commonMistake: 'Démarrer par un silence, un plan d’attente ou des salutations génériques.',
      experimentToRun:
        'Tester une accroche textuelle directe sur votre prochaine vidéo et mesurer les vues à H+24.',
      quiz: {
        question: 'Quel est le risque principal d’une introduction lente de 4 secondes ?',
        options: [
          'Aucun si la vidéo dure plus d’une minute.',
          'Provoquer un swipe précoce avant que le cœur du sujet n’apparaisse.',
          'Augmenter mécaniquement le taux de commentaires.',
        ],
        correctOptionIndex: 1,
        explanation: 'Un démarrage lent fait chuter la rétention initiale dès les premières secondes.',
      },
    },
    {
      id: 'lesson_median_vs_average',
      title: '2. Pourquoi la médiane est votre boussole fiable',
      category: 'Multi-Passions',
      concept:
        'Une seule vidéo exceptionnelle gonfle artificiellement la moyenne arithmétique sans refléter votre niveau habituel.',
      whyItWorks:
        'La médiane (avec IQR et MAD) mesure ce qu’obtient une publication typique de votre compte, indépendamment des outliers.',
      concreteExample:
        'Si 4 vidéos font 400–600 vues et 1 vidéo fait 12 000 vues, votre niveau typique reste proche de 500 vues, pas de 2 800.',
      commonMistake:
        'Croire que le compte a changé de palier après un seul pic viral isolé.',
      experimentToRun:
        'Suivre l’évolution de la médiane hors outliers entre deux périodes successives.',
      quiz: {
        question: 'Quelle mesure reflète le mieux le niveau habituel d’un compte ayant 1 pic viral ?',
        options: [
          'La moyenne arithmétique brute.',
          'La médiane (éventuellement complétée par l’IQR).',
          'Le nombre total de likes cumulés.',
        ],
        correctOptionIndex: 1,
        explanation: 'La médiane reste robuste face aux valeurs extrêmes.',
      },
    },
    {
      id: 'lesson_correlation_causation',
      title: '3. Distinguer corrélation et causalité',
      category: 'Algorithme & Cadence',
      concept:
        'Observer qu’une caractéristique est fréquente dans vos meilleures vidéos ne prouve pas qu’elle en est la cause unique.',
      whyItWorks:
        'Le sujet, l’actualité, le timing ou la durée agissent souvent ensemble (facteurs de confusion).',
      concreteExample:
        'Une vidéo du matin qui performe peut devoir son résultat autant au sujet traité qu’à l’heure de publication.',
      commonMistake: 'Changer 4 paramètres d’un coup et attribuer tout le résultat à un seul détail.',
      experimentToRun:
        'Ne modifier qu’une variable mesurable par test dans le journal d’expérimentations.',
      quiz: {
        question: 'Comment vérifier qu’un facteur améliore réellement vos performances ?',
        options: [
          'En l’observant sur 1 seule vidéo réussie.',
          'En menant une expérimentation ne modifiant qu’une caractéristique principale sur des vidéos comparables.',
          'En copiant la durée d’un autre compte.',
        ],
        correctOptionIndex: 1,
        explanation: 'Seule une expérimentation isolant une variable permet de réduire les biais.',
      },
    },
  ];
}

export function getInitialExperiments(): StrategicExperiment[] {
  return [];
}

export function getStrategicMemory(accountScope?: string): StrategicMemory {
  const key = getScopedStrategeKey(accountScope);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.experiments)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read strategic memory:', e);
  }

  const initial: StrategicMemory = {
    updatedAt: new Date().toISOString(),
    customObjectives: [],
    experiments: [],
    completedQuizIds: [],
    weeklyPlan: [],
  };

  saveStrategicMemory(initial, accountScope);
  return initial;
}

export function saveStrategicMemory(mem: StrategicMemory, accountScope?: string): void {
  try {
    mem.updatedAt = new Date().toISOString();
    localStorage.setItem(getScopedStrategeKey(accountScope), JSON.stringify(mem));
  } catch (e) {
    console.warn('Could not save strategic memory:', e);
  }
}

export function addCustomExperiment(
  expData: Omit<StrategicExperiment, 'id' | 'createdAt'>,
  accountScope?: string
): StrategicMemory {
  const current = getStrategicMemory(accountScope);
  const newExp: StrategicExperiment = {
    ...expData,
    id: `exp_custom_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  current.experiments = [newExp, ...current.experiments];
  saveStrategicMemory(current, accountScope);
  return current;
}

export function updateExperimentStatus(
  id: string,
  status: StrategicExperiment['status'],
  observedResults?: string,
  conclusion?: string,
  accountScope?: string
): StrategicMemory {
  const current = getStrategicMemory(accountScope);
  current.experiments = current.experiments.map((e) => {
    if (e.id === id) {
      return {
        ...e,
        status,
        observedResults: observedResults !== undefined ? observedResults : e.observedResults,
        conclusion: conclusion !== undefined ? conclusion : e.conclusion,
        updatedAt: new Date().toISOString(),
      };
    }
    return e;
  });
  saveStrategicMemory(current, accountScope);
  return current;
}

export function markQuizCompleted(quizId: string, accountScope?: string): StrategicMemory {
  const current = getStrategicMemory(accountScope);
  if (!current.completedQuizIds.includes(quizId)) {
    current.completedQuizIds = [...current.completedQuizIds, quizId];
    saveStrategicMemory(current, accountScope);
  }
  return current;
}

export function updatePlanItem(
  updated: StrategicWeeklyPlanItem,
  accountScope?: string
): StrategicMemory {
  const current = getStrategicMemory(accountScope);
  current.weeklyPlan = current.weeklyPlan.map((p) => (p.id === updated.id ? updated : p));
  saveStrategicMemory(current, accountScope);
  return current;
}
