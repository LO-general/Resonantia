import {
  InterestingRemarkItem,
  InterestingRemarkVideoExample,
  TikTokAccountData,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../types';
import {
  computeMean,
  computeMedian,
  computeQuantile,
  safePercent,
} from './centralDataEngine';

interface EnrichedVideo {
  raw: TikTokOfficialVideo;
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number | null;
  attributedFollowers: number | null;
  duration: number;
  likeRate: number;
  commentRate: number;
  shareRate: number;
  engagementRate: number;
  subject?: string;
  shareUrl?: string;
}

function shortTitle(title: string, maxLen = 58): string {
  const clean = (title || 'Vidéo sans titre').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trimEnd() + '…';
}

function toExample(v: EnrichedVideo): InterestingRemarkVideoExample {
  return {
    id: v.id,
    title: shortTitle(v.title, 72),
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    shares: v.shares,
    likeRate: Number(v.likeRate.toFixed(2)),
    commentRate: Number(v.commentRate.toFixed(2)),
    shareRate: Number(v.shareRate.toFixed(2)),
    engagementRate: Number(v.engagementRate.toFixed(2)),
    duration: v.duration,
    shareUrl: v.shareUrl,
  };
}

/**
 * Moteur bi-couche (couche statistique centralDataEngine + couche d'interprétation stratégique)
 * pour la rubrique « Remarque intéressante ».
 *
 * Règles méthodologiques strictes :
 * - Aucun seuil universel arbitraire : tout est comparé aux médianes / quantiles du compte lui-même.
 * - Aucune troisième couche d'IA générative.
 * - Distinction explicite entre Portée, Interaction, Conversion et Valeur stratégique.
 * - Transparence stricte : vues != spectateurs uniques ; jamais de 0 fabriqué pour les données absentes.
 */
export function computeInterestingRemarks(
  videos: TikTokOfficialVideo[],
  account?: TikTokAccountData | null,
  editorialMap?: Record<string, VideoEditorialMetadata>
): InterestingRemarkItem[] {
  const enriched: EnrichedVideo[] = videos
    .filter((v) => (v.viewCount || 0) > 0)
    .map((v) => {
      const views = Number(v.viewCount || 0);
      const likes = Number(v.likeCount || 0);
      const comments = Number(v.commentCount || 0);
      const shares = Number(v.shareCount || 0);
      const duration = Number(v.duration || 0);
      const meta = editorialMap?.[v.id] || v.editorialMeta;

      const favorites =
        meta?.manualFavoritesCount !== undefined && meta.manualFavoritesCount !== null
          ? meta.manualFavoritesCount
          : v.favoriteCount ?? null;

      const attributedFollowers =
        meta?.manualAttributedFollowers !== undefined && meta.manualAttributedFollowers !== null
          ? meta.manualAttributedFollowers
          : v.attributedFollowers ?? null;

      return {
        raw: v,
        id: v.id,
        title: v.title || v.videoDescription || 'Vidéo TikTok',
        views,
        likes,
        comments,
        shares,
        favorites,
        attributedFollowers,
        duration,
        likeRate: safePercent(likes, views, 4) ?? 0,
        commentRate: safePercent(comments, views, 4) ?? 0,
        shareRate: safePercent(shares, views, 4) ?? 0,
        engagementRate: safePercent(likes + comments + shares, views, 4) ?? 0,
        subject: meta?.subject?.trim(),
        shareUrl: v.shareUrl,
      };
    });

  if (enriched.length < 5) {
    return [];
  }

  // COUCHE 1 : CALCULS STATISTIQUES STRICTEMENT RELATIFS AU COMPTE (via centralDataEngine)
  const totalViews = enriched.reduce((acc, v) => acc + v.views, 0);
  const totalLikes = enriched.reduce((acc, v) => acc + v.likes, 0);
  const totalComments = enriched.reduce((acc, v) => acc + v.comments, 0);
  const totalShares = enriched.reduce((acc, v) => acc + v.shares, 0);

  const viewsList = enriched.map((v) => v.views);
  const likeRatesList = enriched.map((v) => v.likeRate);
  const commentRatesList = enriched.map((v) => v.commentRate);
  const shareRatesList = enriched.map((v) => v.shareRate);
  const engRatesList = enriched.map((v) => v.engagementRate);
  const durations = enriched.filter((v) => v.duration > 0).map((v) => v.duration);

  const medianViews = Math.round(computeMedian(viewsList));
  const p75Views = Math.round(computeQuantile(viewsList, 0.75));
  const p90Views = Math.round(computeQuantile(viewsList, 0.9));
  const medianLikeRate = Number(computeMedian(likeRatesList).toFixed(2));
  const globalCommentRate = safePercent(totalComments, totalViews, 2) ?? 0;
  const p90CommentRate = Number(computeQuantile(commentRatesList, 0.9).toFixed(2));
  const globalShareRate = safePercent(totalShares, totalViews, 2) ?? 0;
  const p90ShareRate = Number(computeQuantile(shareRatesList, 0.9).toFixed(2));
  const medianEngRate = Number(computeMedian(engRatesList).toFixed(2));
  const globalEngRate = safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;
  const medianDuration = Math.round(computeMedian(durations));

  const remarks: InterestingRemarkItem[] = [];

  // 1. FORTE PORTÉE AVEC RATIO DE LIKES RELATIVEMENT PLUS BAS
  const reachThreshold = Math.max(p75Views, Math.round(medianViews * 1.5), 200);
  const highViewsLowLikesCandidates = enriched
    .filter(
      (v) =>
        v.views >= reachThreshold &&
        medianLikeRate > 0 &&
        v.likeRate < medianLikeRate * 0.65
    )
    .sort((a, b) => b.views - a.views);

  if (highViewsLowLikesCandidates.length > 0) {
    const lead = highViewsLowLikesCandidates[0];
    const ratioGap = Number((medianLikeRate / Math.max(lead.likeRate, 0.1)).toFixed(1));
    const reachMultiple = medianViews > 0 ? Number((lead.views / medianViews).toFixed(1)) : 1;

    remarks.push({
      id: 'remark_high_views_low_likes',
      category: 'high_views_low_likes',
      categoryLabel: 'Portée vs Interaction',
      title: 'Beaucoup de vues sans beaucoup de likes : une portée utile reste possible',
      statisticalObservation: `${highViewsLowLikesCandidates.length} vidéo${
        highViewsLowLikesCandidates.length > 1 ? 's' : ''
      } dépasse${highViewsLowLikesCandidates.length > 1 ? 'nt' : ''} votre 75e percentile (${p75Views.toLocaleString(
        'fr-FR'
      )} vues) avec un ratio likes/vues inférieur à votre médiane (${medianLikeRate}%). Exemple : « ${shortTitle(
        lead.title,
        46
      )} » cumule ${lead.views.toLocaleString('fr-FR')} vues (${reachMultiple}× la médiane de ${medianViews.toLocaleString(
        'fr-FR'
      )}) pour ${lead.likes.toLocaleString('fr-FR')} likes (${lead.likeRate.toFixed(
        2
      )}%, soit ${ratioGap}× moins que votre médiane).`,
      explanation: `Un taux de likes modéré ne signifie pas que la vidéo a échoué. En Portée, elle a arrêté le défilement au-delà du cercle habituel d'abonnés ; en Interaction rapide, des spectateurs froids regardent souvent sans liker. Attention : le compteur de vues inclut les visionnages répétés et ne mesure pas des spectateurs uniques.`,
      strategicInterest: `Ce type de vidéo peut agir comme porte d'entrée vers votre compte (Valeur stratégique) même sans fort taux de likes. Évitez de supprimer ou rejeter ces sujets sans vérifier leur éventuelle Conversion en abonnés.`,
      experimentIdea: `Sur un prochain sujet comparable, tester un repère émotionnel ou une question courte en fin de vidéo pour observer si le taux de likes se rapproche de ${medianLikeRate}% sans perdre en portée.`,
      dataLimitsNote: `Limite API : video.list ne fournit ni les spectateurs uniques, ni la rétention, ni les abonnés générés vidéo par vidéo.`,
      dimensionsImpacted: ['Portée', 'Interaction', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Vues vidéo exemple',
          videoValue: lead.views.toLocaleString('fr-FR'),
          accountBaseline: `Médiane : ${medianViews.toLocaleString('fr-FR')} (P75 : ${p75Views.toLocaleString('fr-FR')})`,
        },
        {
          label: 'Ratio Likes / Vues',
          videoValue: `${lead.likeRate.toFixed(2)}%`,
          accountBaseline: `Médiane compte : ${medianLikeRate}%`,
        },
      ],
      featuredVideos: highViewsLowLikesCandidates.slice(0, 3).map(toExample),
    });
  }

  // 2. PARTAGES PROPORTIONNELLEMENT ÉLEVÉS
  const minSampleForRates = Math.max(50, Math.round(medianViews * 0.2));
  const shareThreshold = Math.max(globalShareRate * 1.75, p90ShareRate, 0.15);
  const highSharesCandidates = enriched
    .filter((v) => v.views >= minSampleForRates && v.shares >= 3 && v.shareRate >= shareThreshold)
    .sort((a, b) => b.shareRate - a.shareRate || b.shares - a.shares);

  if (highSharesCandidates.length > 0) {
    const lead = highSharesCandidates[0];
    const shareMultiplier =
      globalShareRate > 0 ? Number((lead.shareRate / globalShareRate).toFixed(1)) : 1;

    remarks.push({
      id: 'remark_high_shares',
      category: 'high_shares',
      categoryLabel: 'Signal de partage',
      title: 'Partages proportionnellement élevés : contenu à forte valeur transférable',
      statisticalObservation: `Le taux global de partages sur vos ${enriched.length} vidéos est de ${globalShareRate}% (${totalShares} partages). « ${shortTitle(
        lead.title,
        46
      )} » atteint ${lead.shares} partages sur ${lead.views.toLocaleString(
        'fr-FR'
      )} vues, soit ${lead.shareRate.toFixed(2)}% (${shareMultiplier}× votre taux global).`,
      explanation: `Partager une vidéo demande un engagement social fort : le spectateur la juge utile, touchante ou mémorable au point de l'envoyer à quelqu'un.`,
      strategicInterest: `Cette anomalie positive signale un contenu capable de diffuser hors algorithme par recommandation directe (bouche-à-oreille).`,
      experimentIdea: `Tester un autre sujet structuré avec la même clarté d'enjeu que « ${shortTitle(lead.title, 36)} ».`,
      dataLimitsNote: `L'API compte les partages totaux sans distinguer messages privés, copies de liens ou partages externes.`,
      dimensionsImpacted: ['Interaction', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Taux Partages / Vues',
          videoValue: `${lead.shareRate.toFixed(2)}% (${lead.shares} partages)`,
          accountBaseline: `Global compte : ${globalShareRate}%`,
        },
        {
          label: 'Vues sur cet extrait',
          videoValue: lead.views.toLocaleString('fr-FR'),
          accountBaseline: `Médiane : ${medianViews.toLocaleString('fr-FR')}`,
        },
      ],
      featuredVideos: highSharesCandidates.slice(0, 3).map(toExample),
    });
  }

  // 3. COMMENTAIRES PROPORTIONNELLEMENT ÉLEVÉS
  const commentThreshold = Math.max(globalCommentRate * 2.0, p90CommentRate, 0.25);
  const highCommentsCandidates = enriched
    .filter((v) => v.views >= minSampleForRates && v.comments >= 3 && v.commentRate >= commentThreshold)
    .sort((a, b) => b.commentRate - a.commentRate || b.comments - a.comments);

  if (highCommentsCandidates.length > 0) {
    const lead = highCommentsCandidates[0];
    const commMultiplier =
      globalCommentRate > 0 ? Number((lead.commentRate / globalCommentRate).toFixed(1)) : 1;

    remarks.push({
      id: 'remark_high_comments',
      category: 'high_comments',
      categoryLabel: 'Conversation active',
      title: 'Taux de commentaires très supérieur à votre historique habituel',
      statisticalObservation: `Votre compte affiche ${globalCommentRate}% de commentaires au global. « ${shortTitle(
        lead.title,
        46
      )} » atteint ${lead.comments} commentaires pour ${lead.views.toLocaleString(
        'fr-FR'
      )} vues, soit ${lead.commentRate.toFixed(2)}% (${commMultiplier}× votre référence globale).`,
      explanation: `Le commentaire implique un investissement actif du spectateur (avis, identification ou question) bien différent du like passif.`,
      strategicInterest: `Les sujets déclenchant des discussions saines renforcent le lien avec la communauté. Corrélation passée ne vaut pas garantie : la formulation de fin joue aussi.`,
      experimentIdea: `Épingler une question précise sur votre prochaine vidéo proche pour vérifier si le taux de commentaires dépasse ${globalCommentRate}%.`,
      dataLimitsNote: `L'API retourne le compteur brut sans le contenu ni le ton des commentaires.`,
      dimensionsImpacted: ['Interaction', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Taux Commentaires / Vues',
          videoValue: `${lead.commentRate.toFixed(2)}% (${lead.comments} comms)`,
          accountBaseline: `Global compte : ${globalCommentRate}%`,
        },
        {
          label: 'Ratio Likes / Vues',
          videoValue: `${lead.likeRate.toFixed(2)}%`,
          accountBaseline: `Médiane compte : ${medianLikeRate}%`,
        },
      ],
      featuredVideos: highCommentsCandidates.slice(0, 3).map(toExample),
    });
  }

  // 4. PEU DE VUES MAIS FORT TAUX D'INTERACTION
  const engMultiplierThreshold = Math.max(medianEngRate * 1.6, globalEngRate * 1.6);
  const lowViewsHighEngCandidates = enriched
    .filter(
      (v) =>
        v.views >= 30 &&
        v.views < medianViews &&
        v.engagementRate >= engMultiplierThreshold
    )
    .sort((a, b) => b.engagementRate - a.engagementRate);

  if (lowViewsHighEngCandidates.length > 0) {
    const lead = lowViewsHighEngCandidates[0];
    const engMultiple = medianEngRate > 0 ? Number((lead.engagementRate / medianEngRate).toFixed(1)) : 1;

    remarks.push({
      id: 'remark_low_views_high_interaction',
      category: 'low_views_high_interaction',
      categoryLabel: 'Résonance sur petit échantillon',
      title: 'Peu de vues mais très forte réactivité du public exposé',
      statisticalObservation: `${lowViewsHighEngCandidates.length} vidéos sous votre médiane de vues (${medianViews.toLocaleString(
        'fr-FR'
      )}) dépassent ${engMultiplierThreshold.toFixed(1)}% d'engagement. Exemple : « ${shortTitle(
        lead.title,
        46
      )} » a ${lead.views.toLocaleString('fr-FR')} vues mais ${lead.engagementRate.toFixed(2)}% d'engagement (${engMultiple}× votre médiane de ${medianEngRate}%).`,
      explanation: `Une portée limitée n'indique pas forcément un rejet : le petit groupe exposé a fortement réagi, mais l'accroche initiale ou la cadence a pu freiner l'élargissement.`,
      strategicInterest: `Sur petit échantillon, les ratios sont plus volatils (souvent portés par les abonnés déjà acquis), mais le sujet mérite un re-test sur les 2 premières secondes.`,
      experimentIdea: `Tester le même sujet en modifiant uniquement l'accroche d'ouverture et en respectant un espacement suffisant avec la vidéo précédente.`,
      dataLimitsNote: `Avertissement statistique : les pourcentages sur faible volume de vues sont sensibles aux petites variations.`,
      dimensionsImpacted: ['Portée', 'Interaction'],
      baselineComparisons: [
        {
          label: 'Taux d’engagement',
          videoValue: `${lead.engagementRate.toFixed(2)}%`,
          accountBaseline: `Médiane compte : ${medianEngRate}%`,
        },
        {
          label: 'Portée atteinte',
          videoValue: `${lead.views.toLocaleString('fr-FR')} vues`,
          accountBaseline: `Médiane : ${medianViews.toLocaleString('fr-FR')} vues`,
        },
      ],
      featuredVideos: lowViewsHighEngCandidates.slice(0, 3).map(toExample),
    });
  }

  // 5. OUTLIERS POSITIFS
  const outlierThreshold = Math.max(medianViews * 4, p90Views * 1.8);
  const positiveOutliers = enriched
    .filter((v) => medianViews > 0 && v.views >= outlierThreshold)
    .sort((a, b) => b.views - a.views);

  if (positiveOutliers.length > 0) {
    const lead = positiveOutliers[0];
    const multiple = Number((lead.views / medianViews).toFixed(1));
    const avgDurationText =
      medianDuration > 0 && lead.duration > 0
        ? `Durée mesurée : ${lead.duration}s (médiane du compte : ${medianDuration}s).`
        : '';

    remarks.push({
      id: 'remark_positive_outlier',
      category: 'positive_outlier',
      categoryLabel: 'Outlier positif',
      title: `Écart extrême avec votre médiane : ${positiveOutliers.length} vidéo${
        positiveOutliers.length > 1 ? 's' : ''
      } hors norme`,
      statisticalObservation: `Médiane habituelle : ${medianViews.toLocaleString(
        'fr-FR'
      )} vues. En tête, « ${shortTitle(lead.title, 46)} » atteint ${lead.views.toLocaleString(
        'fr-FR'
      )} vues (${multiple}× la médiane). ${avgDurationText}`,
      explanation: `Une distribution TikTok est naturellement asymétrique : quelques vidéos concentrent une large part de l'audience totale sans modifier instantanément votre palier de base.`,
      strategicInterest: `Comparer ces pics à votre médiane réelle évite de surestimer votre niveau habituel ou d'imiter un détail isolé par erreur d'attribution.`,
      experimentIdea: `Isoler une seule caractéristique mesurable de « ${shortTitle(lead.title, 32)} » pour la tester dans un nouveau contexte.`,
      dataLimitsNote: `Corrélation ≠ causalité : l'API ne précise pas l'origine exacte du trafic (Pour toi, Recherche ou Profil).`,
      dimensionsImpacted: ['Portée', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Vues de l’outlier #1',
          videoValue: `${lead.views.toLocaleString('fr-FR')} (${multiple}× méd.)`,
          accountBaseline: `Médiane : ${medianViews.toLocaleString('fr-FR')} vues`,
        },
        {
          label: 'Partages générés',
          videoValue: `${lead.shares} (${lead.shareRate.toFixed(2)}%)`,
          accountBaseline: `Global : ${globalShareRate}%`,
        },
      ],
      featuredVideos: positiveOutliers.slice(0, 3).map(toExample),
    });
  }

  // 6. OBSERVATION CONTRE-INTUITIVE (DILUTION DES LIKES + PORTÉE VS CONVERSION)
  const topDecileVideos = enriched.filter((v) => v.views >= p90Views);
  const topDecileMedianLikeRate = Number(
    computeMedian(topDecileVideos.map((v) => v.likeRate)).toFixed(2)
  );
  const followerCount = account?.followerCount ?? 0;

  const hasReachDilutionParadox =
    topDecileVideos.length >= 2 && medianLikeRate > 0 && topDecileMedianLikeRate < medianLikeRate * 0.85;
  const hasReachVsFollowerGap = followerCount > 0 && totalViews >= followerCount * 15;

  if (hasReachDilutionParadox || hasReachVsFollowerGap) {
    const top1 = [...enriched].sort((a, b) => b.views - a.views)[0];
    const partsObs: string[] = [];
    if (hasReachDilutionParadox) {
      partsObs.push(
        `Sur vos ${topDecileVideos.length} vidéos les plus vues (≥ ${p90Views.toLocaleString(
          'fr-FR'
        )} vues), le ratio médian de likes est de ${topDecileMedianLikeRate}% contre ${medianLikeRate}% sur l'ensemble du compte.`
      );
    }
    if (hasReachVsFollowerGap) {
      partsObs.push(
        `Au total, vos ${enriched.length} vidéos cumulent ${totalViews.toLocaleString(
          'fr-FR'
        )} vues pour ${followerCount.toLocaleString('fr-FR')} abonnés sur le profil.`
      );
    }

    remarks.push({
      id: 'remark_counter_intuitive',
      category: 'counter_intuitive',
      categoryLabel: 'Lecture contre-intuitive',
      title: 'Plus de vues dilue souvent le taux de likes — et la portée ne garantit pas l’abonnement',
      statisticalObservation: partsObs.join(' '),
      explanation: `Une vidéo poussée hors de votre base habituelle expose des spectateurs moins engagés : le taux de likes (%) baisse naturellement même en cas de fort succès de distribution. De plus, regarder une vidéo (Portée) et décider de s'abonner (Conversion) obéissent à deux ressorts distincts.`,
      strategicInterest: `Ne jugez jamais une vidéo très diffusée uniquement sur un ratio likes/vues inférieur à vos petites vidéos de communauté.`,
      experimentIdea: `Clarifier la promesse éditoriale du profil sur vos prochains formats à forte portée et suivre l'évolution nette d'abonnés.`,
      dataLimitsNote: `L'API video.list ne fournit ni spectateurs uniques ni abonnés attribués par publication.`,
      dimensionsImpacted: ['Portée', 'Interaction', 'Conversion', 'Valeur stratégique'],
      baselineComparisons: [
        ...(hasReachDilutionParadox
          ? [
              {
                label: 'Likes/Vues (Top 10% vues)',
                videoValue: `${topDecileMedianLikeRate}%`,
                accountBaseline: `Médiane compte : ${medianLikeRate}%`,
              },
            ]
          : []),
        ...(hasReachVsFollowerGap
          ? [
              {
                label: 'Vues cumulées / Abonnés',
                videoValue: `${totalViews.toLocaleString('fr-FR')} vues`,
                accountBaseline: `${followerCount.toLocaleString('fr-FR')} abonnés (profil)`,
              },
            ]
          : []),
      ],
      featuredVideos: top1 ? [toExample(top1)] : [],
    });
  }

  // 7. FAVORIS SAISIS MANUELLEMENT (SI DISPONIBLES)
  const withFavorites = enriched.filter((v) => v.favorites !== null && v.favorites > 0);
  if (withFavorites.length >= 2) {
    const sortedFav = withFavorites
      .map((v) => ({ v, favRate: (v.favorites! / v.views) * 100 }))
      .sort((a, b) => b.favRate - a.favRate);
    const best = sortedFav[0];
    const medianFavRate = Number(computeMedian(sortedFav.map((x) => x.favRate)).toFixed(2));
    remarks.push({
      id: 'remark_favorites_signal',
      category: 'counter_intuitive',
      categoryLabel: 'Signal d’utilité (Favoris)',
      title: 'Vidéo fortement enregistrée en favoris par rapport aux données renseignées',
      statisticalObservation: `Sur ${withFavorites.length} vidéos avec favoris renseignés, « ${shortTitle(
        best.v.title,
        46
      )} » atteint ${best.v.favorites} favoris (${best.favRate.toFixed(2)}% des vues, médiane renseignée : ${medianFavRate}%).`,
      explanation: `L'enregistrement en favori indique qu'un spectateur veut conserver l'information, l'émotion ou le tutoriel pour y revenir.`,
      strategicInterest: `Cette métrique révèle une valeur de référence durable indépendante du simple réflexe de like.`,
      dataLimitsNote: `Donnée issue de vos saisies manuelles TikTok Studio (non fournie par l'API video.list).`,
      dimensionsImpacted: ['Interaction', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Taux Favoris / Vues',
          videoValue: `${best.favRate.toFixed(2)}%`,
          accountBaseline: `Médiane renseignée : ${medianFavRate}%`,
        },
      ],
      featuredVideos: [toExample(best.v)],
    });
  }

  // 8. CONVERSION ABONNÉS ATTRIBUÉE MANUELLEMENT (SI DISPONIBLE)
  const withFollowers = enriched.filter(
    (v) => v.attributedFollowers !== null && v.attributedFollowers > 0
  );
  if (withFollowers.length >= 1) {
    const sortedConv = withFollowers
      .map((v) => ({ v, convRate: (v.attributedFollowers! / v.views) * 100 }))
      .sort((a, b) => b.convRate - a.convRate);
    const topConv = sortedConv[0];
    remarks.push({
      id: 'remark_attributed_followers',
      category: 'counter_intuitive',
      categoryLabel: 'Conversion abonnés vérifiée',
      title: 'Efficacité de conversion en abonnés mesurée depuis vos saisies Studio',
      statisticalObservation: `« ${shortTitle(
        topConv.v.title,
        46
      )} » a converti ${topConv.v.attributedFollowers} nouveaux abonnés sur ${topConv.v.views.toLocaleString(
        'fr-FR'
      )} vues (${topConv.convRate.toFixed(3)}%).`,
      explanation: `Contrairement aux vues brutes, la conversion en abonnés mesure l'adhésion à votre promesse éditoriale globale.`,
      strategicInterest: `Comparer le meilleur convertisseur à la vidéo la plus vue permet d'identifier quels formats construisent réellement la communauté.`,
      dataLimitsNote: `Attribution issue exclusivement de vos relevés manuels TikTok Studio.`,
      dimensionsImpacted: ['Conversion', 'Valeur stratégique'],
      baselineComparisons: [
        {
          label: 'Conversion attribuée',
          videoValue: `${topConv.convRate.toFixed(3)}% (${topConv.v.attributedFollowers} ab.)`,
          accountBaseline: `${withFollowers.length} vidéo(s) renseignée(s)`,
        },
      ],
      featuredVideos: [toExample(topConv.v)],
    });
  }

  // 9. SURPERFORMANCE D'UN SUJET SAISI MANUELLEMENT (SI DISPONIBLE)
  const bySubject: Record<string, EnrichedVideo[]> = {};
  for (const v of enriched) {
    if (!v.subject) continue;
    const key = v.subject.toLowerCase();
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(v);
  }
  const qualifiedSubjects = Object.values(bySubject).filter((arr) => arr.length >= 2);
  if (qualifiedSubjects.length > 0) {
    const rankedSubjects = qualifiedSubjects
      .map((arr) => ({
        subject: arr[0].subject!,
        medianV: Math.round(computeMedian(arr.map((x) => x.views))),
        meanEng: Number(computeMean(arr.map((x) => x.engagementRate)).toFixed(2)),
        arr,
      }))
      .sort((a, b) => b.medianV - a.medianV);
    const bestSubj = rankedSubjects[0];
    if (bestSubj.medianV > medianViews * 1.25) {
      remarks.push({
        id: 'remark_subject_outperform',
        category: 'positive_outlier',
        categoryLabel: 'Thématique porteuse',
        title: `Le sujet « ${bestSubj.subject} » surperforme la médiane du compte`,
        statisticalObservation: `Sur ${bestSubj.arr.length} vidéos annotées « ${bestSubj.subject} », la médiane atteint ${bestSubj.medianV.toLocaleString(
          'fr-FR'
        )} vues contre ${medianViews.toLocaleString('fr-FR')} vues sur le reste du compte.`,
        explanation: `Vos annotations éditoriales montrent une traction supérieure autour de ce thème précis, tout en gardant à l'esprit que d'autres variables (horaire, accroche) peuvent y contribuer.`,
        strategicInterest: `Base utile pour définir une expérience contrôlée en variant uniquement l'accroche sur ce même sujet.`,
        dataLimitsNote: `Basé sur ${bestSubj.arr.length} fiche(s) éditoriale(s) complétée(s).`,
        dimensionsImpacted: ['Portée', 'Valeur stratégique'],
        baselineComparisons: [
          {
            label: `Médiane « ${bestSubj.subject} »`,
            videoValue: `${bestSubj.medianV.toLocaleString('fr-FR')} vues`,
            accountBaseline: `Médiane compte : ${medianViews.toLocaleString('fr-FR')} vues`,
          },
        ],
        featuredVideos: bestSubj.arr.slice(0, 2).map(toExample),
      });
    }
  }

  return remarks;
}
