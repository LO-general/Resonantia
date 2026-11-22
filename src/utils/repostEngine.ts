import {
  ContentNature,
  CreationVsRepostComparison,
  RepostItem,
  RepostRightsValidation,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../types';
import {
  computeMedian,
  inferVideoContentNature,
  safePercent,
} from './centralDataEngine';

/**
 * Validates whether a RepostItem satisfies mandatory licensing & authorization
 * requirements before publication or marking as validated.
 */
export function validateRepostRights(item: Partial<RepostItem>): RepostRightsValidation {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  const status = item.authorizationStatus || 'en_attente';
  const mode = item.repostMode || 'authorized_reupload';

  if (mode === 'native_repost' || mode === 'duet' || mode === 'stitch') {
    if (!item.tiktokUrl || !item.tiktokUrl.trim()) {
      blockingReasons.push('Le lien source TikTok d’origine est requis pour utiliser Repost, Duo ou Collage natif.');
    }
    if (item.musicRightsVerified === false) {
      warnings.push('Vérifiez que la piste musicale incorporée reste autorisée sur votre type de compte et territoire.');
    }
    return {
      isReadyForPublication: blockingReasons.length === 0,
      blockingReasons,
      warnings,
    };
  }

  // Re-upload or external source requires explicit verifiable authorization unless public domain
  if (status === 'en_attente') {
    blockingReasons.push(
      'Autorisation en attente : un ré-upload ne peut pas être validé sans accord explicite du titulaire des droits.'
    );
  } else if (status === 'refusee') {
    blockingReasons.push(
      'Autorisation refusée par le créateur ou ayant droit : publication bloquée pour éviter toute atteinte au droit d’auteur.'
    );
  } else if (status === 'obtenue') {
    if (!item.authorizationDate || !item.authorizationDate.trim()) {
      blockingReasons.push("La date d'obtention de l'autorisation doit être renseignée.");
    }
    if (!item.usageTerms || item.usageTerms.trim().length < 5) {
      blockingReasons.push("Les conditions d'utilisation accordées (crédit, durée, modifications, périmètre) doivent être précisées.");
    }
    if (!item.authorizationProof || item.authorizationProof.trim().length < 5) {
      blockingReasons.push("Une référence de preuve écrite (email, DM archivé, contrat ou licence) est obligatoire.");
    }
  } else if (status === 'non_requise_domaine_public') {
    if (!item.authorizationProof || item.authorizationProof.trim().length < 5) {
      blockingReasons.push(
        "Précisez la référence exacte de la licence libre (ex: CC BY 4.0) ou du statut de domaine public vérifié."
      );
    }
  }

  if (!item.creatorHandle || !item.creatorHandle.trim()) {
    blockingReasons.push("L'identifiant ou le nom du créateur source doit être renseigné.");
  }

  if (!item.tiktokUrl || !item.tiktokUrl.trim()) {
    blockingReasons.push('Le lien source exact vers l’œuvre originale doit être conservé.');
  }

  if (!item.musicRightsVerified) {
    warnings.push(
      'Droits musicaux non vérifiés : si la vidéo comporte une bande-son protégée, sa diffusion peut être coupée ou restreinte même avec accord sur les images.'
    );
  }

  if (item.modificationAllowed === false) {
    warnings.push(
      "Le titulaire n'autorise aucune modification : ne recadrez ni ne remixez la séquence au-delà des termes accordés."
    );
  }

  if (item.commercialUseAllowed === false) {
    warnings.push(
      "Usage commercial exclu par l'accord : ne pas associer ce contenu à une promotion produit, affiliation ou compte Business commercial."
    );
  }

  return {
    isReadyForPublication: blockingReasons.length === 0,
    blockingReasons,
    warnings,
  };
}

export interface RepostPracticeSection {
  id: string;
  title: string;
  badge: string;
  summary: string;
  points: string[];
  mythsToReject: string[];
}

export const REPOST_BEST_PRACTICES: RepostPracticeSection[] = [
  {
    id: 'native_tools',
    title: 'Privilégier les outils natifs TikTok (Repost, Duo, Collage)',
    badge: 'Recommandé en priorité',
    summary:
      'Les fonctions natives attribuent automatiquement le créateur original, conservent le lien vers sa publication et évitent le ré-upload sans licence.',
    points: [
      'Bouton Reposter (Repost natif) : recommande la vidéo sur votre profil et auprès de votre audience sans dupliquer le fichier.',
      'Duo (Duet) et Collage (Stitch) : permettent une réaction, un commentaire ou un apport éditorial légitime lorsque le créateur a activé ces options.',
    ],
    mythsToReject: [
      '« Mentionner @pseudo en légende suffit pour republier » : FAUX. Créditer ne remplace jamais une autorisation légale de ré-upload.',
      '« Modifier légèrement la vitesse ou recadrer donne le droit de republier » : FAUX sur le plan juridique comme sur les règles de propriété intellectuelle.',
    ],
  },
  {
    id: 'written_auth',
    title: 'Obtenir et archiver une autorisation écrite explicite avant tout ré-upload',
    badge: 'Protection juridique',
    summary:
      'Avant de téléverser une vidéo ou un extrait créé par un tiers, obtenez un accord explicite précisant l’usage permis.',
    points: [
      'Demander l’accord écrit (message privé archivé, e-mail, contrat de licence) précisant : plateformes visées, durée, modification autorisée ou non, usage commercial ou non.',
      'Conserver la preuve horodatée et la référence de licence dans votre fiche « Mon Repost » en cas de contestation ou de vérification.',
      'Respecter l’absence d’atteinte à l’honneur, aux données personnelles ou à la vie privée des personnes filmées.',
    ],
    mythsToReject: [
      '« Si la vidéo est publique sur internet ou sans filigrane, elle est libre de droits » : FAUX.',
      '« Sans usage commercial, tout ré-upload est automatique légal » : FAUX. L’exception de courte citation ou parodie obéit à des conditions strictes selon le droit applicable.',
    ],
  },
  {
    id: 'music_rights',
    title: 'Vérifier séparément les droits de la musique incorporée',
    badge: 'Règle musique distincte',
    summary:
      'L’autorisation du vidéaste ne couvre presque jamais les droits phonographiques et éditoriaux d’une musique commerciale incluse dans la bande-son.',
    points: [
      'Avant publication, vérifiez si la piste sonore est disponible dans la bibliothèque audio TikTok autorisée pour votre type de compte (Personnel vs Business).',
      'Pour un compte Business / commercial, utilisez exclusivement la Commercial Music Library (CML) ou une piste originale dont vous détenez 100% des droits.',
    ],
    mythsToReject: [
      '« L’auteur de la vidéo m’a donné son accord donc la musique passe automatiquement » : FAUX. TikTok coupe le son ou bloque les vidéos en cas d’infraction musicale.',
    ],
  },
];

/**
 * Neutral comparative performance analysis between Creation vs Repost videos.
 * Explicitly avoids claiming one mode is inherently superior; measures observed account stats.
 */
export function compareCreationVsRepost(
  videos: TikTokOfficialVideo[],
  editorialMap?: Record<string, VideoEditorialMetadata>
): CreationVsRepostComparison {
  const creationVideos: TikTokOfficialVideo[] = [];
  const repostVideos: TikTokOfficialVideo[] = [];

  for (const v of videos) {
    const nature: ContentNature = inferVideoContentNature(v, editorialMap);
    if (nature === 'repost') repostVideos.push(v);
    else creationVideos.push(v);
  }

  const creationMedianViews =
    creationVideos.length > 0
      ? Math.round(computeMedian(creationVideos.map((v) => v.viewCount)))
      : null;
  const repostMedianViews =
    repostVideos.length > 0
      ? Math.round(computeMedian(repostVideos.map((v) => v.viewCount)))
      : null;

  const calcGlobalEng = (arr: TikTokOfficialVideo[]) => {
    const views = arr.reduce((s, v) => s + v.viewCount, 0);
    const inter = arr.reduce((s, v) => s + v.likeCount + v.commentCount + v.shareCount, 0);
    return safePercent(inter, views, 2);
  };

  const sumAttributedFollowers = (arr: TikTokOfficialVideo[]) => {
    const vals = arr
      .map((v) => {
        const m = editorialMap?.[v.id]?.manualAttributedFollowers;
        return m !== undefined && m !== null ? m : v.attributedFollowers ?? null;
      })
      .filter((x): x is number => typeof x === 'number');
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
  };

  const creationGlobalEngagementRate = calcGlobalEng(creationVideos);
  const repostGlobalEngagementRate = calcGlobalEng(repostVideos);
  const creationTotalAttributedFollowers = sumAttributedFollowers(creationVideos);
  const repostTotalAttributedFollowers = sumAttributedFollowers(repostVideos);

  let neutralObservation = '';
  if (creationVideos.length === 0 && repostVideos.length === 0) {
    neutralObservation = 'Aucune vidéo synchronisée pour comparer Création et Repost.';
  } else if (creationVideos.length === 0 || repostVideos.length === 0) {
    neutralObservation = `Actuellement, toutes vos vidéos classées appartiennent à la catégorie « ${
      creationVideos.length > 0 ? 'Création originale' : 'Repost'
    } ». Classez vos publications dans « Détails » si vous exploitez les deux formats.`;
  } else {
    neutralObservation = `Observation neutre sur ce compte : Création (${creationVideos.length} vidéo(s), médiane ${creationMedianViews?.toLocaleString('fr-FR')} vues, engagement global ${creationGlobalEngagementRate ?? 0}%) vs Repost (${repostVideos.length} vidéo(s), médiane ${repostMedianViews?.toLocaleString('fr-FR')} vues, engagement global ${repostGlobalEngagementRate ?? 0}%). Note : TikTok exige de la valeur ajoutée sur les republications pour rester éligible à la recommandation Pour Toi.`;
  }

  return {
    creationCount: creationVideos.length,
    repostCount: repostVideos.length,
    creationMedianViews,
    repostMedianViews,
    creationGlobalEngagementRate,
    repostGlobalEngagementRate,
    creationTotalAttributedFollowers,
    repostTotalAttributedFollowers,
    neutralObservation,
  };
}
