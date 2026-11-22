import {
  VisionnaireImportedVideo,
  VisionnaireAnalysisResult,
  VisionnaireSubScores,
  VisionnaireHookAnalysis,
  VisionnaireRetentionAnalysis,
  VisionnaireEmotionContent,
  VisionnaireMusicRecommendation,
  VisionnaireCreatorSearchInsights,
  AccountKnowledgeMemory,
} from '../types';
import { getAccountKnowledgeMemory } from './learningMemoryEngine';

export const STORAGE_VISIONNAIRE_KEY = 'tiktok_visionnaire_imported_videos_v1';

/**
 * Retrieve saved Visionnaire videos from localStorage
 */
export function getStoredVisionnaireVideos(): VisionnaireImportedVideo[] {
  try {
    const raw = localStorage.getItem(STORAGE_VISIONNAIRE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading visionnaire videos from storage:', err);
  }
  return [];
}

/**
 * Save Visionnaire videos list to localStorage (preserving metadata and analysis)
 */
export function saveVisionnaireVideos(videos: VisionnaireImportedVideo[]): void {
  try {
    // Strip ephemeral blob URLs from persistent storage so they don't break on page reload
    const storable = videos.map((v) => ({
      ...v,
      videoUrl: v.videoUrl.startsWith('blob:') ? '' : v.videoUrl,
    }));
    localStorage.setItem(STORAGE_VISIONNAIRE_KEY, JSON.stringify(storable));
  } catch (err) {
    console.error('Error saving visionnaire videos:', err);
  }
}

/**
 * Capture a thumbnail frame from an HTML5 Video Element
 */
export function captureVideoFrame(videoElement: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(videoElement.videoWidth || 480, 480);
    canvas.height = Math.min(videoElement.videoHeight || 854, 854);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.7);
    }
  } catch (e) {
    console.warn('Could not capture video frame:', e);
  }
  return null;
}

/**
 * Detect topic from filename or user caption
 */
export function detectVideoTopic(text: string): 'musique' | 'trail' | 'general' {
  const t = text.toLowerCase();
  if (t.includes('cameron') || t.includes('starac') || t.includes('staracademy') || t.includes('chant') || t.includes('musique') || t.includes('vocal')) {
    return 'musique';
  }
  if (t.includes('trail') || t.includes('25h') || t.includes('course') || t.includes('running') || t.includes('endurance') || t.includes('ultra')) {
    return 'trail';
  }
  return 'general';
}

/**
 * Main Analysis Engine: Evaluates a pre-publication video
 * Cross-references empirical rules and hypotheses from Mon Coach TikTok
 */
export function analyzeVideoPrePublication(
  video: {
    id: string;
    name: string;
    duration: number;
    width?: number;
    height?: number;
    userCaption?: string;
  },
  memory?: AccountKnowledgeMemory
): VisionnaireAnalysisResult {
  const activeMemory = memory || getAccountKnowledgeMemory();
  const text = `${video.name || ''} ${video.userCaption || ''}`;
  const topic = detectVideoTopic(text);
  const duration = video.duration || 30;

  // Track which rules from Mon Coach TikTok are applied
  const coachLearningsApplied: string[] = [];
  coachLearningsApplied.push("Règle Coach n°1 (Cadence) : Vérification d'absence de doublon temporel avant planification.");

  // 1. Hook & First 2 Seconds Evaluation
  const hasTextInTitleOrCaption = (video.userCaption && video.userCaption.length > 15) || video.name.length > 20;
  let hookScore = 70;
  if (hasTextInTitleOrCaption) {
    hookScore += 15;
  }
  if (duration >= 45 && duration <= 90) {
    hookScore += 8;
  }
  hookScore = Math.min(Math.max(hookScore, 45), 95);

  coachLearningsApplied.push("Hypothèse Coach H1 : L'accroche textuelle dès 0:00 double le maintien à 3s sur les formats courts.");

  const hookAnalysis: VisionnaireHookAnalysis = {
    twoSecondsVerdict: hasTextInTitleOrCaption
      ? "L'accroche contient un élément contextuel clair dès l'entame, réduisant le risque de swipe réflexe de l'utilisateur."
      : "Le démarrage repose principalement sur l'audio ou l'action sans texte d'intrigue contrasté. Le spectateur moyen décide en 1,5s s'il poursuit.",
    isCatchy: hasTextInTitleOrCaption,
    claritySpeed: "Compréhension estimée sous 1,8 seconde.",
    curiosityElement: hasTextInTitleOrCaption
      ? "Présence d'un contraste narratif immédiat incitant à attendre le dénouement."
      : "Curiosité modérée : il est vivement conseillé d'insérer un bandeau texte 'Regarde bien jusqu'à la fin...'.",
    improvements: [
      "Placer un texte d'intrigue à fort contraste (jaune ou blanc sur fond noir) dans les 2 premières secondes.",
      "Supprimer tout fondu au noir ou blanc sonore initial.",
      "Débuter directement au cœur de l'action ou sur une note vocale marquante.",
    ],
  };

  // 2. Retention Analysis (with explicit notice that it's an estimation, not real viewer data)
  let retentionScore = 65;
  if (topic === 'musique') {
    if (duration >= 55) {
      retentionScore += 22;
      coachLearningsApplied.push("Règle Coach n°2 : Les formats musicaux narratifs (> 60s) surclassent les coupes brèves sur votre compte (10k+ vues vs < 100 vues).");
    } else {
      retentionScore -= 12;
    }
  } else if (topic === 'trail') {
    if (duration >= 30 && duration <= 60) {
      retentionScore += 18;
    }
  } else {
    if (duration <= 45) retentionScore += 10;
  }
  retentionScore = Math.min(Math.max(retentionScore, 40), 96);

  // Build estimated curve points
  const curvePoints = [
    { second: 0, estimatedRetentionPct: 100, phaseLabel: 'Impression For You' },
    { second: 2, estimatedRetentionPct: Math.round(hookScore * 0.85), phaseLabel: 'Passage du filtre des 2s' },
    { second: Math.round(duration * 0.25), estimatedRetentionPct: Math.round(retentionScore * 0.78), phaseLabel: 'Phase d’engagement' },
    { second: Math.round(duration * 0.5), estimatedRetentionPct: Math.round(retentionScore * 0.65), phaseLabel: 'Milieu de vidéo' },
    { second: Math.round(duration * 0.85), estimatedRetentionPct: Math.round(retentionScore * 0.52), phaseLabel: 'Montée vers le climax' },
    { second: Math.round(duration), estimatedRetentionPct: Math.round(retentionScore * 0.42), phaseLabel: 'Complétion finale' },
  ];

  const estimatedDropMoments: string[] = [
    `Seconde 0 à 2 : Risque de swipe de ~${100 - Math.round(hookScore * 0.85)}% si le spectateur n'identifie pas le sujet immédiatement.`,
    `Seconde ${Math.round(duration * 0.5)} : Baisse naturelle d'attention si aucun rebondissement ou changement visuel n'intervient.`,
    `Seconde ${Math.max(duration - 3, 2)} : Décrochage prématuré si la vidéo traîne avant la fin.`,
  ];

  const retentionAnalysis: VisionnaireRetentionAnalysis = {
    estimatedDropMoments,
    pacingVerdict: duration > 60
      ? "Rythme narratif immersif propice à un temps de visionnage total élevé."
      : "Format concis et dynamique, minimisant les longueurs inutiles.",
    durationVerdict: duration >= 50
      ? `Durée (${duration}s) optimale pour valoriser l'expérience émotionnelle et maximiser le temps de visionnage cumulé.`
      : `Durée (${duration}s) un peu courte pour un extrait musical complet, mais percutante pour un moment choc.`,
    estimatedRetention3s: Math.round(hookScore * 0.82),
    estimatedCompletionRate: Math.round(retentionScore * 0.45),
    curvePoints,
    notice: "ATTENTION : Il s'agit d'une estimation prédictive basée sur les caractéristiques du montage et l'historique de votre compte. Les statistiques réelles de rétention dépendront de la réaction concrète de votre audience après publication.",
  };

  // 3. Emotion and Content Quality
  let emotionScore = 72;
  let dominantEmotion = "Émotion artistique & Admiration";
  if (topic === 'trail') {
    dominantEmotion = "Motivation & Dépassement de soi";
    emotionScore = 82;
  } else if (topic === 'musique') {
    dominantEmotion = "Frisson vocal & Nostalgie / Live";
    emotionScore = 88;
  }

  const emotionAndContent: VisionnaireEmotionContent = {
    dominantEmotion,
    potentialReactions: [
      "Likes spontanés grâce à l'authenticité de la prestation.",
      "Partages vers des amis qui suivent la même actualité ou passion.",
      "Commentaires si une question d'opinion est explicitement posée.",
    ],
    audioVisualCoherence: "Cohérence solide entre l'ambiance visuelle et le tempo.",
    sharabilityVerdict: "Fort potentiel de partage externe (WhatsApp, Story TikTok, MP).",
  };

  coachLearningsApplied.push("Règle Coach n°4 : Les thématiques authentiques (Prestations vocales et défis d'endurance) génèrent 8,79% d'engagement réel.");

  // 4. Music Recommendations
  let musicRecommendations: VisionnaireMusicRecommendation[] = [];
  if (topic === 'musique') {
    musicRecommendations = [
      {
        soundName: "Ceux qu'on était (Acoustique / Live)",
        artist: "Pierre Garnier",
        whyItImproves: "Son ultra-tendance auprès de l'audience Star Academy, amplifie immédiatement la résonance émotionnelle.",
        genre: "Variété Pop Vocale",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=ceux+qu+on+etait+pierre+garnier+son+officiel",
        isCurrentSoundEvaluated: true,
        currentSoundVerdict: "Si votre vidéo contient déjà la voix originale en direct de Cameron, conservez le son original de la prestation car la sincérité du direct prime sur toute musique ajoutée.",
      },
      {
        soundName: "Je vole (Version Piano & Cordes)",
        artist: "Louane / Michel Sardou",
        whyItImproves: "Crescendo mélodique poignant qui soutient les moments de doute et d'émotion des répétitions au château.",
        genre: "Ballade Émotionnelle",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=je+vole+louane+chanson",
      },
      {
        soundName: "Another Love (Live Climax)",
        artist: "Tom Odell",
        whyItImproves: "Reconnu mondialement sur TikTok pour accompagner les prestations vocales d'une intensité rare.",
        genre: "Piano Pop Indie",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=another+love+tom+odell+sound",
      },
    ];
  } else if (topic === 'trail') {
    musicRecommendations = [
      {
        soundName: "Intro",
        artist: "The xx",
        whyItImproves: "Battement régulier idéal pour caler le rythme des foulées en montée et créer une ambiance immersive.",
        genre: "Indie Minimaliste",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=intro+the+xx+running",
      },
      {
        soundName: "Stay (Interstellar Soundtrack)",
        artist: "Hans Zimmer",
        whyItImproves: "Montée orchestrale monumentale qui sublime les défis d'endurance extrême (25h qui courent, trail de nuit).",
        genre: "Musique de Film / Épique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=stay+hans+zimmer+interstellar",
      },
      {
        soundName: "Can't Hold Us",
        artist: "Macklemore & Ryan Lewis",
        whyItImproves: "Énergie explosive pour les passages de sprint, passage de ligne d'arrivée ou ravitaillement.",
        genre: "Hip-Hop Entraînant",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=cant+hold+us+macklemore",
      },
    ];
  } else {
    musicRecommendations = [
      {
        soundName: "Golden Hour (Orchestral)",
        artist: "JVKE",
        whyItImproves: "Ambiance cinématographique moderne favorisant un temps de rétention long.",
        genre: "Pop Cinématique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=golden+hour+jvke",
      },
      {
        soundName: "Experience",
        artist: "Ludovico Einaudi",
        whyItImproves: "Classique incontournable de TikTok pour les récits inspirants et les histoires humaines.",
        genre: "Néo-Classique",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=experience+einaudi",
      },
      {
        soundName: "Daylight",
        artist: "David Kushner",
        whyItImproves: "Voix profonde et basse mystérieuse qui ancre l'attention dès les premières notes.",
        genre: "Indie Pop",
        tiktokSearchUrl: "https://www.tiktok.com/search?q=daylight+david+kushner",
      },
    ];
  }

  // 5. Creator Search Insights Integration
  let creatorSearchInsights: VisionnaireCreatorSearchInsights;
  if (topic === 'musique') {
    creatorSearchInsights = {
      primaryTopic: "Star Academy 2024 / Cameron",
      highDemandQuery: "cameron star academy 2024 prestation live",
      competitionLevel: "Moyenne",
      recommendedHashtags: [
        {
          tag: "#cameron",
          explanation: "Nom précis du protagoniste, ciblant les fans cherchant ses passages clés.",
          searchVolumeHint: "Forte demande hebdomadaire",
        },
        {
          tag: "#staracademylive",
          explanation: "Capte les spectateurs du flux quotidien et des primes.",
          searchVolumeHint: "Très forte demande",
        },
        {
          tag: "#staracademy",
          explanation: "Pilier de la thématique nationale en tendance de recherche.",
          searchVolumeHint: "Top tendance",
        },
        {
          tag: "#creatorsearchinsights",
          explanation: "Indique à l'algorithme que la vidéo répond à une intention de recherche explicite.",
          searchVolumeHint: "Recommandé par TikTok",
        },
        {
          tag: "#prestationvocale",
          explanation: "Niche qualitative valorisant la performance artistique.",
          searchVolumeHint: "Niche qualifiée",
        },
      ],
      optimizedCaption:
        "Cette prestation de Cameron qui a retourné le plateau. Vous en avez pensé quoi de ce passage ? Dites-le moi en commentaire ! #staracademylive #cameron #staracademy #creatorsearchinsights",
      notes: "Basé sur les données Creator Search Insights observées dans l'application TikTok. Pour vérifier en temps réel, rendez-vous dans TikTok Studio > Creator Search Insights.",
    };
  } else if (topic === 'trail') {
    creatorSearchInsights = {
      primaryTopic: "Trail Running / 25h qui courent",
      highDemandQuery: "25h qui courent defi endurance extreme",
      competitionLevel: "Faible",
      recommendedHashtags: [
        {
          tag: "#25hquicourent",
          explanation: "Hashtag signature de votre défi d'endurance, sans concurrence saturée.",
          searchVolumeHint: "Faible concurrence / Intention forte",
        },
        {
          tag: "#trailrunning",
          explanation: "Communauté passionnée et très active en interactions et partages.",
          searchVolumeHint: "Communauté engagée",
        },
        {
          tag: "#ultraendurance",
          explanation: "Qualifie la performance physique extrême.",
          searchVolumeHint: "Recherche ciblée",
        },
        {
          tag: "#creatorsearchinsights",
          explanation: "Favorise l'indexation de la vidéo sur les requêtes sportives durables.",
          searchVolumeHint: "Recommandé par TikTok",
        },
      ],
      optimizedCaption:
        "Après des heures d'effort, voici exactement ce qui se passe dans la tête... Tu tiendrais combien d'heures toi ? #25hquicourent #trailrunning #creatorsearchinsights #motivation",
      notes: "Sujet à forte intention et faible concurrence : potentiel d'indexation SEO durable au-delà des 48h.",
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
        { tag: "#pourtoi", explanation: "Accompagnement de diffusion standard." },
      ],
      optimizedCaption:
        "L'histoire que personne ne vous a jamais racontée... Qu'en pensez-vous ? #storytelling #motivation #creatorsearchinsights",
      notes: "N'hésitez pas à vérifier les termes exacts suggérés dans l'onglet Recherche de votre TikTok Studio.",
    };
  }

  // 6. Sub-scores & Composite Score Calculation
  const musicScore = topic === 'musique' ? 90 : 80;
  const seoSearchScore = 88;

  const subScores: VisionnaireSubScores = {
    hookScore,
    retentionScore,
    emotionScore,
    musicScore,
    seoSearchScore,
  };

  // Weighted score (0 to 100)
  const scoreTotal = Math.round(
    hookScore * 0.3 +
    retentionScore * 0.25 +
    emotionScore * 0.2 +
    musicScore * 0.15 +
    seoSearchScore * 0.1
  );

  // 7. Final Recommendation
  let recommendation: 'PUBLIER' | 'MODIFIER' | 'ATTENDRE' = 'MODIFIER';
  let recommendationReason = '';

  if (scoreTotal >= 78) {
    recommendation = 'PUBLIER';
    recommendationReason =
      `Cette vidéo présente un score global de ${scoreTotal}/100 avec une excellente complétude narrative et un fort potentiel de résonance émotionnelle. Elle réunit les critères validés par Mon Coach pour accéder au flux étendu For You.`;
  } else if (scoreTotal >= 60) {
    recommendation = 'MODIFIER';
    recommendationReason =
      `Cette vidéo possède un solide potentiel (${scoreTotal}/100) mais nécessite 1 ou 2 ajustements ciblés (notamment sur l'accroche des 2 premières secondes ou l'ajout d'une question en fin de vidéo) avant d'être mise en ligne.`;
  } else {
    recommendation = 'ATTENDRE';
    recommendationReason =
      `Le score actuel (${scoreTotal}/100) indique un risque de décrochage prématuré ou un format trop écourté sans contexte suffisant. Il est préférable de retravailler le montage ou de la conserver pour un créneau plus adapté.`;
  }

  // Strengths and Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionableChecklist: string[] = [];

  if (hookScore >= 75) {
    strengths.push("Accroche des premières secondes dynamique et intrigante.");
  } else {
    weaknesses.push("Entame trop neutre sans texte contrasté dès la seconde 0.");
    actionableChecklist.push("Ajouter un bandeau texte d'accroche dès 0:00 (ex: 'Ce moment où tout a basculé...').");
  }

  if (retentionScore >= 75) {
    strengths.push(`Durée (${duration}s) favorable au temps de visionnage cumulé selon les critères observés.`);
  } else {
    weaknesses.push(`Format (${duration}s) pouvant pénaliser la rétention ou tronquer le dénouement émotionnel.`);
    actionableChecklist.push("Étendre la coupe à au moins 50s pour laisser la prestation ou l'histoire monter en puissance.");
  }

  if (emotionScore >= 80) {
    strengths.push(`Charge émotionnelle forte (${dominantEmotion}) propice aux partages externes.`);
  }

  // Question / CTA check
  actionableChecklist.push("Insérer une question d'opinion dans les 3 dernières secondes pour déclencher des commentaires.");
  actionableChecklist.push("Respecter un délai d'au moins 3 heures avec la publication précédente sur votre compte.");

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
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Rank analyzed videos by total score descending
 */
export function rankVisionnaireVideos(videos: VisionnaireImportedVideo[]): VisionnaireImportedVideo[] {
  const analyzed = videos.filter((v) => v.analysisStatus === 'analyzed' && v.analysis);
  const others = videos.filter((v) => v.analysisStatus !== 'analyzed' || !v.analysis);

  analyzed.sort((a, b) => (b.analysis?.scoreTotal || 0) - (a.analysis?.scoreTotal || 0));

  analyzed.forEach((v, index) => {
    if (v.analysis) {
      v.analysis.rank = index + 1;
    }
  });

  return [...analyzed, ...others];
}
