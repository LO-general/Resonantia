import {
  PageOrientationReport,
  PageUniverseId,
  PageUniverseStats,
  TikTokOfficialVideo,
  UniverseBridgeIdea,
} from '../types';
import { computeMedian, safePercent } from './centralDataEngine';

export const STORAGE_CATEGORY_OVERRIDES_KEY = 'tiktok_category_overrides_v1';

export function getCategoryOverrides(): Record<string, PageUniverseId> {
  try {
    const raw = localStorage.getItem(STORAGE_CATEGORY_OVERRIDES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading category overrides:', err);
  }
  return {};
}

export function saveCategoryOverride(videoId: string, category: PageUniverseId): void {
  try {
    const overrides = getCategoryOverrides();
    overrides[videoId] = category;
    localStorage.setItem(STORAGE_CATEGORY_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.error('Error saving category override:', err);
  }
}

/**
 * Classe chaque vidéo dans un univers éditorial (par override manuel, fiche éditoriale ou mots-clés de légende).
 */
export function categorizeVideo(
  video: TikTokOfficialVideo,
  customOverrides?: Record<string, PageUniverseId>
): PageUniverseId {
  const overrides = customOverrides || getCategoryOverrides();
  if (overrides[video.id]) {
    return overrides[video.id];
  }

  const subjectHint = (video.editorialMeta?.subject || '').toLowerCase();
  const text = `${subjectHint} ${video.title || ''} ${video.videoDescription || ''}`.toLowerCase();

  if (
    text.includes('musique') ||
    text.includes('chant') ||
    text.includes('acoustique') ||
    text.includes('piano') ||
    text.includes('vocal') ||
    text.includes('gospel') ||
    text.includes('prestation') ||
    text.includes('concert') ||
    text.includes('starac') ||
    text.includes('staracademy') ||
    text.includes('chanson')
  ) {
    return 'musique_starac';
  }

  if (
    text.includes('cyclisme') ||
    text.includes('velo') ||
    text.includes('vélo') ||
    text.includes('gravel') ||
    text.includes('bicyclette')
  ) {
    return 'cyclisme_velo';
  }

  if (
    text.includes('trail') ||
    text.includes('running') ||
    text.includes('course') ||
    text.includes('endurance') ||
    text.includes('marathon') ||
    text.includes('ultra') ||
    text.includes('dénivelé') ||
    text.includes('sport')
  ) {
    return 'running_trail';
  }

  return 'general_mindset';
}

export function computePageOrientationAnalysis(
  videos: TikTokOfficialVideo[],
  customOverrides?: Record<string, PageUniverseId>
): PageOrientationReport {
  const overrides = customOverrides || getCategoryOverrides();

  const groups: Record<PageUniverseId, TikTokOfficialVideo[]> = {
    musique_starac: [],
    running_trail: [],
    cyclisme_velo: [],
    general_mindset: [],
  };

  videos.forEach((v) => {
    const cat = categorizeVideo(v, overrides);
    groups[cat].push(v);
  });

  const totalAccountViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0);

  const universeNames: Record<PageUniverseId, { name: string; badgeColor: string }> = {
    musique_starac: {
      name: 'Musique & Performances Vocales',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    },
    running_trail: {
      name: 'Sport, Trail & Endurance',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    cyclisme_velo: {
      name: 'Cyclisme & Sorties Vélo',
      badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    },
    general_mindset: {
      name: 'Mindset, Récits & Autres sujets',
      badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    },
  };

  const universeStats: PageUniverseStats[] = (Object.keys(groups) as PageUniverseId[]).map(
    (catId) => {
      const vids = groups[catId];
      const videoCount = vids.length;
      const totalViews = vids.reduce((a, b) => a + (b.viewCount || 0), 0);
      const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
      const medianViews = Math.round(computeMedian(vids.map((v) => v.viewCount || 0)));

      const totalLikes = vids.reduce((a, b) => a + (b.likeCount || 0), 0);
      const totalComments = vids.reduce((a, b) => a + (b.commentCount || 0), 0);
      const totalShares = vids.reduce((a, b) => a + (b.shareCount || 0), 0);

      const avgEngagementRate =
        safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

      const shareOfAccountViewsPct = safePercent(totalViews, totalAccountViews, 1) ?? 0;

      // Strictement zéro formule inventée (pas de 0.04 * likes) : somme uniquement des saisies réelles / API
      const attributedFollowerEntries = vids
        .map((v) => v.editorialMeta?.manualAttributedFollowers ?? v.attributedFollowers ?? null)
        .filter((x): x is number => typeof x === 'number' && x >= 0);
      const estimatedFollowersGained =
        attributedFollowerEntries.length > 0
          ? attributedFollowerEntries.reduce((a, b) => a + b, 0)
          : 0;

      const sortedByViews = [...vids].sort((a, b) => b.viewCount - a.viewCount);
      const topV = sortedByViews[0] || {
        id: '',
        title: 'Aucune publication',
        viewCount: 0,
        likeCount: 0,
      };

      const regularityDescription =
        videoCount === 0
          ? 'Aucune publication classée dans cet univers pour le moment.'
          : `${videoCount} vidéo(s) · Médiane réelle : ${medianViews.toLocaleString('fr-FR')} vues · Engagement global : ${avgEngagementRate}%${
              attributedFollowerEntries.length > 0
                ? ` · ${estimatedFollowersGained} abonné(s) saisi(s)`
                : ''
            }.`;

      return {
        id: catId,
        name: universeNames[catId].name,
        badgeColor: universeNames[catId].badgeColor,
        videoCount,
        totalViews,
        avgViews,
        medianViews,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate,
        estimatedFollowersGained,
        regularityDescription,
        shareOfAccountViewsPct,
        topVideo: {
          id: topV.id,
          title: topV.title || 'Vidéo',
          views: topV.viewCount || 0,
          likes: topV.likeCount || 0,
        },
        sampleVideos: sortedByViews.slice(0, 6).map((v) => ({
          id: v.id,
          title: v.title || 'Vidéo',
          views: v.viewCount,
          likes: v.likeCount,
          duration: v.duration || 0,
          createTime: v.createTime,
        })),
      };
    }
  );

  universeStats.sort((a, b) => b.totalViews - a.totalViews);
  const nonEmpty = universeStats.filter((u) => u.videoCount > 0);
  const topPerformerStat = nonEmpty[0] || universeStats[0];
  const secondStat =
    nonEmpty.slice().sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0] ||
    nonEmpty[1] ||
    topPerformerStat;

  const totalCount = videos.length;
  const activeCount = nonEmpty.length;

  const topRatio =
    totalCount > 0 ? Math.round((topPerformerStat.videoCount / totalCount) * 100) : 100;
  const secondaryRatio = Math.max(0, 100 - topRatio);

  const bridgeIdeas: UniverseBridgeIdea[] =
    activeCount >= 2
      ? [
          {
            title: `Passerelle entre « ${topPerformerStat.name} » et « ${secondStat.name} »`,
            hookConcept:
              '« Pourquoi la même discipline mentale s’applique ici et là… »',
            whyItWorks:
              'Relie vos univers autour d’une émotion ou valeur humaine commune sans dérouter les abonnés existants.',
            bridgeType: 'emotion_commune',
            concreteIdea:
              'Associer un extrait visuel de votre univers secondaire avec une bande-son ou narration issue de votre axe principal.',
            recommendedSound: 'À choisir dans le Conseiller Musical selon l’émotion visée',
          },
          {
            title: 'Coulisses et préparation personnelle (Format Fil Rouge)',
            hookConcept: '« Ce qui ne se voit pas avant de se lancer… »',
            whyItWorks:
              'Les abonnés s’attachent à la démarche du créateur autant qu’au sujet ponctuel.',
            bridgeType: 'histoire_humaine',
            concreteIdea:
              'Récit court face caméra expliquant le lien personnel entre vos différentes thématiques.',
            recommendedSound: 'Ambient discret ou son original',
          },
        ]
      : [
          {
            title: 'Tester une passerelle narrative si vous ouvrez un second axe',
            hookConcept: '« L’envers du décor derrière ce sujet… »',
            whyItWorks:
              'Permet d’élargir progressivement l’audience sans rupture brutale de tonalité.',
            bridgeType: 'histoire_humaine',
            concreteIdea:
              'Introduire le nouveau thème par un point commun émotionnel ou pratique avec votre base actuelle.',
            recommendedSound: 'À sélectionner selon l’ambiance souhaitée',
          },
        ];

  const answersToMandatoryQuestions = {
    q1_top_performer:
      totalCount === 0
        ? 'Aucune vidéo synchronisée pour identifier un univers leader.'
        : `Votre univers principal en volume brut est « ${topPerformerStat.name} » avec ${topPerformerStat.totalViews.toLocaleString('fr-FR')} vues (${topPerformerStat.shareOfAccountViewsPct}% des vues totales, médiane ${topPerformerStat.medianViews.toLocaleString('fr-FR')} vues).`,
    q2_growth_potential:
      totalCount === 0
        ? 'Synchronisez vos vidéos pour mesurer les taux d’engagement par univers.'
        : `Sur les univers actifs, « ${secondStat.name} » affiche ${secondStat.avgEngagementRate}% d’engagement global sur ${secondStat.videoCount} vidéo(s) (médiane ${secondStat.medianViews.toLocaleString('fr-FR')} vues).`,
    q3_can_cohabit:
      activeCount >= 2
        ? 'Oui : chaque vidéo est distribuée individuellement par intérêts dans le flux Pour toi, mais la cohérence éditoriale du profil aide les nouveaux visiteurs à comprendre pourquoi s’abonner.'
        : 'Vous publiez actuellement sur un axe principal unique. Vous pouvez introduire un second thème progressivement par passerelles.',
    q4_current_risks:
      topPerformerStat.shareOfAccountViewsPct >= 80 && totalCount >= 5
        ? `Forte concentration : ${topPerformerStat.shareOfAccountViewsPct}% des vues reposent sur un seul axe (« ${topPerformerStat.name} »). En cas de creux saisonnier de ce sujet, la portée peut baisser.`
        : 'Équilibre modéré : veillez à maintenir une promesse éditoriale claire sur votre biographie et à suivre la médiane par catégorie.',
    q5_develop_second_without_losing_first:
      'Maintenez un rythme lisible (ex: alternance régulière plutôt que de longues périodes mono-sujet), gardez une identité visuelle cohérente et utilisez la musique ou le storytelling comme fil conducteur.',
    q6_three_next_actions: [
      `1. Classer manuellement vos publications récentes dans « Détails » si certains thèmes sont encore regroupés dans « ${universeNames.general_mindset.name} ».`,
      `2. Comparer les médianes de « ${topPerformerStat.name} » et de vos autres univers après au moins 4 vidéos chacun.`,
      '3. Saisir les abonnés attribués depuis TikTok Studio pour vérifier quel univers convertit réellement le mieux.',
    ],
  };

  return {
    generatedAt: new Date().toISOString(),
    topPerformingUniverse: topPerformerStat.name,
    highestGrowthPotentialUniverse: secondStat.name,
    canCohabitVerdict:
      activeCount >= 2
        ? 'Cohabitation viable avec fil conducteur éditorial'
        : 'Compte actuellement centré sur un thème dominant',
    cohabitationFeasibility: activeCount >= 2 ? 'faisable' : 'attention_cadence',
    universes: universeStats,
    editorialStrategy: {
      recommendedSplitRatio:
        activeCount >= 2
          ? `Répartition observée actuelle : ${topRatio}% sur « ${topPerformerStat.name} » / ${secondaryRatio}% sur les autres univers.`
          : '100% concentré sur votre axe principal actuel.',
      alternationPattern:
        activeCount >= 2
          ? 'Alterner vos axes sans laisser un univers dominant disparaître plus de 2 semaines.'
          : 'Conserver une régularité mesurée et tester d’abord des formats variés dans votre axe principal.',
      transitionStrategy:
        'Relier vos thématiques par une posture personnelle constante (ton, cadrage, montage ou narration).',
      audiencePreservationTips: [
        'Rendre votre bio TikTok explicite sur les sujets traités par le compte.',
        'Éviter d’enchaîner deux publications rapprochées à moins de 3 heures d’intervalle.',
        'Suivre les performances par catégorie séparément pour ne pas confondre un pic isolé avec la règle générale.',
      ],
    },
    bridgeIdeas,
    publicationRoadmap: {
      weeklyScheduleSuggestion: [],
      progressiveTestProtocol:
        'Suivre vos médianes par univers sur les 10 prochaines publications plutôt que de juger sur une seule vidéo.',
    },
    audienceEvolutionAndRisks: {
      identifiedRisks: [
        answersToMandatoryQuestions.q4_current_risks,
        "Absence d'attribution native des abonnés par vidéo via l'API (nécessite une saisie depuis TikTok Studio).",
      ],
      safeguards: [
        'Comparer chaque vidéo uniquement à la médiane de son propre univers.',
        'Ne jamais tirer de conclusion définitive avec moins de 3 vidéos dans un univers.',
      ],
      subscriberRetentionAdvice:
        'La fidélisation dépend de la régularité et de la promesse claire du compte : expliquez en bio ce que les abonnés retrouveront chaque semaine.',
    },
    answersToMandatoryQuestions,
  };
}
