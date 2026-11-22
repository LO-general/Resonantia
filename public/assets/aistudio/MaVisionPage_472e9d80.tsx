import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Download,
  Film,
  Heart,
  Layers,
  MessageSquare,
  Music,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { ScrollProgress, useScrollReveal } from './ui';

interface MaVisionPageProps {
  onNavigateNext: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

interface CreatorNoteItem {
  id: string;
  text: string;
}

type SunsetMusicMood = 'joyeuse' | 'nostalgique' | 'epique';
type FormatExampleKey =
  | 'avant_apres'
  | 'vlog'
  | 'humour'
  | 'romantique'
  | 'nostalgique'
  | 'storytelling'
  | 'inspirant';

const SUNSET_MUSIC_SCENARIOS: Record<
  SunsetMusicMood,
  {
    id: SunsetMusicMood;
    label: string;
    tempo: string;
    instrumentation: string;
    skyGradient: string;
    sunColor: string;
    horizonGlow: string;
    overlayText: string;
    overlaySub: string;
    feltEmotion: string;
    viewerInterpretation: string;
    timingAdvice: string;
    musicEffect: string;
  }
> = {
  joyeuse: {
    id: 'joyeuse',
    label: 'Musique joyeuse & solaire',
    tempo: '118 BPM · Rythme léger',
    instrumentation: 'Guitare acoustique lumineuse, percussions douces, voix aérienne',
    skyGradient: 'from-sky-900 via-amber-700/70 to-amber-400/80',
    sunColor: '#fde047',
    horizonGlow: 'rgba(251, 191, 36, 0.55)',
    overlayText: '« Ce moment où tu réalises que tu n’as besoin de rien d’autre. »',
    overlaySub: 'Liberté · Été · Présence',
    feltEmotion: 'Légèreté, envie d’évasion, optimisme partagé',
    viewerInterpretation:
      'La même silhouette devant le coucher de soleil devient une célébration de l’instant présent et du bonheur simple.',
    timingAdvice:
      'Lancez la mélodie dès la 1ère image et synchronisez une coupe courte sur le temps fort à 1,5s.',
    musicEffect:
      'Favorise l’identification positive, les enregistrements pour soi et les partages entre proches (« notre été »).',
  },
  nostalgique: {
    id: 'nostalgique',
    label: 'Musique nostalgique & feutrée',
    tempo: '72 BPM · Respiration lente',
    instrumentation: 'Piano feutré, nappes de cordes chaudes, grain analogique',
    skyGradient: 'from-zinc-950 via-rose-950/85 to-amber-900/70',
    sunColor: '#fb7185',
    horizonGlow: 'rgba(244, 63, 94, 0.42)',
    overlayText: '« Certains soirs ont le goût d’une époque qui ne reviendra pas. »',
    overlaySub: 'Souvenir · Temps qui passe · Mélancolie douce',
    feltEmotion: 'Tendre mélancolie, souvenir personnel réveillé, recueillement',
    viewerInterpretation:
      'Sans changer un seul pixel de la vidéo, l’image bascule vers le manque, le souvenir d’un proche ou d’une étape révolue.',
    timingAdvice:
      'Laissez 1 seconde de bruit ambiant réel (vent, vagues), puis faites entrer le piano au moment où le texte apparaît.',
    musicEffect:
      'Allonge la durée de visionnage jusqu’à la dernière note et déclenche des commentaires intimes.',
  },
  epique: {
    id: 'epique',
    label: 'Musique épique & cinématographique',
    tempo: '94 BPM · Montée progressive',
    instrumentation: 'Cordes graves, piano en arpèges, montée de cuivres à 0:06',
    skyGradient: 'from-zinc-950 via-indigo-950/90 to-orange-700/75',
    sunColor: '#fb923c',
    horizonGlow: 'rgba(249, 115, 22, 0.48)',
    overlayText: '« Tout ce que tu as traversé en silence t’a mené exactement ici. »',
    overlaySub: 'Accomplissement · Cap franchi · Souffle',
    feltEmotion: 'Fierté contenue, admiration, élan vers l’avenir',
    viewerInterpretation:
      'Le coucher de soleil cesse d’être un simple paysage : il symbolise la fin d’une épreuve et l’ouverture d’un nouveau chapitre.',
    timingAdvice:
      'Calez l’impact sonore sur le mouvement de caméra ou sur l’apparition de la phrase clé.',
    musicEffect:
      'Provoque un fort taux de sauvegarde et d’abonnement auprès de ceux qui cherchent du courage.',
  },
};

const FORMAT_EXAMPLES: Record<
  FormatExampleKey,
  {
    key: FormatExampleKey;
    label: string;
    headline: string;
    isBeforeAfter?: boolean;
    before?: {
      image: string;
      sound: string;
      text: string;
      result: string;
    };
    after?: {
      image: string;
      sound: string;
      text: string;
      result: string;
    };
    image?: string;
    music?: string;
    screenText?: string;
    mechanism?: string;
  }
> = {
  avant_apres: {
    key: 'avant_apres',
    label: 'Avant / Après',
    headline: 'La même idée brute vs une séquence composée pour être ressentie',
    isBeforeAfter: true,
    before: {
      image: 'Plan fixe face caméra dans une chambre, démarrage par « Salut tout le monde aujourd’hui je vais vous parler de… ».',
      sound: 'Son brut sans respiration ni intention, aucune pause, aucune musique.',
      text: 'Titre descriptif plat : « 3 conseils pour rester motivé ».',
      result: 'Le spectateur comprend le sujet intellectuellement mais ne ressent rien : swipe en 1,2 seconde.',
    },
    after: {
      image: 'Plan filmé à 6h15 devant une fenêtre encore bleue, tasse fumante posée sans parler pendant 1 seconde.',
      sound: 'Bruit réel de la pluie + entrée douce d’un piano discret à 0:02.',
      text: '« Personne ne voit les matins où tu hésites encore, mais où tu y vas quand même. »',
      result: 'Le spectateur se reconnaît dès la 1ère seconde, reste jusqu’à la résolution et partage à quelqu’un qui traverse le même effort.',
    },
  },
  vlog: {
    key: 'vlog',
    label: 'Vlog sincère',
    headline: 'Transformer une journée ordinaire en fragment d’humanité',
    image: 'Micro-séquences de 1,5 à 2,5s : lacets noués, lumière du métro, regard fatigué puis sourire discret le soir.',
    music: 'Instrumental lo-fi ou guitare douce légèrement en retrait sous une voix calme et proche du micro.',
    screenText: 'Mots courts qui nomment ce qu’on n’ose pas dire à voix haute (« J’ai douté toute l’après-midi. »).',
    mechanism: 'La vulnérabilité assumée sans dramatisation crée un sentiment d’intimité authentique : le spectateur se sent moins seul.',
  },
  humour: {
    key: 'humour',
    label: 'Humour & décalage',
    headline: 'L’émotion par la connivence et la surprise de timing',
    image: 'Cadrage serré sur une expression figée ou une situation banale filmée comme un drame.',
    music: 'Décalage volontaire : musique solennelle ou dramatique sur un problème minuscule du quotidien, coupée net sur le silence.',
    screenText: 'Une seule phrase d’observation hyper-précise que tout le monde a déjà vécue.',
    mechanism: 'Le rire naît de la reconnaissance immédiate + rupture de rythme : le silence final déclenche le partage entre amis.',
  },
  romantique: {
    key: 'romantique',
    label: 'Romantique & tendre',
    headline: 'Suggerer la délicatesse par le regard et la retenue',
    image: 'Détails sensoriels (deux ombres qui marchent, main effleurée, lumière dorée de fin de journée, plan stable).',
    music: 'Mélodie chaleureuse à tempo lent, laissant exister les silences entre les phrases.',
    screenText: 'Une phrase simple et sincère, sans cliché grandiloquent (« C’est dans les petits gestes que tout se dit. »).',
    mechanism: 'Laisser de la place à l’imaginaire du spectateur lui permet de projeter sa propre histoire sur vos images.',
  },
  nostalgique: {
    key: 'nostalgique',
    label: 'Nostalgique',
    headline: 'Réveiller un souvenir collectif à travers un détail précis',
    image: 'Lumière chaude, texture naturelle, objet ou lieu universel (route de vacances, fin d’après-midi d’août, cahier ancien).',
    music: 'Mélodie familière ou accord mineur doux qui évoque le temps qui passe.',
    screenText: 'Ancre temporelle simple (« On ne savait pas encore que c’était nos derniers étés insouciants. »).',
    mechanism: 'La nostalgie mêle joie du souvenir et tendresse du manque : c’est l’un des moteurs de re-visionnage les plus puissants.',
  },
  storytelling: {
    key: 'storytelling',
    label: 'Storytelling',
    headline: 'Construire une tension émotionnelle jusqu’à la résolution',
    image: 'Ouverture in medias res sur l’instant de bascule, puis progression visuelle en trois temps (contexte -> friction -> déclic).',
    music: 'Deux couches : ambiance contenue pendant le récit, bascule harmonique au moment du tournant.',
    screenText: 'Sous-titres rythmés mettant en valeur 2 ou 3 mots pivots sans saturer l’écran.',
    mechanism: 'L’être humain suit une histoire pour connaître sa résolution émotionnelle, pas pour lire une liste d’arguments.',
  },
  inspirant: {
    key: 'inspirant',
    label: 'Inspirant',
    headline: 'Donner de l’élan sans jamais faire la leçon',
    image: 'Progression réelle montrant l’effort, les ratés puis la maîtrise, plutôt que le résultat final seul.',
    music: 'Montée progressive sobre, jamais agressive, qui soutient l’effort visible à l’image.',
    screenText: 'Une vérité concrète tirée de votre expérience vécue, jamais une injonction morale.',
    mechanism: 'L’admiration et l’espoir naissent quand le spectateur voit le chemin parcouru et se dit « moi aussi, je peux essayer ».',
  },
};

const EMOTIONS_WHEEL = [
  { name: 'Nostalgie', role: 'Réveille un souvenir vécu et donne envie de revoir la vidéo.' },
  { name: 'Amour & tendresse', role: 'Crée un attachement doux qui pousse à envoyer à un proche.' },
  { name: 'Tristesse apaisée', role: 'Valide une peine silencieuse et libère l’empathie.' },
  { name: 'Joie & légèreté', role: 'Transmet une énergie contagieuse qui éclaire la journée.' },
  { name: 'Rire & connivence', role: 'Brise la distance instantanément par un vécu partagé.' },
  { name: 'Admiration', role: 'Honore l’effort sincère, le geste juste ou le courage.' },
  { name: 'Espoir', role: 'Montre qu’un autre chemin ou un nouveau départ reste possible.' },
  { name: 'Identification', role: 'Fait dire intérieurement : « c’est exactement moi ».' },
  { name: 'Surprise', role: 'Interrompt le réflexe mécanique du swipe par l’inattendu.' },
];

const COMPOSITION_PILLARS = [
  { label: '01 · Les images', detail: 'Lumière, cadrage, expression du visage, vérité du mouvement.' },
  { label: '02 · La musique', detail: 'Donne la température émotionnelle et guide la lecture du plan.' },
  { label: '03 · Les mots à l’écran', detail: 'Nomment ce que l’image suggère sans l’écraser.' },
  { label: '04 · La narration', detail: 'Tension, point de vue, promesse tenue du début à la fin.' },
  { label: '05 · Le rythme', detail: 'Vitesse des coupes accordée à l’émotion (jamais frénétique sans raison).' },
  { label: '06 · Le montage', detail: 'L’ordre des plans qui révèle le sens sans tout expliquer.' },
  { label: '07 · Silences & transitions', detail: 'Laisser respirer un moment clé pour que l’émotion s’imprime.' },
];

const MUSIC_CRITERIA = [
  { title: 'Émotion ciblée', desc: 'Définir avant tout ce que la personne doit ressentir à la fin.' },
  { title: 'Sujet traité', desc: 'Aligner le caractère du morceau avec la réalité de la scène.' },
  { title: 'Ambiance sonore', desc: 'Vérifier si la voix et le bruit réel doivent dominer ou s’effacer.' },
  { title: 'Rythme visuel', desc: 'Accorder la durée des plans au tempo du morceau.' },
  { title: 'Arc narratif', desc: 'Choisir une musique qui évolue quand l’histoire bascule.' },
  { title: 'Timing d’entrée', desc: 'Savoir quand laisser 1s de silence avant le déclenchement musical.' },
];

export const MaVisionPage: React.FC<MaVisionPageProps> = ({
  onNavigateNext,
  onNavigateTab,
}) => {
  const [selectedMood, setSelectedMood] = useState<SunsetMusicMood>('nostalgique');
  const [selectedExample, setSelectedExample] = useState<FormatExampleKey>('avant_apres');

  // Personal Creator Intentions (preserved from original page, refactored cleanly without window.confirm)
  const [notes, setNotes] = useState<CreatorNoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('tiktok_user_vision_bubbles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((b: any) => ({
            id: String(b.id || Date.now()),
            text: String(b.text || '').trim(),
          })).filter((b: CreatorNoteItem) => b.text.length > 0);
        }
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'default_intent_1',
        text: 'Faire ressentir une émotion vraie dès les deux premières secondes, sans forcer ni copier mécaniquement les tendances.',
      },
      {
        id: 'default_intent_2',
        text: 'Soigner l’accord entre l’image, la musique et les mots à l’écran avant même de penser aux hashtags.',
      },
    ];
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<CreatorNoteItem | null>(null);
  const [notePendingDelete, setNotePendingDelete] = useState<CreatorNoteItem | null>(null);
  const [zipMenuOpen, setZipMenuOpen] = useState(false);
  const [downloadingZipKind, setDownloadingZipKind] = useState<'src' | 'full' | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_user_vision_bubbles', JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const activeMood = SUNSET_MUSIC_SCENARIOS[selectedMood];
  const activeFormat = FORMAT_EXAMPLES[selectedExample];

  const handleDownloadZip = async (kind: 'src' | 'full') => {
    const endpoint = kind === 'src' ? '/api/download-src-zip' : '/api/download-full-zip';
    const fileName =
      kind === 'src' ? 'src-and-tests.zip' : 'tiktok-content-manager-source.zip';
    setDownloadingZipKind(kind);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setZipMenuOpen(false);
    } catch (err) {
      console.error('Zip download error:', err);
    } finally {
      setDownloadingZipKind(null);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newNoteText.trim();
    if (!cleaned) return;
    setNotes((prev) => [...prev, { id: `intent_${Date.now()}`, text: cleaned }]);
    setNewNoteText('');
  };

  const handleSaveEditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.text.trim()) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === editingNote.id ? { ...n, text: editingNote.text.trim() } : n))
    );
    setEditingNote(null);
  };

  const confirmDeleteNote = () => {
    if (!notePendingDelete) return;
    setNotes((prev) => prev.filter((n) => n.id !== notePendingDelete.id));
    setNotePendingDelete(null);
  };

  const pageRef = useRef<HTMLDivElement | null>(null);
  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="relative min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30">
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-grid" />
      </div>
      <ScrollProgress />
      {/* Clean Top Bar */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-black text-[11px]">
              TK
            </span>
            <span className="text-xs font-semibold tracking-[0.14em] uppercase text-rose-400">
              Étape 1 &middot; Re-build
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setZipMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Code ZIP</span>
              </button>
              {zipMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 space-y-1 z-50">
                  <button
                    type="button"
                    disabled={downloadingZipKind !== null}
                    onClick={() => handleDownloadZip('src')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-xs text-zinc-100 transition cursor-pointer flex items-center justify-between"
                  >
                    <span>{downloadingZipKind === 'src' ? 'Téléchargement...' : 'src/ + tests/ (.zip)'}</span>
                    <span className="text-[10px] font-mono text-zinc-400">706 Ko</span>
                  </button>
                  <button
                    type="button"
                    disabled={downloadingZipKind !== null}
                    onClick={() => handleDownloadZip('full')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-xs text-zinc-100 transition cursor-pointer flex items-center justify-between"
                  >
                    <span>{downloadingZipKind === 'full' ? 'Téléchargement...' : 'Projet complet (.zip)'}</span>
                    <span className="text-[10px] font-mono text-zinc-400">1,9 Mo</span>
                  </button>
                </div>
              )}
            </div>

            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('comprendre')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  <span>Étape 2 : Vidéos</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('coach')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  <span>Mon Coach</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => { onNavigateNext(); }}
              className="btn-brand inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              <span>Continuer le parcours</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-16">
        {/* 1. MANIFESTO HERO */}
        <section className="grid lg:grid-cols-12 gap-10 items-end border-b border-zinc-800/80 pb-14">
          <div className="lg:col-span-8 space-y-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-400 inline-flex items-center gap-2">
              <span className="live-dot" />
              Nouvelle philosophie
            </div>
            <h1 className="font-['Fraunces',Georgia,serif] text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08]">
              Les autres apprennent aux créateurs à être visibles.{' '}
              <span className="italic text-amber-300 font-normal">
                Nous voulons leur apprendre à être ressentis.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl">
              Une tendance attire un regard.{' '}
              <strong className="text-white font-semibold">
                Une émotion, elle, reste.
              </strong>
            </p>
          </div>

          <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pourquoi Re-build existe
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Horaires, SEO, métriques : tout ça mesure la surface. Une vidéo touche d’abord un
              humain, ensuite seulement un algorithme.
            </p>
          </div>
        </section>

        {/* 2. WHY CONTENT RESONATES + INTELLECTUAL NUANCE */}
        <section className="space-y-8">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">
                Pourquoi ça marche
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-4xl font-semibold text-white leading-tight">
                Pourquoi certains extraits traversent le bruit
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Quand on s’arrête devant un extrait ou un vlog sincère, ce n’est pas un hasard :
                une résonance affective suspend le geste de balayage.
              </p>

              {/* Nuance Block (Essential Intellectual Honesty) */}
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Nuance essentielle
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  L’émotion est un moteur central, <strong>mais jamais le seul</strong> : notoriété,
                  contexte, qualité d’exécution, clarté du récit et distribution comptent aussi.
                </p>
              </div>
            </div>

            {/* 9 Core Emotions Matrix */}
            <div className="lg:col-span-7 grid sm:grid-cols-3 gap-3">
              {EMOTIONS_WHEEL.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-1.5"
                >
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. THREE COMPLEMENTARY DIMENSIONS (Asymmetric Hierarchy) */}
        <section className="space-y-8">
          <div className="space-y-2 max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-400">
              L’ADN d’une vidéo qui marque
            </div>
            <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-4xl font-semibold text-white">
              Trois dimensions complémentaires
            </h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Dimension A: L'Émotion */}
            <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-400">01 / L’ÉMOTION</span>
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
              <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
                Ce que le spectateur ressent avant de réfléchir
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Avant de liker, on ressent : une tension, un sourire, un pincement. Sans intention
                claire au tournage, le montage ne fait que masquer le vide.
              </p>
              <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                Question clé : « Quelle sensation je laisse à celui qui regarde jusqu’au bout ? »
              </div>
            </div>

            {/* Dimension B: La Composition (Marquee Col-Span-2 style) */}
            <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400">
                  02 / LA COMPOSITION
                </span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
                L’accord des sept leviers au service d’une seule sensation
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {COMPOSITION_PILLARS.map((p) => (
                  <div key={p.label} className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{p.label}</div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed">{p.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimension C: La Connexion humaine */}
            <div className="lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-400">
                  03 / CONNEXION
                </span>
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
                Le pont entre deux humains
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                La connexion naît de la justesse : quelqu’un se sent compris, ou envoie votre
                vidéo à un ami d’un coup de coude.
              </p>
              <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                La bonne viralité découle de la justesse humaine.
              </div>
            </div>
          </div>
        </section>

        {/* 4. CENTRAL INTERACTIVE MUSIC DEMONSTRATION (Sunset Scene Sandbox) */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-10 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400 flex items-center gap-2">
                <Music className="w-3.5 h-3.5" />
                <span>La musique change tout · À toi de jouer</span>
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-2xl sm:text-4xl font-semibold text-white">
                Une même image de coucher de soleil, trois réalités émotionnelles
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Même image, autre musique : touche un style et regarde le sens changer.
              </p>
            </div>
          </div>

          {/* Interactive 2-Zone Stage */}
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Zone: Live Visual Scene Preview */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div
                className={`relative aspect-[9/14] sm:aspect-[4/5] w-full rounded-2xl overflow-hidden border border-zinc-700/70 bg-gradient-to-b ${activeMood.skyGradient} transition-all duration-500 flex flex-col justify-between p-6 shadow-2xl`}
              >
                {/* Atmospheric Sunset SVG Illustration */}
                <svg
                  viewBox="0 0 400 320"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <radialGradient id={`sunGlow_${activeMood.id}`} cx="50%" cy="62%" r="48%">
                      <stop offset="0%" stopColor={activeMood.sunColor} stopOpacity="0.95" />
                      <stop offset="40%" stopColor={activeMood.horizonGlow} />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>
                  <rect width="400" height="320" fill={`url(#sunGlow_${activeMood.id})`} />
                  <circle cx="200" cy="196" r="42" fill={activeMood.sunColor} opacity="0.9" />
                  {/* Distant horizon & sea silhouette */}
                  <path
                    d="M0 218 Q110 208 210 216 T400 212 L400 320 L0 320 Z"
                    fill="#09090b"
                    opacity="0.88"
                  />
                  {/* Shimmer reflection */}
                  <ellipse
                    cx="200"
                    cy="240"
                    rx="55"
                    ry="4"
                    fill={activeMood.sunColor}
                    opacity="0.28"
                  />
                  <ellipse
                    cx="200"
                    cy="256"
                    rx="34"
                    ry="2.5"
                    fill={activeMood.sunColor}
                    opacity="0.2"
                  />
                </svg>

                {/* Top Scene Caption */}
                <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/85">
                  <span>SCÈNE IDENTIQUE · 00:08</span>
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{activeMood.tempo}</span>
                  </span>
                </div>

                {/* Center Screen Text Overlay */}
                <div className="relative z-10 my-auto text-center space-y-2 px-2">
                  <p className="font-['Fraunces',Georgia,serif] text-xl sm:text-2xl text-white font-medium leading-snug drop-shadow-md">
                    {activeMood.overlayText}
                  </p>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/80 font-semibold">
                    {activeMood.overlaySub}
                  </div>
                </div>

                {/* Bottom Audio Instrumentation Bar */}
                <div className="relative z-10 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 p-3 text-xs text-zinc-200">
                  <div className="font-semibold text-white">Direction sonore active :</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5">
                    {activeMood.instrumentation}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Zone: Switcher Controls + 6 Selection Criteria */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              {/* Interactive Mood Buttons */}
              <div className="grid sm:grid-cols-3 gap-2.5">
                {(['joyeuse', 'nostalgique', 'epique'] as SunsetMusicMood[]).map((moodKey) => {
                  const item = SUNSET_MUSIC_SCENARIOS[moodKey];
                  const isActive = selectedMood === moodKey;
                  return (
                    <button
                      key={moodKey}
                      type="button"
                      onClick={() => setSelectedMood(moodKey)}
                      className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                        isActive
                          ? 'bg-white text-zinc-950 border-white shadow-lg'
                          : 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div
                        className={`text-[11px] mt-1 font-mono ${
                          isActive ? 'text-zinc-600' : 'text-zinc-500'
                        }`}
                      >
                        {item.tempo}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Mood Pedagogical Readout */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      Émotion déclenchée
                    </div>
                    <p className="text-sm font-semibold text-white">{activeMood.feltEmotion}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      Impact comportemental
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{activeMood.musicEffect}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    <strong className="text-white">Lecture du spectateur :</strong>{' '}
                    {activeMood.viewerInterpretation}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">Timing d’entrée conseillé :</strong>{' '}
                    {activeMood.timingAdvice}
                  </p>
                </div>
              </div>

              {/* 6 Criteria for Music Selection */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  6 critères pour choisir ta musique
                </div>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  {MUSIC_CRITERIA.map((c) => (
                    <div
                      key={c.title}
                      className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-3 space-y-1"
                    >
                      <div className="text-xs font-bold text-white">{c.title}</div>
                      <div className="text-[11px] text-zinc-400 leading-relaxed">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. CONCRETE PEDAGOGICAL EXAMPLES (Before/After + 6 Genres) */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
                Exemples concrets
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-3xl sm:text-4xl font-semibold text-white">
                Image + musique + texte : le bon trio
              </h2>
            </div>
          </div>

          {/* Interactive Format Selector */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMAT_EXAMPLES) as FormatExampleKey[]).map((key) => {
              const ex = FORMAT_EXAMPLES[key];
              const isSelected = selectedExample === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedExample(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {ex.label}
                </button>
              );
            })}
          </div>

          {/* Active Format Card */}
          <div className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 space-y-6">
            <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
              {activeFormat.headline}
            </h3>

            {activeFormat.isBeforeAfter && activeFormat.before && activeFormat.after ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Avant */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Approche mécanique (Avant)
                  </div>
                  <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                    <p>
                      <strong className="text-white">Image :</strong> {activeFormat.before.image}
                    </p>
                    <p>
                      <strong className="text-white">Son :</strong> {activeFormat.before.sound}
                    </p>
                    <p>
                      <strong className="text-white">Texte :</strong> {activeFormat.before.text}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400">
                    {activeFormat.before.result}
                  </div>
                </div>

                {/* Après */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Composition émotionnelle (Après)
                  </div>
                  <div className="space-y-2 text-xs text-zinc-200 leading-relaxed">
                    <p>
                      <strong className="text-white">Image :</strong> {activeFormat.after.image}
                    </p>
                    <p>
                      <strong className="text-white">Son :</strong> {activeFormat.after.sound}
                    </p>
                    <p>
                      <strong className="text-white">Texte :</strong> {activeFormat.after.text}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-emerald-500/20 text-xs text-emerald-200">
                    {activeFormat.after.result}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    <span>Image &amp; cadrage</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{activeFormat.image}</p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    <span>Musique &amp; son</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{activeFormat.music}</p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mots à l’écran</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{activeFormat.screenText}</p>
                </div>

                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    <span>Pourquoi ça touche</span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">{activeFormat.mechanism}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 6. COPYRIGHT, ORIGINALITY & MUSIC RIGHTS SAFEGUARDS */}
        <section className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">
                Cadre légal &amp; éthique créateur
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-2xl sm:text-3xl font-semibold text-white">
                S’inspirer sans copier : les règles en 5 lignes
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
              <div className="text-xs font-bold text-white">
                Pas de réupload non autorisée
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Comprendre pourquoi une scène touche ne donne pas le droit de la republier.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
              <div className="text-xs font-bold text-white">
                Créditer ne remplace pas la permission
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Citer un titre ou écrire « droits réservés » n’est jamais une licence.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
              <div className="text-xs font-bold text-white">
                Pédagogie vs exploitation publique
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Analyser pour apprendre n’est pas rediffuser sur un compte public.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5">
              <div className="text-xs font-bold text-white">
                Privilégier le contenu original ou sous licence
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Filme tes plans, ou utilise des banques sous licence. Apporte ta voix.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-1.5 sm:col-span-2 lg:col-span-2">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Droits musicaux sur TikTok (Personnel vs Entreprise)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Compte Business : uniquement la Bibliothèque Musicale Commerciale (CML) ou des
                titres sous licence écrite. Vérifie dans{' '}
                <strong className="text-zinc-200">Conseiller Musical</strong> avant de publier.
              </p>
            </div>
          </div>
        </section>

        {/* 7. PERSONAL CREATOR COMPASS (Preserved customization capability without window.confirm) */}
        <section className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>Ta boussole</span>
              </div>
              <h2 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
                Ce que tu veux faire ressentir
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 flex items-start justify-between gap-3"
              >
                {editingNote?.id === note.id ? (
                  <form onSubmit={handleSaveEditNote} className="w-full space-y-2">
                    <textarea
                      rows={2}
                      value={editingNote.text}
                      onChange={(e) =>
                        setEditingNote({ ...editingNote, text: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNote(null)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Enregistrer</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">{note.text}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingNote(note)}
                        title="Modifier cette intention"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotePendingDelete(note)}
                        title="Supprimer cette intention"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Ajouter une intention personnelle (ex : Raconter mes doutes avec simplicité et lumière chaude)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-sm text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newNoteText.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter à ma vision</span>
            </button>
          </form>
        </section>

        {/* 8. BOTTOM TRANSITION CTA */}
        <section className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="text-xs font-semibold text-rose-400">Étape suivante du studio</div>
            <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
              Prêt pour l’Étape 2 ?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Connecte ton compte TikTok si ce n’est pas fait, puis découvre les leçons vidéo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { onNavigateNext(); }}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-sm font-bold transition cursor-pointer shrink-0"
          >
            <span>Valider Re-build &amp; continuer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>

      {/* In-App Delete Confirmation Modal (Zero window.confirm) */}
      {notePendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNotePendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Supprimer cette intention ?</h3>
              <button
                type="button"
                onClick={() => setNotePendingDelete(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              « {notePendingDelete.text} » sera retirée de votre boussole éditoriale personnelle.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotePendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
