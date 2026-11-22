import { CentralAccountAnalytics, PrePublishChecklistItem } from '../types';

/**
 * Base documentaire officielle TikTok
 * Règle absolue : toutes les connaissances sur le fonctionnement de la plateforme
 * proviennent EXCLUSIVEMENT des ressources officielles publiées par TikTok,
 * et sont reliées dynamiquement aux observations réelles du compte connecté.
 */

export interface TikTokOfficialDocSource {
  id: string;
  category:
    | 'Distribution & Recommandation'
    | 'Création & Contenu'
    | 'Creator Search Insights & SEO'
    | 'Formats & Durées'
    | 'Communauté & Sécurité'
    | 'Outils Créateurs';
  title: string;
  sourceName:
    | 'TikTok Support'
    | 'TikTok Newsroom'
    | 'TikTok for Developers'
    | 'TikTok Creator Academy'
    | 'TikTok Creative Center'
    | 'TikTok Guidelines';
  officialUrl: string;
  lastUpdated: string;
  officialExcerpt: string;
  confirmedByTikTok: string[];
  observedByAccountData: string[];
  hypothesesToTest: string[];
  unknownOrUndocumented: string[];
  creatorImplication: string;
}

export const TIKTOK_OFFICIAL_DOCS: TikTokOfficialDocSource[] = [
  {
    id: 'doc-recommendation-system',
    category: 'Distribution & Recommandation',
    title: 'Fonctionnement du flux « Pour toi » (For You feed recommendation)',
    sourceName: 'TikTok Newsroom',
    officialUrl: 'https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you',
    lastUpdated: 'Vérifié 2026 — Documentation permanente TikTok Newsroom',
    officialExcerpt:
      'Le flux Pour toi reflète les préférences uniques de chaque utilisateur. Le système classe les vidéos en fonction des interactions utilisateur (vidéos aimées, partagées, comptes suivis, commentaires et surtout visionnage complet), des informations vidéo (légendes, sons, hashtags) et des paramètres d’appareil/langue.',
    confirmedByTikTok: [
      'Le visionnage complet d’une vidéo (taux de complétion) est explicitement cité comme un signal d’intérêt majeur.',
      'Ni le nombre d’abonnés d’un compte, ni les performances passées d’autres vidéos ne garantissent à eux seuls une distribution dans le flux Pour toi.',
      'Chaque publication est évaluée individuellement selon les réactions des spectateurs exposés.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Tester si une accroche visuelle ou textuelle plus nette dans les 2 premières secondes améliore le maintien et la portée.',
    ],
    unknownOrUndocumented: [
      'Les pondérations mathématiques exactes entre visionnage complet, partage, commentaire, favori et like ne sont jamais divulguées.',
      'La taille exacte des cohortes initiales d’exposition n’est pas chiffrée publiquement par TikTok.',
    ],
    creatorImplication:
      'Structurez vos vidéos autour de la clarté immédiate et du maintien de l’attention jusqu’à la résolution.',
  },
  {
    id: 'doc-creator-search-insights',
    category: 'Creator Search Insights & SEO',
    title: 'TikTok Creator Search Insights : Recherche et Découvrabilité',
    sourceName: 'TikTok Creator Academy',
    officialUrl: 'https://www.tiktok.com/creator-academy/en/creator-search-insights',
    lastUpdated: 'Vérifié 2026 — TikTok Creator Academy',
    officialExcerpt:
      'Creator Search Insights met en avant les sujets recherchés par la communauté et les lacunes de contenu (Content Gap), permettant aux vidéos pertinentes d’être retrouvées durablement via la barre de recherche.',
    confirmedByTikTok: [
      'Les vidéos répondant à une intention de recherche claire continuent de recevoir des vues après la fenêtre initiale du flux Pour toi.',
      'Les mots-clés présents dans la légende, les hashtags, le texte à l’écran et l’audio parlé participent à l’indexation.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Comparer la longévité à J+7 entre une vidéo intégrant un mot-clé précis en texte d’ouverture et une légende générique.',
    ],
    unknownOrUndocumented: [
      'Les volumes absolus de requêtes quotidiennes ne sont pas publiés (seuils relatifs uniquement).',
    ],
    creatorImplication:
      'Nommez clairement le sujet dans la légende et à l’écran sans bourrage artificiel de hashtags.',
  },
  {
    id: 'doc-video-duration-formats',
    category: 'Formats & Durées',
    title: 'Formats longs (> 60s) et adéquation durée / sujet',
    sourceName: 'TikTok Newsroom',
    officialUrl: 'https://newsroom.tiktok.com/en-us/supporting-creators-with-longer-videos',
    lastUpdated: 'Vérifié 2026 — TikTok Newsroom',
    officialExcerpt:
      'TikTok supporte des formats longs permettant narration approfondie, tutoriels et récits complets lorsque l’attention est maintenue.',
    confirmedByTikTok: [
      'Les vidéos de plus de 60 secondes sont activement distribuées si les spectateurs continuent de regarder.',
      'Aucune durée universelle unique n’est officiellement recommandée : la durée adaptée dépend du contenu.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Comparer les vidéos courtes vs longues au sein d’une même thématique sur votre propre compte.',
    ],
    unknownOrUndocumented: [
      'Les seuils de rétention exacts déclenchant l’élargissement algorithmique varient selon la durée et la cohorte.',
    ],
    creatorImplication:
      'Ajustez la durée à ce que le récit exige réellement, sans allonger artificiellement ni couper l’essentiel.',
  },
  {
    id: 'doc-creative-center-trends',
    category: 'Création & Contenu',
    title: 'TikTok Creative Center & Bibliothèque Musicale Commerciale (CML)',
    sourceName: 'TikTok Creative Center',
    officialUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/pc/en',
    lastUpdated: 'Vérifié 2026 — TikTok Creative Center',
    officialExcerpt:
      'Le Creative Center recense les tendances créatives et les sons sous licence commerciale disponibles selon les territoires et types de compte (Personnel vs Business).',
    confirmedByTikTok: [
      'Les comptes Business sont limités aux sons autorisés pour usage commercial (Commercial Music Library) afin d’éviter des restrictions de droits.',
      'La disponibilité d’une piste dépend du pays de diffusion et de la licence du titulaire de droits.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Vérifier sur vos futures publications si le choix d’une piste musicale cohérente avec l’émotion améliore la rétention mesurée.',
    ],
    unknownOrUndocumented: [
      'Utiliser un son tendance ne garantit jamais une portée minimum si le montage visuel ne retient pas les spectateurs.',
    ],
    creatorImplication:
      'Vérifiez toujours dans l’application que le son sélectionné est autorisé pour votre type de compte et votre pays.',
  },
  {
    id: 'doc-creator-rewards-quality',
    category: 'Création & Contenu',
    title: 'Originalité, authenticité et éligibilité au flux Pour toi',
    sourceName: 'TikTok Guidelines',
    officialUrl: 'https://www.tiktok.com/community-guidelines/en/integrity-authenticity/',
    lastUpdated: 'Vérifié 2026 — Règles communautaires TikTok',
    officialExcerpt:
      'Pour préserver la qualité de l’écosystème, les contenus non originaux republiés sans transformation significative, le spam ou le recyclage massif peuvent être rendus inéligibles à la recommandation dans le flux Pour toi.',
    confirmedByTikTok: [
      'Les republications identiques ou non transformées risquent l’inéligibilité au flux Pour toi (« Not eligible for the For You feed »).',
      'Les comptes peuvent contrôler l’éligibilité de chaque vidéo directement via « Paramètres et confidentialité » / « Contrôle de compte » (Account Check) et faire appel en cas d’erreur.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Contrôler l’écart de vues lorsque deux vidéos similaires sont publiées à intervalle rapproché vs espacées.',
    ],
    unknownOrUndocumented: [
      'Les seuils internes exacts des systèmes de détection de duplication et d’empreinte média ne sont pas publiés.',
    ],
    creatorImplication:
      'Apportez une vraie transformation éditoriale ou utilisez les outils natifs (Reposter, Duo, Collage) lorsque l’auteur l’autorise.',
  },
  {
    id: 'doc-engagement-community',
    category: 'Communauté & Sécurité',
    title: 'Interactions communautaires : commentaires, partages et favoris',
    sourceName: 'TikTok Support',
    officialUrl: 'https://support.tiktok.com/en/using-tiktok/messaging-and-notifications',
    lastUpdated: 'Vérifié 2026 — Centre d’aide officiel TikTok',
    officialExcerpt:
      'Les commentaires, partages et enregistrements en favoris reflètent diverses formes d’engagement actif au-delà du simple visionnage.',
    confirmedByTikTok: [
      'L’API Display v2 (video.list) fournit les vues, likes, commentaires et partages, mais ne transmet pas les spectateurs uniques ni l’attribution d’abonnés par vidéo.',
      'Le respect des règles de la communauté évite la limitation de visibilité ou la suppression de contenu.',
    ],
    observedByAccountData: [],
    hypothesesToTest: [
      'Saisir manuellement les favoris et nouveaux abonnés depuis TikTok Studio pour corréler rétention et conversion.',
    ],
    unknownOrUndocumented: [
      'Une baisse ponctuelle de vues ne prouve pas à elle seule l’existence d’une sanction ou d’un « shadowban ».',
    ],
    creatorImplication:
      'Consultez systématiquement TikTok Studio et la vérification de compte avant d’interpréter une baisse de vues comme une sanction.',
  },
];

/**
 * Relie dynamiquement la documentation officielle aux données réelles calculées par le Moteur Central (Couche 1).
 */
export function bindOfficialDocsWithAccountData(
  analytics?: CentralAccountAnalytics | null,
  docs: TikTokOfficialDocSource[] = TIKTOK_OFFICIAL_DOCS
): TikTokOfficialDocSource[] {
  return docs.map((doc) => {
    const observed: string[] = [];

    if (!analytics || analytics.sampleSize === 0) {
      observed.push('Aucune vidéo synchronisée pour relier cette règle officielle à vos statistiques.');
      return { ...doc, observedByAccountData: observed };
    }

    if (doc.id === 'doc-recommendation-system') {
      observed.push(
        `Sur vos ${analytics.sampleSize} vidéos mesurées, la médiane de vues est de ${analytics.medianViews.toLocaleString('fr-FR')} vues (dispersion IQR : ${analytics.iqrViews.toLocaleString('fr-FR')}).`
      );
      if (analytics.plateauAnalysis.outlierVideos.length > 0) {
        observed.push(
          `${analytics.plateauAnalysis.outlierVideos.length} publication(s) dépassent le seuil exceptionnel (${analytics.plateauAnalysis.outlierThreshold.toLocaleString('fr-FR')} vues) sans modifier automatiquement la médiane de base.`
        );
      }
    } else if (doc.id === 'doc-video-duration-formats') {
      const withDuration = analytics.enrichedVideos.filter(
        (ev) => typeof ev.video.duration === 'number' && ev.video.duration > 0
      );
      if (withDuration.length === 0) {
        observed.push('Aucune durée vidéo exploitable sur les vidéos filtrées.');
      } else {
        const shortV = withDuration.filter((ev) => (ev.video.duration || 0) < 30);
        const longV = withDuration.filter((ev) => (ev.video.duration || 0) > 60);
        observed.push(
          `Répartition observée : ${shortV.length} vidéo(s) < 30s et ${longV.length} vidéo(s) > 60s sur ${withDuration.length} vidéos avec durée connue.`
        );
      }
    } else if (doc.id === 'doc-engagement-community') {
      observed.push(
        `Engagement global consolidé : ${analytics.globalEngagementRate}% (moyenne par vidéo : ${analytics.perVideoMeanEngagementRate}%, médiane par vidéo : ${analytics.perVideoMedianEngagementRate}%).`
      );
      if (analytics.totalFavorites !== null) {
        observed.push(
          `Favoris saisis manuellement sur ${analytics.favoritesAvailableCount} vidéo(s) : ${analytics.totalFavorites.toLocaleString('fr-FR')} au total.`
        );
      } else {
        observed.push('Favoris non retournés par video.list et non encore saisis manuellement.');
      }
    } else if (doc.id === 'doc-creator-rewards-quality') {
      observed.push(
        `Répartition actuelle du compte : ${analytics.creationCount} création(s) identifiée(s) et ${analytics.repostCount} repost(s) identifié(s).`
      );
    } else if (doc.id === 'doc-creator-search-insights') {
      observed.push(
        `Analyse basée sur ${analytics.sampleSize} publications synchronisées (${analytics.totalViews.toLocaleString('fr-FR')} vues cumulées, distinctes des spectateurs uniques).`
      );
    } else {
      observed.push(
        `État du compte : ${analytics.sampleSize} publications analysées (taux de partage global : ${analytics.globalSharesRate}%).`
      );
    }

    return {
      ...doc,
      observedByAccountData: observed,
    };
  });
}

export function searchOfficialDocs(
  query: string,
  docs: TikTokOfficialDocSource[] = TIKTOK_OFFICIAL_DOCS
): TikTokOfficialDocSource[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return docs;

  return docs.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(cleanQuery) ||
      doc.officialExcerpt.toLowerCase().includes(cleanQuery) ||
      doc.category.toLowerCase().includes(cleanQuery) ||
      doc.confirmedByTikTok.some((c) => c.toLowerCase().includes(cleanQuery)) ||
      doc.creatorImplication.toLowerCase().includes(cleanQuery)
    );
  });
}

export function getDocsByCategory(
  category: string,
  docs: TikTokOfficialDocSource[] = TIKTOK_OFFICIAL_DOCS
): TikTokOfficialDocSource[] {
  if (category === 'Toutes') return docs;
  return docs.filter((d) => d.category === category);
}

// ============================================================================
// PARTIE 8 — « PUBLIER SANS RISQUER DE RESTRICTIONS ÉVITABLES » & SANCTIONS
// ============================================================================

export interface TikTokVisibilityStateDoc {
  id: string;
  label: string;
  severity: 'ok' | 'warning' | 'danger';
  meaning: string;
  recommendedAction: string;
}

export const TIKTOK_VISIBILITY_STATES: TikTokVisibilityStateDoc[] = [
  {
    id: 'vis_fyp_eligible',
    label: 'Éligible au flux Pour toi',
    severity: 'ok',
    meaning: 'La vidéo respecte les critères standards d’éligibilité et peut être recommandée aux non-abonnés.',
    recommendedAction: 'Aucune action corrective requise ; surveillez la rétention et les interactions.',
  },
  {
    id: 'vis_fyp_ineligible',
    label: 'Non éligible au flux Pour toi',
    severity: 'danger',
    meaning: 'La vidéo reste visible sur votre profil et via la recherche/abonnés, mais est exclue de la recommandation Pour toi (contenu non original, QR code promotionnel, qualité dégradée, sujet sensible).',
    recommendedAction: 'Vérifiez l’avis exact dans TikTok Studio / Analytics vidéo et soumettez un appel si la classification est erronée.',
  },
  {
    id: 'vis_review_limited',
    label: 'Diffusion limitée / En vérification',
    severity: 'warning',
    meaning: 'Une publication peut passer par un contrôle temporaire de sécurité ou de droits juste après l’envoi.',
    recommendedAction: 'Attendez l’issue de la vérification avant de supprimer ou republier le fichier.',
  },
  {
    id: 'vis_restricted',
    label: 'Restreint / Signalé',
    severity: 'danger',
    meaning: 'Restreint à certains publics (ex: restriction d’âge) ou coupé audio suite à une réclamation de droits musicaux.',
    recommendedAction: 'Consultez les notifications de sécurité du compte ; remplacez la piste sonore si la coupe provient d’une licence audio.',
  },
  {
    id: 'vis_removed',
    label: 'Supprimé pour violation des règles',
    severity: 'danger',
    meaning: 'Retrait par TikTok pour manquement aux Règles de la communauté ou aux droits d’auteur (avertissement possible sur le compte).',
    recommendedAction: 'Lisez l’article précis cité dans la notification et utilisez la procédure d’appel officielle dans les délais prévus si vous êtes en règle.',
  },
];

export interface TikTokRuleCategoryDoc {
  id: string;
  title: string;
  summary: string;
  safePractice: string;
}

export const TIKTOK_RULE_CATEGORIES: TikTokRuleCategoryDoc[] = [
  {
    id: 'rule_youth_safety',
    title: '1. Sécurité des mineurs',
    summary: 'Tolérance zéro sur toute mise en danger ou exploitation de mineurs.',
    safePractice: 'Vérifier qu’aucun mineur n’est exposé dans une situation à risque ou sans consentement parental approprié.',
  },
  {
    id: 'rule_self_harm',
    title: '2. Suicide, automutilation et troubles alimentaires',
    summary: 'Interdiction de montrer, encourager ou banaliser l’automutilation ou des pratiques dangereuses.',
    safePractice: 'Proscrire tout contenu glorifiant la souffrance physique extrême sans recul ou prévention.',
  },
  {
    id: 'rule_dangerous_acts',
    title: '3. Défis et activités dangereuses',
    summary: 'Les cascades ou défis mettant en péril l’intégrité physique sont limités ou retirés.',
    safePractice: 'Contextualiser les pratiques sportives encadrées et ne pas montrer de gestes imprudents reproductibles.',
  },
  {
    id: 'rule_hate_harassment',
    title: '4. Harcèlement, discours haineux et atteinte à la dignité',
    summary: 'Interdiction d’attaquer des personnes ou groupes protégés, même sous couvert d’humour.',
    safePractice: 'Critiquer des performances ou idées de manière respectueuse sans cibler l’intégrité d’autrui.',
  },
  {
    id: 'rule_adult_nudity',
    title: '5. Nudité, contenus sexuels et violence explicite',
    summary: 'Restrictions strictes sur les images choquantes, blessures explicites ou contenus suggestifs.',
    safePractice: 'Éviter les plans choc ou tenues incompatibles avec un public large dans le flux Pour toi.',
  },
  {
    id: 'rule_integrity_spam',
    title: '6. Intégrité, spam et engagement artificiel',
    summary: 'Achat de vues/abonnés, boucles trompeuses ou publications identiques répétées nuisent à l’éligibilité.',
    safePractice: 'Éviter les duplications brutes en série et toute incitation trompeuse à interagir.',
  },
  {
    id: 'rule_originality_ai',
    title: '7. Contenu non original, IA et désinformation',
    summary: 'Les contenus réalistes générés ou modifiés par IA doivent être étiquetés et les faits vérifiables respectés.',
    safePractice: 'Activer l’étiquette « Contenu généré par l’IA » lorsque applicable et apporter une valeur créative réelle.',
  },
  {
    id: 'rule_copyright',
    title: '8. Droits d’auteur (vidéo et musique)',
    summary: 'Ré-uploader sans licence des vidéos ou sons protégés expose au retrait et aux avertissements.',
    safePractice: 'Utiliser Repost/Duo/Collage natifs, archiver une autorisation écrite et vérifier les licences audio.',
  },
  {
    id: 'rule_commercial_disclosure',
    title: '9. Contenus commerciaux, partenariats et produits réglementés',
    summary: 'Obligation de déclarer les contenus sponsorisés et interdiction de promouvoir des produits prohibés.',
    safePractice: 'Activer l’interrupteur de divulgation commerciale en cas de partenariat ou d’affiliation.',
  },
  {
    id: 'rule_privacy',
    title: '10. Vie privée et données personnelles',
    summary: 'Interdiction de diffuser adresses, numéros, plaques ou visages sans base légale dans un cadre privé.',
    safePractice: 'Flouter toute donnée personnelle visible en arrière-plan avant publication.',
  },
];

export const DEFAULT_PRE_PUBLISH_CHECKLIST: PrePublishChecklistItem[] = [
  {
    id: 'chk_guidelines',
    category: 'conformité',
    label: 'Absence de contenu dangereux, choquant ou trompeur',
    description: 'Aucune scène à risque reproductible, harcèlement ou incitation artificielle à l’engagement.',
    checked: false,
  },
  {
    id: 'chk_visual_rights',
    category: 'droits_visuels',
    label: 'Droits visuels & autorisation vérifiés',
    description: 'Vidéo filmée par vous-même, outil natif TikTok, ou autorisation écrite archivée dans Mon Repost.',
    checked: false,
  },
  {
    id: 'chk_music_rights',
    category: 'droits_musique',
    label: 'Musique vérifiée selon type de compte et pays',
    description: 'Son vérifié dans la bibliothèque TikTok (ou Commercial Music Library si compte Business).',
    checked: false,
  },
  {
    id: 'chk_originality',
    category: 'originalité',
    label: 'Apport créatif réel (non-duplication brute)',
    description: 'Montage, commentaire, contexte écrit ou format original évitant la copie brute sans transformation.',
    checked: false,
  },
  {
    id: 'chk_privacy',
    category: 'véracité',
    label: 'Vie privée & absence de données personnelles exposées',
    description: 'Aucun numéro de téléphone, document privé, adresse ou personne filmée contre son gré.',
    checked: false,
  },
  {
    id: 'chk_disclosure',
    category: 'transparence',
    label: 'Transparence IA et partenariats commerciaux',
    description: 'Étiquette IA activée si médias synthétiques réalistes, et mention commerciale si sponsorisé.',
    checked: false,
  },
];

export interface SanctionAppealStep {
  stepNumber: number;
  title: string;
  description: string;
  officialUrl: string;
}

export const SANCTION_APPEAL_GUIDE = {
  lastVerified: '2026',
  shadowbanClarification:
    "Une baisse soudaine de vues ne signifie pas automatiquement qu'un compte est sanctionné (« shadowban »). Avant de conclure à une sanction, vérifiez objectivement : 1) le statut du compte (Account Check), 2) l'éligibilité Pour toi de la vidéo dans TikTok Studio, 3) le taux de décrochage aux 2 premières secondes, 4) les éventuelles coupures de droits musicaux.",
  officialLinks: [
    {
      label: 'Vérifier les Règles de la communauté',
      url: 'https://www.tiktok.com/community-guidelines/en/',
    },
    {
      label: 'Centre d’aide — Violations de compte et appels',
      url: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety',
    },
    {
      label: 'Politique de propriété intellectuelle / Droits d’auteur',
      url: 'https://www.tiktok.com/legal/page/global/copyright-policy/en',
    },
  ],
  steps: [
    {
      stepNumber: 1,
      title: 'Consulter « Contrôle de compte » (Account Check) et TikTok Studio',
      description:
        'Dans l’application TikTok (TikTok Studio / Paramètres et confidentialité > Assistance), vérifiez si le compte est « En règle » ou si une vidéo précise porte la mention « Non éligible au flux Pour toi ».',
      officialUrl: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety',
    },
    {
      stepNumber: 2,
      title: 'Identifier la nature exacte de l’avis (Règle communautaire vs Droit d’auteur)',
      description:
        'Un avis de droit d’auteur suit une procédure de réclamation distincte (DMCA / contre-notification) d’une erreur de modération communautaire.',
      officialUrl: 'https://www.tiktok.com/legal/page/global/copyright-policy/en',
    },
    {
      stepNumber: 3,
      title: 'Déposer un appel directement depuis la notification officielle',
      description:
        'Si vous disposez des droits ou estimez la décision infondée, soumettez un appel via le bouton dédié de la notification et joignez vos éléments factuels (autorisation écrite archivée, contexte éditorial).',
      officialUrl: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety',
    },
  ] as SanctionAppealStep[],
};
