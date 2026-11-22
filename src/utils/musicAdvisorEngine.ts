import {
  MusicAmbiance,
  MusicCatalogTrack,
  MusicRecommendationRequest,
  MusicRecommendationResult,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../types';
import { computeMean, computeMedian } from './centralDataEngine';

export const MUSIC_AMBIANCES: MusicAmbiance[] = [
  'Épique',
  'Cinématographique',
  'Nostalgique',
  'Mélancolique',
  'Inspirante',
  'Énergique',
  'Apaisante',
  'Émotionnelle',
];

/**
 * Starter internal catalog of editorial audio profiles & widely available moods.
 * Availability in TikTok Commercial Music Library (CML) vs Personal Sounds MUST be checked
 * in-app per account type and territory; never guarantee reach.
 */
export const DEFAULT_INTERNAL_CATALOG: MusicCatalogTrack[] = [
  {
    id: 'cat_cinematic_piano_strings',
    title: 'Piano & Cordes Cinématiques (Instrumentale Progressive)',
    artist: 'Catalogue Libre / Commercial Music Library (CML)',
    ambiance: 'Cinématographique',
    secondaryAmbiances: ['Émotionnelle', 'Inspirante'],
    rhythm: 'lent',
    idealSequenceTypes: ['Récit voix off', 'Transition sommet / paysage', 'Hommage ou moment marquant'],
    recommendedCategories: ['Musique', 'Sport & Endurance', 'Récit personnel', 'Cinéma'],
    emotionalKeywords: ['frisson', 'larmes', 'émotion', 'souvenir', 'grandeur', 'horizon'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Rechercher sous le filtre « Commercial Sounds / Cinématique » dans TikTok.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_epic_build_trail',
    title: 'Percussions & Synthé Épique (Montée en Puissance)',
    artist: 'Catalogue Commercial Music Library (CML)',
    ambiance: 'Épique',
    secondaryAmbiances: ['Énergique', 'Inspirante'],
    rhythm: 'rapide',
    idealSequenceTypes: ['Effort sportif', 'Défi chronométré', 'Montage dynamique (cuts 1-2s)'],
    recommendedCategories: ['Sport & Trail', 'Cyclisme', 'Défis', 'Motivation'],
    emotionalKeywords: ['dépassement', 'effort', 'victoire', 'combat', 'courage', 'sprint', 'ultra'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Adapté aux comptes Personnels et Business sous réserve d’activation territoriale CML.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_nostalgic_acoustic_guitar',
    title: 'Guitare Acoustique Intimiste (Arpège Doux)',
    artist: 'Catalogue Commercial Music Library (CML)',
    ambiance: 'Nostalgique',
    secondaryAmbiances: ['Mélancolique', 'Apaisante'],
    rhythm: 'lent',
    idealSequenceTypes: ['Introspection face caméra', 'Souvenir / archive', 'Vlog matinal'],
    recommendedCategories: ['Lifestyle', 'Storytelling', 'Musique', 'Souvenirs'],
    emotionalKeywords: ['nostalgie', 'passé', 'calme', 'matin', 'enfance', 'authenticité'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Privilégier un volume musical à 10-15% si voix parlée par-dessus.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_melancholic_solo_piano',
    title: 'Piano Solo Minimaliste (Note Suspendue)',
    artist: 'Catalogue Libre / Bibliothèque Créateur',
    ambiance: 'Mélancolique',
    secondaryAmbiances: ['Émotionnelle', 'Nostalgique'],
    rhythm: 'lent',
    idealSequenceTypes: ['Confession', 'Échec / apprentissage', 'Séquence silencieuse avec texte'],
    recommendedCategories: ['Mindset', 'Témoignage', 'Musique', 'Réflexion'],
    emotionalKeywords: ['doute', 'solitude', 'abandon', 'vérité', 'sensible', 'tristesse'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Vérifier la disponibilité exacte du titre choisi dans votre pays avant export.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_inspirational_ambient_rise',
    title: 'Ambient Lumineux & Voix Aériennes (Crescendo)',
    artist: 'Catalogue Commercial Music Library (CML)',
    ambiance: 'Inspirante',
    secondaryAmbiances: ['Cinématographique', 'Apaisante'],
    rhythm: 'modéré',
    idealSequenceTypes: ['Bilan de progression', 'Avant / Après', 'Message motivant'],
    recommendedCategories: ['Sport', 'Entrepreneuriat', 'Développement personnel', 'Voyage'],
    emotionalKeywords: ['espoir', 'réussite', 'objectif', 'progression', 'demain', 'clarté'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Compatible comptes Business dans la majorité des zones UE/FR.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_energetic_electro_beat',
    title: 'Rythme Électro Percussif (128 BPM Sans Paroles)',
    artist: 'Catalogue Commercial Music Library (CML)',
    ambiance: 'Énergique',
    secondaryAmbiances: ['Épique'],
    rhythm: 'rapide',
    idealSequenceTypes: ['Tutoriel rapide', 'Récapitulatif visuel', 'Cuts synchronisés sur beat'],
    recommendedCategories: ['Sport', 'Tutoriel', 'Tech', 'Divertissement'],
    emotionalKeywords: ['vitesse', 'action', 'énergie', 'rythme', 'dynamique', 'intensité'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Sans paroles pour ne jamais concurrencer une voix off ou un texte complexe.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_soothing_lofi_nature',
    title: 'Nappe Lo-Fi Douce & Ambiance Naturelle',
    artist: 'Catalogue Libre / Commercial Music Library (CML)',
    ambiance: 'Apaisante',
    secondaryAmbiances: ['Nostalgique'],
    rhythm: 'lent',
    idealSequenceTypes: ['Démonstration calme', 'Paysage continu', 'Conseil posé'],
    recommendedCategories: ['Bien-être', 'Nature', 'Astuces', 'Lifestyle'],
    emotionalKeywords: ['sérénité', 'respiration', 'nature', 'paix', 'douceur', 'détente'],
    commercialMusicLibraryEligible: 'verified_cml',
    territoryNote: 'Idéal si mélangé avec un léger bruit d’ambiance réel (vent, pas, nature).',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'cat_emotional_raw_live_extract',
    title: 'Son Original / Captation Live Sans Piste Ajoutée',
    artist: 'Audio natif capté au tournage (Droits à vérifier)',
    ambiance: 'Émotionnelle',
    secondaryAmbiances: ['Cinématographique'],
    rhythm: 'modéré',
    idealSequenceTypes: ['Prestation vocale live', 'Réaction brute', 'Immersion effort réel'],
    recommendedCategories: ['Musique', 'Live', 'Sport authentique'],
    emotionalKeywords: ['voix', 'direct', 'authenticité', 'frisson', 'respiration', 'brut'],
    commercialMusicLibraryEligible: 'original_audio_verify',
    territoryNote:
      'Si la captation contient une chanson protégée, la piste reste soumise aux droits d’auteur / licences TikTok du pays concerné.',
    source: 'internal_catalog',
    addedAt: '2026-11-01T00:00:00.000Z',
  },
];

export function parseImportedMusicCatalog(jsonText: string): {
  tracks: MusicCatalogTrack[];
  errors: string[];
} {
  const errors: string[] = [];
  try {
    const parsed = JSON.parse(jsonText);
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tracks) ? parsed.tracks : null;
    if (!arr) {
      return {
        tracks: [],
        errors: ['Format JSON invalide : fournissez un tableau d’objets ou { "tracks": [...] }.'],
      };
    }

    const valid: MusicCatalogTrack[] = [];
    for (let i = 0; i < arr.length; i++) {
      const raw = arr[i];
      if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) {
        errors.push(`Entrée #${i + 1} ignorée : champ "title" manquant.`);
        continue;
      }
      const ambiance = MUSIC_AMBIANCES.includes(raw.ambiance) ? raw.ambiance : 'Émotionnelle';
      const rhythm = raw.rhythm === 'lent' || raw.rhythm === 'rapide' ? raw.rhythm : 'modéré';
      valid.push({
        id: typeof raw.id === 'string' && raw.id ? raw.id : `imp_${Date.now()}_${i}`,
        title: raw.title.trim(),
        artist: typeof raw.artist === 'string' && raw.artist.trim() ? raw.artist.trim() : 'Import utilisateur',
        ambiance,
        secondaryAmbiances: Array.isArray(raw.secondaryAmbiances)
          ? raw.secondaryAmbiances.filter((a: any) => MUSIC_AMBIANCES.includes(a))
          : [],
        rhythm,
        idealSequenceTypes: Array.isArray(raw.idealSequenceTypes) ? raw.idealSequenceTypes.map(String) : ['Séquence générale'],
        recommendedCategories: Array.isArray(raw.recommendedCategories) ? raw.recommendedCategories.map(String) : ['Général'],
        emotionalKeywords: Array.isArray(raw.emotionalKeywords) ? raw.emotionalKeywords.map((x: any) => String(x).toLowerCase()) : [],
        commercialMusicLibraryEligible:
          raw.commercialMusicLibraryEligible === 'verified_cml' ||
          raw.commercialMusicLibraryEligible === 'personal_only_verify' ||
          raw.commercialMusicLibraryEligible === 'original_audio_verify'
            ? raw.commercialMusicLibraryEligible
            : 'personal_only_verify',
        territoryNote:
          typeof raw.territoryNote === 'string' && raw.territoryNote
            ? raw.territoryNote
            : 'Disponibilité et licence à vérifier dans TikTok selon le compte et le territoire.',
        source: 'user_imported',
        addedAt: new Date().toISOString(),
      });
    }

    return { tracks: valid, errors };
  } catch (e: any) {
    return {
      tracks: [],
      errors: [`Erreur de lecture JSON : ${e?.message || 'syntaxe invalide'}`],
    };
  }
}

export function exportMusicCatalogJson(tracks: MusicCatalogTrack[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      tracks,
    },
    null,
    2
  );
}

/**
 * Computes real sound performance stats from the user's account history
 * (using soundTitle or manual editorialMeta.musicName).
 */
export function buildAccountSoundHistoryCatalog(
  videos: TikTokOfficialVideo[],
  editorialMap?: Record<string, VideoEditorialMetadata>
): Array<{
  soundName: string;
  matchedVideoCount: number;
  medianViews: number;
  meanEngagementRate: number;
  sampleTitle: string;
  emotionsUsed: string[];
}> {
  const buckets: Record<
    string,
    { label: string; videos: TikTokOfficialVideo[]; emotions: Set<string> }
  > = {};

  for (const v of videos) {
    const manualMusic = editorialMap?.[v.id]?.musicName?.trim();
    const apiMusic = v.soundTitle?.trim();
    const soundName = manualMusic || apiMusic;
    if (!soundName) continue;

    const key = soundName.toLowerCase();
    if (!buckets[key]) {
      buckets[key] = { label: soundName, videos: [], emotions: new Set() };
    }
    buckets[key].videos.push(v);
    const emo = editorialMap?.[v.id]?.emotion?.trim();
    if (emo) buckets[key].emotions.add(emo);
  }

  return Object.values(buckets)
    .map((b) => {
      const sorted = b.videos.slice().sort((x, y) => y.viewCount - x.viewCount);
      return {
        soundName: b.label,
        matchedVideoCount: b.videos.length,
        medianViews: Math.round(computeMedian(b.videos.map((x) => x.viewCount))),
        meanEngagementRate: Number(
          computeMean(b.videos.map((x) => x.engagementRate)).toFixed(2)
        ),
        sampleTitle: sorted[0]?.title || 'Sans titre',
        emotionsUsed: Array.from(b.emotions),
      };
    })
    .sort((a, b) => b.medianViews - a.medianViews);
}

/**
 * Deterministic Music Advisor matching:
 * - brief (subject, category, desired emotion, ambiance, rhythm, sequence type)
 * - local catalog (internal + user imported)
 * - actual historical sound statistics from the account when available
 * Explicitly avoids promising reach or inventing viral trends.
 */
export function recommendMusicForBrief(
  req: MusicRecommendationRequest,
  catalog: MusicCatalogTrack[],
  videos: TikTokOfficialVideo[],
  editorialMap?: Record<string, VideoEditorialMetadata>
): MusicRecommendationResult[] {
  const effectiveCatalog = catalog.length > 0 ? catalog : DEFAULT_INTERNAL_CATALOG;
  const soundHistory = buildAccountSoundHistoryCatalog(videos, editorialMap);

  const briefTokens = `${req.subject} ${req.category} ${req.desiredEmotion} ${req.sequenceType}`
    .toLowerCase()
    .split(/[\s,.;:!?/#-]+/)
    .filter((t) => t.length >= 3);

  const results: MusicRecommendationResult[] = effectiveCatalog.map((track) => {
    let score = 0;
    const reasons: string[] = [];

    if (track.ambiance === req.ambiance) {
      score += 40;
      reasons.push(`Ambiance principale exacte (${req.ambiance})`);
    } else if (track.secondaryAmbiances?.includes(req.ambiance)) {
      score += 24;
      reasons.push(`Ambiance secondaire compatible (${req.ambiance})`);
    }

    if (track.rhythm === req.desiredRhythm) {
      score += 20;
      reasons.push(`Rythme adapté (${req.desiredRhythm})`);
    }

    const catLower = req.category.toLowerCase();
    if (
      catLower &&
      track.recommendedCategories.some(
        (c) => c.toLowerCase().includes(catLower) || catLower.includes(c.toLowerCase())
      )
    ) {
      score += 15;
      reasons.push(`Adapté à la catégorie « ${req.category} »`);
    }

    const seqLower = req.sequenceType.toLowerCase();
    if (
      seqLower &&
      track.idealSequenceTypes.some(
        (s) => s.toLowerCase().includes(seqLower) || seqLower.includes(s.toLowerCase())
      )
    ) {
      score += 10;
      reasons.push(`Cohérent avec la séquence (${req.sequenceType})`);
    }

    const keywordHits = track.emotionalKeywords.filter((kw) =>
      briefTokens.some((tok) => kw.includes(tok) || tok.includes(kw))
    );
    if (keywordHits.length > 0) {
      score += Math.min(15, keywordHits.length * 5);
      reasons.push(`Mots-clés émotionnels alignés (${keywordHits.slice(0, 3).join(', ')})`);
    }

    // Account type compliance check
    let availabilityNotice = '';
    if (req.accountType === 'business') {
      if (track.commercialMusicLibraryEligible === 'verified_cml') {
        score += 5;
        availabilityNotice = `Compte Business (${req.territory || 'territoire actuel'}) : recherchez une piste équivalente dans la Commercial Music Library (CML) et vérifiez la validité dans votre pays avant publication.`;
      } else {
        score -= 10;
        availabilityNotice = `Attention compte Business (${req.territory || 'territoire actuel'}) : ce type de son n'est pas garanti dans la Commercial Music Library. Vérifiez les droits commerciaux dans TikTok avant utilisation.`;
      }
    } else {
      availabilityNotice = `Compte Personnel (${req.territory || 'territoire actuel'}) : ${track.territoryNote} Aucune disponibilité ni portée virale ne peut être garantie.`;
    }

    // Match against historical account sounds if any sound name overlaps
    const matchedHistory = soundHistory.find((h) => {
      const hLower = h.soundName.toLowerCase();
      const tLower = track.title.toLowerCase();
      return hLower.includes(tLower) || tLower.includes(hLower) || h.emotionsUsed.some((e) => e.toLowerCase().includes(req.desiredEmotion.toLowerCase()));
    }) || null;

    if (matchedHistory) {
      score += 8;
      reasons.push(
        `Historique du compte : le son « ${matchedHistory.soundName} » totalise ${matchedHistory.matchedVideoCount} vidéo(s) pour une médiane de ${matchedHistory.medianViews.toLocaleString('fr-FR')} vues`
      );
    }

    return {
      track,
      matchScore: Math.max(0, Math.min(100, score)),
      justification:
        reasons.length > 0
          ? `${reasons.join(' · ')}. Note : le choix musical soutient la rétention et l’émotion sans jamais garantir la portée algorithmique.`
          : 'Correspondance partielle — vérifiez le contraste sonore avec votre accroche.',
      historicalSoundStats: matchedHistory
        ? {
            matchedVideoCount: matchedHistory.matchedVideoCount,
            medianViews: matchedHistory.medianViews,
            meanEngagementRate: matchedHistory.meanEngagementRate,
            sampleTitle: matchedHistory.sampleTitle,
          }
        : null,
      availabilityNotice,
    };
  });

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
