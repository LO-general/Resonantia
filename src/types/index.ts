export type ContentStatus = 'draft' | 'scheduled' | 'published';
export type RepostStatus = 'scheduled' | 'reposted';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  age?: number;
  photoURL?: string | null;
  createdAt?: string;
  role?: 'admin' | 'user';
}

export interface VideoAnalysis {
  title: string;
  subject: string;
  ambiance: string;
  visualStyle: string;
  targetAudience: string;
  hook: string;
  caption: string;
  hashtags: string[];
  recommendedPostingTime: string;
  contentTips?: string[];
}

export interface PerformanceCheckpoint {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites?: number;
  engagementRate: number;
  recordedAt: string; // ISO date
}

export interface PerformanceMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number; // percentage, e.g. 8.4
  dayOfWeek: string; // 'Lundi' | 'Mardi' | ...
  exactPublishedAt: string; // ISO date-time
  checkpoints?: {
    h24?: PerformanceCheckpoint;
    h48?: PerformanceCheckpoint;
    d7?: PerformanceCheckpoint;
  };
}

export interface ContentItem {
  id: string;
  userId: string; // Isolated by User UID
  title: string;
  videoFileName: string;
  videoBlobId?: string; // Stored in IndexedDB blobs store
  videoUrl?: string; // Object URL or Firebase Storage Download URL
  storagePath?: string; // e.g. users/{uid}/videos/{id}.mp4
  storageStatus: 'firebase_storage' | 'local_persistent';
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  hasGeminiAnalysis: boolean;
  analysis?: VideoAnalysis;
  analysisError?: string;
  caption: string;
  hashtags: string[];
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: ContentStatus;
  createdAt: string;
  publishedAt?: string;
  notes?: string;
  metrics?: PerformanceMetrics;
}

export type RepostAuthorizationStatus =
  | 'en_attente'
  | 'obtenue'
  | 'refusee'
  | 'non_requise_domaine_public';

export interface RepostItem {
  id: string;
  userId: string; // Isolated by User UID
  tiktokUrl: string;
  title: string;
  creatorHandle: string;
  sourcePlatform?: string; // e.g. 'TikTok', 'Instagram', 'YouTube', 'Autre'
  contentType?: string; // e.g. 'Extrait vidéo', 'Compilation', 'Prestation live', 'Tutoriel'
  category: string;
  thumbnailUrl?: string;
  repostReason: string;
  suggestedComment?: string;
  recommendedTiming?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: RepostStatus;
  createdAt: string;
  repostedAt?: string;
  notes?: string;
  // Rights & Licensing protection (PARTIE 6)
  authorizationStatus?: RepostAuthorizationStatus;
  authorizationDate?: string;
  usageTerms?: string;
  modificationAllowed?: boolean | null;
  commercialUseAllowed?: boolean | null;
  authorizationProof?: string;
  musicRightsVerified?: boolean;
  repostMode?: 'native_repost' | 'duet' | 'stitch' | 'authorized_reupload';
}

export interface CaptionVariant {
  variantName: string;
  caption: string;
  hashtags: string[];
  whyItWorks: string;
}

export interface WeeklyAnalyticsReport {
  generatedAt: string;
  sampleSize: number;
  sampleConfidence: 'faible' | 'modérée' | 'élevée';
  confidenceWarning?: string;
  summary: string;
  bestDay: string;
  bestTimeSlot: string;
  averageEngagementRate: number;
  keyInsights: string[];
  recommendations: string[];
}

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface TikTokAccountData {
  openId: string; // Unique TikTok identifier
  unionId?: string;
  username: string; // @pseudo
  displayName: string;
  avatarUrl?: string;
  profileDeepLink?: string;
  isVerified?: boolean;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  connectedAt: string;
  scopesGranted: string[];
  source: 'official_api' | 'manual_link';
}

export interface GranularTimeSlotStat {
  key: string;
  dayName: string;
  hour: number;
  minuteInterval?: string; // e.g. "00-30" or "30-59"
  slotLabel: string; // e.g. "Mardi à 17h00" ou "19h30"
  videoCount: number;
  meanViews: number;
  medianViews: number;
  meanEngagementRate: number;
  meanLikes: number;
  meanComments: number;
  meanShares: number;
  confidence: 'faible' | 'modérée' | 'élevée';
  isRecommended: boolean;
  recommendationReason?: string;
}

export interface GranularDayStat {
  dayName: string;
  videoCount: number;
  meanViews: number;
  medianViews: number;
  meanEngagementRate: number;
  meanLikes: number;
  meanComments: number;
  meanShares: number;
  totalViews: number;
  confidence: 'faible' | 'modérée' | 'élevée';
}

export interface FairVideoComparison {
  id: string;
  title: string;
  coverImageUrl?: string;
  shareUrl?: string;
  exactPublishedAt: string;
  dayName: string;
  timeString: string;
  ageHours: number;
  ageDays: number;
  views: number;
  viewsPerDay: number;
  viewsPerHour: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  hasCheckpoints: boolean;
  checkpointH24?: { views: number; likes: number; comments: number };
  checkpointH48?: { views: number; likes: number; comments: number };
  checkpointD7?: { views: number; likes: number; comments: number };
  comparisonNotice: string;
}

export interface TikTokCoachReport {
  generatedAt: string;
  dataFingerprint: string;
  accountHandle: string;
  sampleSize: number;
  sampleConfidence: 'faible' | 'modérée' | 'élevée';
  methodologyWarning: string;
  executiveSummary: string;
  whatWorks: Array<{
    title: string;
    observation: string;
    metricProof: string;
    hypothesis: string;
  }>;
  whatCanImprove: Array<{
    title: string;
    observation: string;
    metricProof: string;
    actionableTip: string;
  }>;
  recommendedActions: Array<{
    priority: 'haute' | 'moyenne' | 'tactique';
    title: string;
    action: string;
    expectedImpact: string;
  }>;
  faqAnswers: Record<string, string>;
}

export type MetricProvenance =
  | 'tiktok_api'
  | 'manual_input'
  | 'import'
  | 'internal_calculation';

export type MetricStatus =
  | 'measured'
  | 'verified_zero'
  | 'unknown'
  | 'not_provided_by_tiktok'
  | 'not_yet_collected'
  | 'estimated';

export interface MetricValue<T = number> {
  value: T | null;
  status: MetricStatus;
  provenance: MetricProvenance;
  collectedAt?: string;
  note?: string;
}

export type ContentMode = 'creation' | 'repost' | 'both';
export type ContentNature = 'creation' | 'repost';

export interface VideoEditorialMetadata {
  videoId: string;
  userId?: string;
  subject?: string;
  angle?: string;
  hook?: string;
  onScreenText?: string;
  musicName?: string;
  rhythm?: 'rapide' | 'modéré' | 'lent';
  emotion?: string;
  narration?: string;
  structure?: string;
  contentNature?: ContentNature;
  manualFavoritesCount?: number | null;
  manualAttributedFollowers?: number | null;
  manualViewsCount?: number | null;
  updatedAt: string;
}

export interface TikTokOfficialVideo {
  id: string; // Official TikTok video ID
  accountId: string; // TikTok open_id
  createTime: number; // unix timestamp in seconds
  title: string;
  videoDescription: string;
  duration?: number;
  durationStatus?: MetricStatus;
  coverImageUrl?: string;
  shareUrl?: string;
  viewCount: number;
  viewCountStatus?: MetricStatus;
  likeCount: number;
  likeCountStatus?: MetricStatus;
  commentCount: number;
  commentCountStatus?: MetricStatus;
  shareCount: number;
  shareCountStatus?: MetricStatus;
  favoriteCount?: number | null;
  favoriteCountStatus?: MetricStatus;
  soundTitle?: string;
  hashtags?: string[];
  engagementRate: number; // ((likes + comments + shares) / views) * 100
  contentNature?: ContentNature;
  attributedFollowers?: number | null;
  attributedFollowersSource?: 'tiktok_api' | 'manual_input' | 'unavailable';
  editorialMeta?: VideoEditorialMetadata;
  source: 'official_api' | 'manual';
  lastSyncedAt: string;
}

export interface CounterCorrectionLog {
  id: string;
  accountId: string;
  videoId: string;
  videoTitle?: string;
  metric: 'views' | 'likes' | 'comments' | 'shares' | 'followers';
  previousValue: number;
  newValue: number;
  delta: number;
  previousDate: string;
  recordedAt: string;
  note: string;
}

export interface TikTokMetricSnapshot {
  id: string;
  accountId: string;
  videoId: string;
  videoTitle?: string;
  fetchDate: string; // ISO date
  views: number;
  deltaViewsSincePrevious?: number | null;
  likes: number;
  comments: number;
  shares: number;
  favorites?: number | null;
  engagementRate: number;
  source: 'official_api' | 'manual';
  checkpointType?: 'current' | 'h1' | 'h5' | 'h24' | 'h48' | 'd7';
  counterCorrected?: boolean;
}

export interface TikTokApiConfigStatus {
  isConfigured: boolean;
  isConnected: boolean;
  account?: TikTokAccountData | null;
  missingScopes?: string[];
  redirectUri: string;
  serverMessage?: string;
}

export interface VideoRetentionData {
  videoId: string;
  averageWatchTimeSeconds?: number;
  completionRatePercentage?: number;
  retentionAt3SecondsPercentage?: number;
  source: 'tiktok_studio_manual' | 'estimated';
  updatedAt: string;
}

export interface VideoCausalDiagnosis {
  category: 'viral_hit' | 'high_performer' | 'engagement_bottleneck' | 'distribution_limited' | 'retention_flop' | 'duplicate_suppressed';
  categoryLabel: string;
  badgeColor: string;
  summary: string;
  reachStatus: string;
  audienceReaction: string;
  hypotheses: string[];
  actionableRecommendations: string[];
}

export interface VideoClusterGroup {
  id: string;
  topic: string;
  description: string;
  videoCount: number;
  topVideo: {
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
    shareUrl?: string;
    coverImageUrl?: string;
  };
  lowestVideo: {
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
    shareUrl?: string;
    coverImageUrl?: string;
  };
  viewRatio: number;
  varianceExplanation: string;
  videos: Array<{
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
    shareUrl?: string;
    coverImageUrl?: string;
  }>;
}

export interface PerformanceTiersData {
  p75Views: number;
  p50Views: number;
  p25Views: number;
  topTier: Array<{
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
  }>;
  averageTier: Array<{
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
  }>;
  flopTier: Array<{
    id: string;
    title: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    engagementRate: number;
    duration: number;
    createTime: number;
  }>;
  topTraits: {
    avgDuration: number;
    avgEngagement: number;
    topDays: string[];
    topHours: string[];
    commonTags: string[];
  };
  flopTraits: {
    avgDuration: number;
    avgEngagement: number;
    commonTags: string[];
    rapidPostingIncidents: number;
  };
}

export type ActiveTab =
  | 'vision'
  | 'connect'
  | 'comprendre'
  | 'content-mode'
  | 'stratege'
  | 'coach'
  | 'visionnaire'
  | 'analytics'
  | 'dashboard'
  | 'creator'
  | 'repost'
  | 'music-advisor'
  | 'comprendre-tiktok'
  | 'calendar'
  | 'library'
  | 'tiktok-portal';

// ==========================================
// PÉDAGOGIE, MÉMOIRE & APPRENTISSAGE TIKTOK
// ==========================================

export interface Module1WhatWorksItem {
  element: string; // CE QUI FONCTIONNE
  mechanism: string; // POURQUOI CELA FONCTIONNE
  proof: string; // PREUVE
  comparison: string; // COMPARAISON
  conclusion: string; // CONCLUSION
}

export interface Module2WhatFailsItem {
  problem: string; // CE QUI NE FONCTIONNE PAS
  mechanism: string; // POURQUOI CELA NE FONCTIONNE PAS
  proof: string; // PREUVE
  comparison: string; // COMPARAISON
  conclusion: string; // CONCLUSION
  dimension?: 'two_seconds' | 'hook' | 'pacing' | 'duration' | 'music_choice' | 'lyrics_emotion' | 'visual_changes' | 'narrative' | 'ending' | 'cadence';
}

export interface Module3ImprovementItem {
  targetElement: string; // 1. CE QUI PEUT ÊTRE AMÉLIORÉ
  howToImprove: string; // 2. COMMENT L'AMÉLIORER
  whyThisModification: string; // 3. POURQUOI CETTE MODIFICATION
  groundedObservation: string; // 4. SUR QUELLE OBSERVATION S'APPUYER
  concreteTest: string; // 5. CE QU'IL FAUT TESTER
}

export interface PedagogicalFinalSynthesis {
  whatWorksSummary: string; // A. CE QUI FONCTIONNE
  whatFailsSummary: string; // B. CE QUI NE FONCTIONNE PAS
  improvementsSummary: string; // C. CE QUI PEUT ÊTRE AMÉLIORÉ
  whatLearned: string; // D. CE QUE J'AI APPRIS (mécanisme principal à retenir)
  nextTest: { // E. LE PROCHAIN TEST
    hypothesis: string;
    experiment: string;
    metricToWatch: string;
    status: 'a_tester' | 'valide' | 'refute';
    testResultNotes?: string;
  };
}

export interface PedagogicalAnalysis {
  generatedAt: string;
  videoId: string;
  // Les 3 modules obligatoires
  module1WhatWorks: Module1WhatWorksItem[];
  module2WhatFails: Module2WhatFailsItem[];
  module3Improvements: Module3ImprovementItem[];
  // Format final A / B / C / D / E
  finalSynthesis: PedagogicalFinalSynthesis;
  // Distinction stricte Faits / Observations / Hypothèses / Conclusions / Tests
  facts: string[]; // FAIT : élément directement observable dans les statistiques ou la vidéo
  observations: string[]; // OBSERVATION : différence constatée entre plusieurs publications
  hypotheses: string[]; // HYPOTHÈSE : explication possible de cette différence
  conclusions: string[]; // CONCLUSION : explication soutenue par plusieurs observations concordantes
  tests: string[]; // TEST : expérience permettant de vérifier l'hypothèse
  dataMissingNotices?: string[]; // Indication claire si données insuffisantes (ex: rétention non renseignée)
}

export interface VideoQualitativeTraits {
  hookType: 'visuelle' | 'sonore' | 'texte' | 'mixte' | 'inconnue';
  twoSecondsHookDescription?: string;
  musicAndTrackName?: string;
  musicExcerptType?: 'intro' | 'refrain_climax' | 'acoustique_brute' | 'inconnu';
  emotionalTone?: 'emouvant' | 'motivant' | 'intrigant' | 'neutre';
  pacing: 'rapide' | 'modéré' | 'lent';
  visualChangesFrequency?: 'toutes_les_1_2s' | 'toutes_les_3_5s' | 'plan_fixe_continu';
  narrativeArc?: string;
  endingType?: 'cta_abonne' | 'fin_brutale' | 'boucle_parfaite' | 'point_d_interrogation';
}

export interface VideoMemoryCard {
  id: string; // = videoId
  videoId: string;
  videoTitle: string;
  createTime: number;
  duration: number;
  description: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  };
  retention: VideoRetentionData;
  qualitativeTraits: VideoQualitativeTraits;
  pedagogicalAnalysis: PedagogicalAnalysis;
  testStatus: 'a_tester' | 'valide' | 'refute';
  testNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountKnowledgeMemory {
  accountHandle: string;
  totalAnalyzedVideos: number;
  verifiedRules: Array<{
    id: string;
    rule: string;
    confirmedByVideosCount: number;
    evidence: string;
    confidence: 'solide' | 'très_solide';
  }>;
  activeHypotheses: Array<{
    id: string;
    hypothesis: string;
    testCount: number;
    currentTrend: 'favorable' | 'mitigé' | 'défavorable';
    nextStep: string;
  }>;
  testedLearnings: Array<{
    id: string;
    lesson: string;
    originalVideoId: string;
    validationVideoId?: string;
    outcome: 'validé' | 'réfuté' | 'en_attente';
    notes: string;
    date: string;
  }>;
  updatedAt: string;
}

export interface ComparativeAnalysisResult {
  videoA: TikTokOfficialVideo;
  videoB: TikTokOfficialVideo;
  commonTraits: string[];
  keyDifferences: Array<{
    aspect: string;
    videoAValue: string;
    videoBValue: string;
    impactLikelihood: 'faible' | 'moyenne' | 'forte';
  }>;
  presentInBestAbsentInOther: string[];
  retentionComparison: string;
  causalExplanation: string;
  // Distinction stricte
  facts: string[];
  observations: string[];
  hypotheses: string[];
  conclusion: string;
  testRecommendation: string;
}

// ==========================================
// MON VISIONNAIRE TIKTOK (PRÉ-PUBLICATION)
// ==========================================

export interface VisionnaireSubScores {
  hookScore: number; // /100
  retentionScore: number; // /100
  emotionScore: number; // /100
  musicScore: number; // /100
  seoSearchScore: number; // /100
}

export interface VisionnaireHookAnalysis {
  twoSecondsVerdict: string;
  isCatchy: boolean;
  claritySpeed: string;
  curiosityElement: string;
  improvements: string[];
}

export interface VisionnaireRetentionPoint {
  second: number;
  estimatedRetentionPct: number;
  phaseLabel: string;
}

export interface VisionnaireRetentionAnalysis {
  estimatedDropMoments: string[];
  pacingVerdict: string;
  durationVerdict: string;
  estimatedRetention3s: number; // %
  estimatedCompletionRate: number; // %
  curvePoints: VisionnaireRetentionPoint[];
  notice: string; // Explication stricte: estimation pré-publication heuristique
}

export interface VisionnaireEmotionContent {
  dominantEmotion: string;
  potentialReactions: string[]; // likes, comms, shares
  audioVisualCoherence: string;
  sharabilityVerdict: string;
}

export interface VisionnaireMusicRecommendation {
  soundName: string;
  artist: string;
  whyItImproves: string;
  genre: string;
  tiktokSearchUrl: string;
  isCurrentSoundEvaluated?: boolean;
  currentSoundVerdict?: string;
}

export interface VisionnaireSearchInsightTag {
  tag: string;
  explanation: string;
  searchVolumeHint?: string;
}

export interface VisionnaireCreatorSearchInsights {
  primaryTopic: string;
  highDemandQuery: string;
  competitionLevel: 'Faible' | 'Moyenne' | 'Élevée';
  recommendedHashtags: VisionnaireSearchInsightTag[];
  optimizedCaption: string;
  notes: string;
}

export interface VisionnaireAnalysisResult {
  scoreTotal: number; // 0 à 100
  recommendation: 'PUBLIER' | 'MODIFIER' | 'ATTENDRE';
  recommendationReason: string;
  rank?: number;
  subScores: VisionnaireSubScores;
  hookAnalysis: VisionnaireHookAnalysis;
  retentionAnalysis: VisionnaireRetentionAnalysis;
  emotionAndContent: VisionnaireEmotionContent;
  musicRecommendations: VisionnaireMusicRecommendation[];
  creatorSearchInsights: VisionnaireCreatorSearchInsights;
  strengths: string[];
  weaknesses: string[];
  actionableChecklist: string[];
  coachLearningsApplied: string[];
  analyzedAt: string;
}

export interface VisionnaireImportedVideo {
  id: string;
  name: string;
  fileSize: number;
  duration: number; // en secondes
  width: number;
  height: number;
  videoUrl: string; // Blob URL ou data URL
  thumbnailUrl?: string; // Image capturée de la vidéo
  importedAt: string;
  userCaption?: string;
  detectedTopic?: string;
  analysisStatus: 'pending' | 'analyzing' | 'analyzed' | 'error';
  analysisError?: string;
  analysis?: VisionnaireAnalysisResult;
}

// ==========================================
// ORIENTATION DE LA PAGE (STRATÉGIE MULTI-PASSIONS)
// ==========================================

export type PageUniverseId = 'musique_starac' | 'running_trail' | 'cyclisme_velo' | 'general_mindset';

export interface PageUniverseStats {
  id: PageUniverseId;
  name: string;
  badgeColor: string;
  videoCount: number;
  totalViews: number;
  avgViews: number;
  medianViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  estimatedFollowersGained: number;
  regularityDescription: string;
  shareOfAccountViewsPct: number;
  topVideo: {
    id: string;
    title: string;
    views: number;
    likes: number;
  };
  sampleVideos: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    duration: number;
    createTime: number;
  }>;
}

export interface UniverseBridgeIdea {
  title: string;
  hookConcept: string;
  whyItWorks: string;
  bridgeType: 'musique_vers_sport' | 'sport_vers_musique' | 'emotion_commune' | 'histoire_humaine';
  concreteIdea: string;
  recommendedSound: string;
}

export interface PageOrientationReport {
  generatedAt: string;
  topPerformingUniverse: string;
  highestGrowthPotentialUniverse: string;
  canCohabitVerdict: string;
  cohabitationFeasibility: 'faisable' | 'très_faisable' | 'attention_cadence';
  universes: PageUniverseStats[];
  editorialStrategy: {
    recommendedSplitRatio: string;
    alternationPattern: string;
    transitionStrategy: string;
    audiencePreservationTips: string[];
  };
  bridgeIdeas: UniverseBridgeIdea[];
  publicationRoadmap: {
    weeklyScheduleSuggestion: Array<{ day: string; universe: string; focusFormat: string; slot: string }>;
    progressiveTestProtocol: string;
  };
  audienceEvolutionAndRisks: {
    identifiedRisks: string[];
    safeguards: string[];
    subscriberRetentionAdvice: string;
  };
  answersToMandatoryQuestions: {
    q1_top_performer: string;
    q2_growth_potential: string;
    q3_can_cohabit: string;
    q4_current_risks: string;
    q5_develop_second_without_losing_first: string;
    q6_three_next_actions: string[];
  };
}

// ==========================================
// MON STRATÈGE TIKTOK : TYPES & STRUCTURES
// ==========================================

export interface StrategicOpportunity {
  id: string;
  timing: 'AVANT' | 'PENDANT' | 'APRÈS';
  subject: string;
  category: 'Star Academy & Musique' | 'Sport & Trail' | 'Cyclisme & Vélo' | 'Mindset & Général';
  whyItMatters: string;
  freshness: 'Immédiat (< 24h)' | 'En cours' | 'Anticipation' | 'Permanent';
  recommendedAngle: string;
  suggestedHook: string;
  suggestedSlot: string;
  strategicJustification: string;
  priority: 'Haute' | 'Moyenne' | 'Test';
  verificationStatus: 'Certifié par les données' | 'Tendance vérifiée' | 'Hypothèse éditoriale';
}

export interface StrategicWeeklyPlanItem {
  id: string;
  day: string;
  timeSlot: string;
  subject: string;
  category: string;
  objective: 'Visibilité / Vues' | 'Fidélisation' | 'Conversion Abonnés' | 'Rétention';
  recommendedAngle: string;
  strategicJustification: string;
  priority: 'Haute' | 'Moyenne' | 'Secondaire';
  status: 'recommandé' | 'planifié' | 'publié';
  notes?: string;
}

export interface StrategicExperiment {
  id: string;
  title: string;
  hypothesis: string;
  variableTested: 'Accroche (2 premières secondes)' | 'Durée (court vs long)' | 'Rythme de montage' | 'Angle éditorial' | 'Délai post-événement' | 'Cadence de publication';
  targetVideoTitle: string;
  controlVideoTitle?: string;
  primaryMetric: string;
  observedResults?: string;
  conclusion?: string;
  status: 'a_lancer' | 'en_cours' | 'concluant' | 'non_concluant';
  createdAt: string;
  updatedAt?: string;
}

export interface StrategicLesson {
  id: string;
  title: string;
  category: 'Accroche & 2 secondes' | 'Rétention & Rythme' | 'Algorithme & Cadence' | 'Multi-Passions' | 'Conversion Abonnés';
  concept: string;
  whyItWorks: string;
  concreteExample: string;
  commonMistake: string;
  experimentToRun: string;
  quiz: {
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  };
}

export interface StrategicActionRecommendation {
  id: string;
  priority: 'Élevée' | 'Moyenne' | 'Secondaire';
  title: string;
  constat: string;
  explication: string;
  action: string;
  objectif: string;
  mesure: string;
  targetMetric: string;
  themeTag?: string;
}

export interface StatisticalSituationAnalysis {
  id: 'situation_a' | 'situation_b' | 'situation_c' | 'situation_d' | 'situation_e';
  code: string;
  title: string;
  scenarioDescription: string;
  exampleMetrics: {
    views?: number;
    h1?: number;
    h5?: number;
    h24?: number;
    h48?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    likesToViewsRatio?: number;
  };
  observedFacts: string[];
  plausibleHypotheses: string[];
  actionToTest: string;
  suggestedCallToActions?: string[];
  matchedRealVideos?: Array<{
    title: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    likesToViewsRatio: number;
  }>;
}

export type InterestingRemarkDimension =
  | 'Portée'
  | 'Interaction'
  | 'Conversion'
  | 'Valeur stratégique';

export type InterestingRemarkCategory =
  | 'high_views_low_likes'
  | 'high_comments'
  | 'high_shares'
  | 'low_views_high_interaction'
  | 'positive_outlier'
  | 'counter_intuitive';

export interface InterestingRemarkVideoExample {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  likeRate: number;
  commentRate: number;
  shareRate: number;
  engagementRate: number;
  duration: number;
  shareUrl?: string;
}

export interface InterestingRemarkItem {
  id: string;
  category: InterestingRemarkCategory;
  categoryLabel: string;
  title: string;
  statisticalObservation: string;
  explanation: string;
  strategicInterest: string;
  experimentIdea?: string;
  dataLimitsNote: string;
  dimensionsImpacted: InterestingRemarkDimension[];
  baselineComparisons: Array<{
    label: string;
    videoValue: string;
    accountBaseline: string;
  }>;
  featuredVideos: InterestingRemarkVideoExample[];
}

export interface StrategicAccountDiagnostic {
  accountHandle: string;
  totalVideos: number;
  totalViews: number;
  avgViews: number;
  medianViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number; // views-based engagement: ((likes+comments+shares)/views)*100
  likesToViewsRatio: number; // (totalLikes / totalViews) * 100
  medianLikesToViewsRatio: number; // median of per-video ratios
  commentsToViewsRatio: number; // (totalComments / totalViews) * 100
  sharesToViewsRatio: number; // (totalShares / totalViews) * 100
  followersEngagementRate: number; // ((totalInteractions) / followerCount) * 100
  sampleSize: number;
  topPerformers: Array<{ title: string; views: number; reason: string }>;
  lowPerformers: Array<{ title: string; views: number; reason: string }>;
  durationAnalysis: {
    shortUnder30s: { count: number; avgViews: number; medianViews: number };
    medium30to60s: { count: number; avgViews: number; medianViews: number };
    longOver60s: { count: number; avgViews: number; medianViews: number };
    verdict: string;
  };
  cadenceWarning: string;
  coreStrengths: string[];
  coreWeaknesses: string[];
  immediatePriorities: string[];
  actionRecommendations?: StrategicActionRecommendation[];
  statisticalSituations?: StatisticalSituationAnalysis[];
  interestingRemarks?: InterestingRemarkItem[];
}

export interface StrategicMemory {
  updatedAt: string;
  customObjectives: string[];
  experiments: StrategicExperiment[];
  completedQuizIds: string[];
  weeklyPlan: StrategicWeeklyPlanItem[];
}

// ==========================================
// NOUVEAU PARCOURS : MA VISION & COMPRENDRE INTERNET
// ==========================================

export interface VisionBubble {
  id: string;
  text: string;
  authorLabel?: string;
  alignment: 'left' | 'center' | 'right';
  size: 'small' | 'medium' | 'large';
  accentTheme?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';
  createdAt: string;
  order: number;
}

export interface InternetPrincipleCard {
  id: string;
  number: string; // '01', '02', ... '10'
  title: string;
  subtitle: string;
  shortExplanation: string;
  concreteExample: string;
  practicalImpact: string;
  deepDive: {
    documentedFacts: string[];
    practicalObservations: string[];
    strategicHypotheses: string[];
    creatorChecklist: string[];
  };
  category: 'Distribution' | 'Psychologie' | 'Stratégie' | 'Méthodologie';
}

// ==========================================
// CONSOLIDATION CENTRALE : PALIERS, NIVEAU SUPÉRIEUR, ABONNÉS, REPOST, MUSIQUE, CONFORMITÉ
// ==========================================

export interface FollowerHistoryEntry {
  id: string;
  accountId: string;
  recordedAt: string;
  followerCount: number;
  source: 'tiktok_api' | 'manual_input';
  deltaSincePrevious: number | null;
}

export interface PeriodPlateauStats {
  periodLabel: string;
  videoCount: number;
  meanViews: number;
  medianViews: number;
  iqrViews: number;
  madViews: number;
  outlierCount: number;
  outlierThreshold: number;
  medianWithoutOutliers: number;
}

export interface ViewPlateauAnalysis {
  sampleSize: number;
  hasSufficientData: boolean;
  overallMeanViews: number;
  overallMedianViews: number;
  overallIqrViews: number;
  overallMadViews: number;
  outlierThreshold: number;
  outlierVideos: Array<{ id: string; title: string; views: number; dateLabel: string }>;
  periods: PeriodPlateauStats[];
  trendStatus: 'progression_durable' | 'stagnation' | 'pic_isole' | 'baisse_recente' | 'donnees_insuffisantes';
  trendHeadline: string;
  trendExplanation: string;
  previousTypicalViews: number | null;
  currentTypicalViews: number | null;
  deltaPercentage: number | null;
}

export interface LevelUpFactorComparison {
  dimension: string;
  abovePlateauValue: string;
  baselineValue: string;
  sampleAboveCount: number;
  sampleBaselineCount: number;
  isManualDataNeeded: boolean;
  observation: string;
}

export interface LevelUpReport {
  hasSufficientData: boolean;
  baselineMedianViews: number;
  abovePlateauThreshold: number;
  abovePlateauVideos: Array<{
    id: string;
    title: string;
    views: number;
    likesRate: number;
    commentsRate: number;
    sharesRate: number;
    duration?: number;
    publishedAtLabel: string;
    hasEditorialMeta: boolean;
  }>;
  factorComparisons: LevelUpFactorComparison[];
  missingManualFieldsNotice: string;
  correlationWarning: string;
  proposedExperiments: Array<{
    title: string;
    variableChanged: string;
    hypothesis: string;
    targetMetric: string;
  }>;
}

export interface FollowerGrowthAnalysis {
  currentFollowers: MetricValue<number>;
  apiAttributionAvailable: boolean;
  apiAttributionNote: string;
  accountHistory: FollowerHistoryEntry[];
  netFollowerChangeObserved: number | null;
  manuallyAttributedVideos: Array<{
    videoId: string;
    title: string;
    views: number;
    attributedFollowers: number;
    conversionRatePct: number;
    source: 'tiktok_api' | 'manual_input';
  }>;
  topReachVsTopConversionComparison: string;
}

export interface EngagementDimensionStrategy {
  dimension: 'Portée' | 'Likes' | 'Commentaires' | 'Partages' | 'Favoris' | 'Abonnements attribués';
  availabilityStatus: MetricStatus;
  consolidatedRateLabel: string;
  perVideoMeanRateLabel: string | null;
  perVideoMedianRateLabel: string | null;
  accountMedianValue: number | null;
  interpretation: string;
  tacticalStrategies: string[];
  misconceptionWarning: string;
}

export interface EngagementStrategyReport {
  globalConsolidatedEngagementRate: number;
  perVideoMeanEngagementRate: number;
  perVideoMedianEngagementRate: number;
  favoritesIncludedNotice: string;
  dimensions: EngagementDimensionStrategy[];
}

export type ExperimentConclusionStatus =
  | 'Prometteur'
  | 'Défavorable'
  | 'Inconclusif'
  | 'Données insuffisantes';

export interface ExperimentLog {
  id: string;
  userId?: string;
  accountId?: string;
  title: string;
  hypothesis: string;
  modifiedCharacteristic: string;
  concernedVideoIds: string[];
  concernedVideoTitles: string[];
  objective: string;
  measuredResults: string;
  baselineComparison: string;
  conclusion: ExperimentConclusionStatus;
  status: 'planifiée' | 'en_cours' | 'cloturée';
  createdAt: string;
  updatedAt: string;
}

export interface CentralVideoRates {
  likeRate: number | null;
  commentRate: number | null;
  shareRate: number | null;
  favoriteRate: number | null;
  engagementRate: number | null;
  engagementWithFavoritesRate: number | null;
  followerConversionRate: number | null;
}

export interface EnrichedVideoMetric {
  video: TikTokOfficialVideo;
  rates: CentralVideoRates;
  contentNature: ContentNature;
  isViralOutlier: boolean;
  abovePlateauRatio: number | null;
}

export interface CentralAccountAnalytics {
  generatedAt: string;
  accountHandle: string;
  sampleSize: number;
  activeFilter: ContentMode | 'all';
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalFavorites: number | null;
  favoritesAvailableCount: number;
  meanViews: number;
  medianViews: number;
  iqrViews: number;
  // Distinction stricte taux global vs moyenne/médiane vidéo par vidéo
  globalLikesRate: number;
  globalCommentsRate: number;
  globalSharesRate: number;
  globalEngagementRate: number;
  perVideoMeanEngagementRate: number;
  perVideoMedianEngagementRate: number;
  perVideoMeanLikesRate: number;
  perVideoMedianLikesRate: number;
  perVideoMeanCommentsRate: number;
  perVideoMeanSharesRate: number;
  enrichedVideos: EnrichedVideoMetric[];
  plateauAnalysis: ViewPlateauAnalysis;
  levelUpReport: LevelUpReport;
  engagementReport: EngagementStrategyReport;
  creationCount: number;
  repostCount: number;
}

export type MusicAmbiance =
  | 'Épique'
  | 'Cinématographique'
  | 'Nostalgique'
  | 'Mélancolique'
  | 'Inspirante'
  | 'Énergique'
  | 'Apaisante'
  | 'Émotionnelle';

export interface MusicCatalogTrack {
  id: string;
  title: string;
  artist: string;
  ambiance: MusicAmbiance;
  secondaryAmbiances?: MusicAmbiance[];
  rhythm: 'lent' | 'modéré' | 'rapide';
  idealSequenceTypes: string[];
  recommendedCategories: string[];
  emotionalKeywords: string[];
  commercialMusicLibraryEligible: 'verified_cml' | 'personal_only_verify' | 'original_audio_verify';
  territoryNote: string;
  source: 'internal_catalog' | 'user_imported' | 'account_history';
  addedAt: string;
}

export interface MusicRecommendationRequest {
  subject: string;
  category: string;
  desiredEmotion: string;
  ambiance: MusicAmbiance;
  desiredRhythm: 'lent' | 'modéré' | 'rapide';
  sequenceType: string;
  accountType: 'personnel' | 'business';
  territory: string;
}

export interface MusicRecommendationResult {
  track: MusicCatalogTrack;
  matchScore: number;
  justification: string;
  historicalSoundStats?: {
    matchedVideoCount: number;
    medianViews: number;
    meanEngagementRate: number;
    sampleTitle: string;
  } | null;
  availabilityNotice: string;
}

export interface RepostRightsValidation {
  isReadyForPublication: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface CreationVsRepostComparison {
  creationCount: number;
  repostCount: number;
  creationMedianViews: number | null;
  repostMedianViews: number | null;
  creationGlobalEngagementRate: number | null;
  repostGlobalEngagementRate: number | null;
  creationTotalAttributedFollowers: number | null;
  repostTotalAttributedFollowers: number | null;
  neutralObservation: string;
}

export interface PrePublishChecklistItem {
  id: string;
  category: 'conformité' | 'droits_visuels' | 'droits_musique' | 'originalité' | 'véracité' | 'transparence';
  label: string;
  description: string;
  checked: boolean;
}

export type PedagogicalVideoCategory =
  | 'Émotion & Connexion'
  | 'Composition & Musique'
  | 'Attention & Rétention'
  | 'Audiences & Signaux'
  | 'Fondations Internet'
  | 'Droits & Éthique';

export interface PedagogicalVideoLesson {
  id: string;
  title: string;
  description: string;
  category: PedagogicalVideoCategory;
  order: number;
  videoUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PedagogicalUserProgress {
  userId: string;
  watchedLessonIds: string[];
  completedAtByLessonId: Record<string, string>;
  lastLessonId?: string;
  updatedAt: string;
}




