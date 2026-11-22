import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Download,
  Heart,
  Music,
  Volume2,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { ScrollProgress, useScrollReveal } from './ui';

interface MaVisionPageProps {
  onNavigateNext: () => void;
  onNavigateTab?: (tab: ActiveTab) => void;
  isAuthenticated?: boolean;
  onOpenCookieSettings?: () => void;
}

type ResonancePillarId = 'emotion' | 'musique' | 'timing';

const RESONANCE_PILLARS: Record<
  ResonancePillarId,
  {
    id: ResonancePillarId;
    label: string;
    shortTag: string;
    sceneMeta: string;
    sceneBadge: string;
    skyGradient: string;
    accentColor: string;
    glowColor: string;
    overlayText: string;
    overlaySub: string;
    bottomLabel: string;
    bottomDetail: string;
    impactTitle: string;
    impactSummary: string;
    behaviorEffect: string;
    viewerReading: string;
    concreteLever: string;
  }
> = {
  emotion: {
    id: 'emotion',
    label: 'L’émotion',
    shortTag: 'Connexion humaine',
    sceneMeta: 'IMPACT ÉMOTIONNEL · 00:08',
    sceneBadge: 'Résonance directe',
    skyGradient: 'from-zinc-950 via-rose-950/85 to-amber-900/65',
    accentColor: '#fb7185',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    overlayText: '« On n’oublie jamais ce qu’une vidéo nous a fait ressentir. »',
    overlaySub: 'Identification · Sincérité · Présence',
    bottomLabel: 'Effet de l’émotion :',
    bottomDetail: 'Une émotion vraie arrête le pouce plus vite que n’importe quel effet visuel.',
    impactTitle: 'Ce que ressent le spectateur',
    impactSummary: 'Reconnaissance immédiate, sentiment d’être compris, attachement sincère',
    behaviorEffect:
      'Déclenche les enregistrements pour soi, les partages à un proche et les commentaires personnels.',
    viewerReading:
      'Quand une scène porte une intention émotionnelle claire (soulagement, nostalgie, fierté ou émerveillement), le spectateur cesse de consommer passivement et s’approprie le moment.',
    concreteLever:
      'Avant même de filmer ou monter, nomme l’unique émotion que tu veux laisser dans les 3 secondes qui suivent la fin de ta vidéo.',
  },
  musique: {
    id: 'musique',
    label: 'La musique',
    shortTag: 'Atmosphère & sens',
    sceneMeta: 'IMPACT MUSICAL · 72 → 118 BPM',
    sceneBadge: 'Couleur sonore',
    skyGradient: 'from-zinc-950 via-indigo-950/90 to-amber-700/70',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.48)',
    overlayText: '« Change la bande-son : la même image raconte une autre histoire. »',
    overlaySub: 'Texture · Tempo · Profondeur',
    bottomLabel: 'Effet de la musique :',
    bottomDetail: 'Piano feutré, guitare solaire ou cordes graves : le son oriente le cerveau avant les mots.',
    impactTitle: 'Ce que transforme la musique',
    impactSummary: 'Perception de l’image, densité de l’atmosphère et mémorisation de la scène',
    behaviorEffect:
      'Prolonge le visionnage jusqu’à la dernière note et donne une signature immédiatement reconnaissable à ton univers.',
    viewerReading:
      'Sans changer un seul plan, la texture sonore fait basculer une même séquence de la légèreté solaire à la mélancolie douce ou au souffle cinématographique.',
    concreteLever:
      'Choisis un morceau dont la dynamique épouse le sujet réel de la scène au lieu de coller un son tendance hors contexte.',
  },
  timing: {
    id: 'timing',
    label: 'Le timing',
    shortTag: 'Tension & bascule',
    sceneMeta: 'IMPACT DU TIMING · 00:00 → 00:06',
    sceneBadge: 'Rythme & respiration',
    skyGradient: 'from-zinc-950 via-sky-950/85 to-orange-800/70',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.42)',
    overlayText: '« Une seconde de silence avant la bascule change tout l’impact. »',
    overlaySub: '0:00 Accroche · 0:02 Tension · 0:06 Libération',
    bottomLabel: 'Effet du timing :',
    bottomDetail: 'Entrée du son, coupe sur le temps fort et respiration créent l’envie de rester jusqu’au bout.',
    impactTitle: 'Ce que produit le timing',
    impactSummary: 'Captation dès 0:00, montée de curiosité et libération au moment exact',
    behaviorEffect:
      'Évite le décrochage des 2 premières secondes et maximise la complétion jusqu’à la phrase ou l’image clé.',
    viewerReading:
      'Deux vidéos au même sujet ont des destins opposés selon l’instant où le son démarre, la durée d’un silence et le moment précis où la phrase clé apparaît.',
    concreteLever:
      'Laisse parfois 1 seconde de bruit réel avant l’entrée musicale, puis cale ton changement de plan exactement sur la bascule sonore.',
  },
};

const PillarVisualSvg: React.FC<{ pillar: ResonancePillarId; accentColor: string; glowColor: string }> = ({
  pillar,
  accentColor,
  glowColor,
}) => {
  if (pillar === 'emotion') {
    return (
      <svg
        viewBox="0 0 400 440"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="emotionCoreGlow" cx="50%" cy="48%" r="52%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.88" />
            <stop offset="45%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="400" height="440" fill="url(#emotionCoreGlow)" />
        {/* Concentric emotional resonance ripples */}
        <circle cx="200" cy="205" r="46" fill="none" stroke={accentColor} strokeOpacity="0.65" strokeWidth="1.5" />
        <circle cx="200" cy="205" r="82" fill="none" stroke={accentColor} strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="5 5" />
        <circle cx="200" cy="205" r="122" fill="none" stroke="#fde68a" strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="200" cy="205" r="164" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />
        {/* Warm glowing human heart / pulse core */}
        <circle cx="200" cy="205" r="24" fill={accentColor} opacity="0.92" />
        <path
          d="M200 218 C191 211 183 205 183 198 C183 193 187 190 191.5 190 C195 190 198 192 200 195 C202 192 205 190 208.5 190 C213 190 217 193 217 198 C217 205 209 211 200 218 Z"
          fill="#09090b"
          opacity="0.82"
        />
        {/* Horizon silhouette & gentle reflection */}
        <path d="M0 315 Q120 302 220 312 T400 308 L400 440 L0 440 Z" fill="#09090b" opacity="0.88" />
        <ellipse cx="200" cy="340" rx="70" ry="5" fill={accentColor} opacity="0.26" />
        <ellipse cx="200" cy="358" rx="42" ry="3" fill="#fde68a" opacity="0.18" />
      </svg>
    );
  }

  if (pillar === 'musique') {
    const bars = [24, 42, 68, 52, 92, 118, 84, 134, 96, 126, 78, 108, 64, 48, 30];
    return (
      <svg
        viewBox="0 0 400 440"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="musicGlow" cx="50%" cy="54%" r="54%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.72" />
            <stop offset="48%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="400" height="440" fill="url(#musicGlow)" />
        {/* Harmonic sine waves across the scene */}
        <path
          d="M0 215 Q50 155 100 215 T200 215 T300 215 T400 215"
          fill="none"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeOpacity="0.8"
        />
        <path
          d="M0 232 Q60 286 120 232 T240 232 T360 232 T420 232"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.4"
        />
        <path
          d="M0 198 Q70 142 140 198 T280 198 T420 198"
          fill="none"
          stroke="#fb7185"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />
        {/* Acoustic spectrum bars */}
        {bars.map((h, i) => {
          const x = 44 + i * 22;
          return (
            <rect
              key={i}
              x={x}
              y={220 - h / 2}
              width="7"
              height={h}
              rx="3.5"
              fill={i % 2 === 0 ? accentColor : '#ffffff'}
              opacity={i % 2 === 0 ? 0.55 : 0.28}
            />
          );
        })}
        {/* Dark silhouette landscape */}
        <path d="M0 322 Q115 308 215 318 T400 314 L400 440 L0 440 Z" fill="#09090b" opacity="0.88" />
        <ellipse cx="200" cy="348" rx="64" ry="4" fill={accentColor} opacity="0.25" />
      </svg>
    );
  }

  // Timing visual: narrative tension arc + beat-drop release markers (0:00 -> 0:02 -> 0:06)
  return (
    <svg
      viewBox="0 0 400 440"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="timingGlow" cx="72%" cy="42%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
          <stop offset="45%" stopColor={glowColor} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="400" height="440" fill="url(#timingGlow)" />

      {/* Vertical timeline grid markers */}
      <line x1="68" y1="88" x2="68" y2="310" stroke="#ffffff" strokeOpacity="0.16" strokeDasharray="4 4" />
      <line x1="176" y1="88" x2="176" y2="310" stroke="#ffffff" strokeOpacity="0.22" strokeDasharray="4 4" />
      <line x1="296" y1="76" x2="296" y2="310" stroke={accentColor} strokeOpacity="0.7" strokeWidth="1.5" />

      {/* Tension-to-release arc */}
      <path
        d="M36 276 L112 276 C148 276 164 236 176 226 C216 196 254 188 296 132 C320 100 348 118 372 138"
        fill="none"
        stroke={accentColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M36 276 L112 276 C148 276 164 236 176 226 C216 196 254 188 296 132 C320 100 348 118 372 138 L372 310 L36 310 Z"
        fill={accentColor}
        opacity="0.12"
      />

      {/* Key beat nodes */}
      <circle cx="68" cy="276" r="5" fill="#ffffff" opacity="0.8" />
      <circle cx="176" cy="226" r="6" fill="#fbbf24" opacity="0.95" />
      <circle cx="296" cy="132" r="10" fill={accentColor} opacity="0.95" />
      <circle cx="296" cy="132" r="22" fill="none" stroke={accentColor} strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="296" cy="132" r="36" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1" />

      {/* Timeline labels */}
      <text x="68" y="302" textAnchor="middle" fill="#e4e4e7" fontSize="10" fontFamily="monospace" opacity="0.85">
        0:00 SILENCE
      </text>
      <text x="176" y="302" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace" opacity="0.9">
        0:02 TENSION
      </text>
      <text x="296" y="302" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace" fontWeight="700">
        0:06 BASCULE
      </text>

      {/* Dark horizon */}
      <path d="M0 326 Q140 316 250 324 T400 318 L400 440 L0 440 Z" fill="#09090b" opacity="0.9" />
    </svg>
  );
};

export const MaVisionPage: React.FC<MaVisionPageProps> = ({
  onNavigateNext,
  onNavigateTab,
  isAuthenticated = true,
  onOpenCookieSettings,
}) => {
  const [selectedPillar, setSelectedPillar] = useState<ResonancePillarId>('emotion');
  const [zipMenuOpen, setZipMenuOpen] = useState(false);
  const [downloadingZipKind, setDownloadingZipKind] = useState<'src' | 'full' | null>(null);

  const activePillar = RESONANCE_PILLARS[selectedPillar];

  const handleDownloadZip = async (kind: 'src' | 'full') => {
    const endpoint = kind === 'src' ? '/api/download-src-zip' : '/api/download-full-zip';
    const fileName =
      kind === 'src' ? 'src-and-tests.zip' : 'resonantia-source.zip';
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

  const pageRef = useRef<HTMLDivElement | null>(null);
  useScrollReveal(pageRef);

  const pillarIcons: Record<ResonancePillarId, React.ComponentType<{ className?: string }>> = {
    emotion: Heart,
    musique: Music,
    timing: Clock,
  };

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
              RS
            </span>
            <span className="text-xs font-semibold tracking-[0.14em] uppercase text-rose-400">
              Resonantia
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
                    <span className="text-[10px] font-mono text-zinc-400">.zip</span>
                  </button>
                  <button
                    type="button"
                    disabled={downloadingZipKind !== null}
                    onClick={() => handleDownloadZip('full')}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-xs text-zinc-100 transition cursor-pointer flex items-center justify-between"
                  >
                    <span>{downloadingZipKind === 'full' ? 'Téléchargement...' : 'Projet complet (.zip)'}</span>
                    <span className="text-[10px] font-mono text-zinc-400">.zip</span>
                  </button>
                </div>
              )}
            </div>

            {onOpenCookieSettings && (
              <button
                type="button"
                onClick={onOpenCookieSettings}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <span>Cookies</span>
              </button>
            )}

            {isAuthenticated && onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('connect')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  <span>Connexion TikTok</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('comprendre')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition cursor-pointer"
                >
                  <span>Attention humaine</span>
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
              <span>{isAuthenticated ? 'Continuer le parcours' : 'Passer à l’inscription'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10">
        {/* Page Title directly on the dark background */}
        <section className="text-center space-y-3 pt-2 pb-1">
          <h1 className="font-['Fraunces',Georgia,serif] text-5xl sm:text-7xl font-semibold tracking-tight text-white">
            Resonantia
          </h1>
          <p className="text-base sm:text-xl text-zinc-300 font-medium max-w-2xl mx-auto leading-relaxed">
            Ne cours pas après la viralité. Crée de la résonance.
          </p>
        </section>

        {/* Interactive Demonstration Card (L'émotion / La musique / Le timing) */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-10 space-y-8">
          {/* Interactive 2-Zone Stage */}
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Zone: Live Visual Scene Preview */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div
                className={`relative aspect-[9/14] sm:aspect-[4/5] w-full rounded-2xl overflow-hidden border border-zinc-700/70 bg-gradient-to-b ${activePillar.skyGradient} transition-all duration-500 flex flex-col justify-between p-6 shadow-2xl`}
              >
                <PillarVisualSvg
                  pillar={activePillar.id}
                  accentColor={activePillar.accentColor}
                  glowColor={activePillar.glowColor}
                />

                {/* Top Scene Caption */}
                <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/85">
                  <span>{activePillar.sceneMeta}</span>
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{activePillar.sceneBadge}</span>
                  </span>
                </div>

                {/* Center Screen Text Overlay */}
                <div className="relative z-10 my-auto text-center space-y-2 px-2">
                  <p className="font-['Fraunces',Georgia,serif] text-xl sm:text-2xl text-white font-medium leading-snug drop-shadow-md">
                    {activePillar.overlayText}
                  </p>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/80 font-semibold">
                    {activePillar.overlaySub}
                  </div>
                </div>

                {/* Bottom Active Pillar Bar */}
                <div className="relative z-10 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 p-3 text-xs text-zinc-200">
                  <div className="font-semibold text-white">{activePillar.bottomLabel}</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5">
                    {activePillar.bottomDetail}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Zone: Switcher Controls + Pedagogical Readout */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              {/* Interactive Pillar Buttons */}
              <div className="grid sm:grid-cols-3 gap-2.5">
                {(['emotion', 'musique', 'timing'] as ResonancePillarId[]).map((pillarKey) => {
                  const item = RESONANCE_PILLARS[pillarKey];
                  const isActive = selectedPillar === pillarKey;
                  const Icon = pillarIcons[pillarKey];
                  return (
                    <button
                      key={pillarKey}
                      type="button"
                      onClick={() => setSelectedPillar(pillarKey)}
                      className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                        isActive
                          ? 'bg-white text-zinc-950 border-white shadow-lg'
                          : 'bg-zinc-950/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-rose-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 font-mono ${
                          isActive ? 'text-zinc-600' : 'text-zinc-500'
                        }`}
                      >
                        {item.shortTag}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Pillar Pedagogical Readout */}
              <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-7 flex flex-col justify-between space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      {activePillar.impactTitle}
                    </div>
                    <p className="text-sm font-semibold text-white leading-relaxed">
                      {activePillar.impactSummary}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      Impact sur l’audience
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {activePillar.behaviorEffect}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    <strong className="text-white">Pourquoi ça change tout :</strong>{' '}
                    {activePillar.viewerReading}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">Application concrète :</strong>{' '}
                    {activePillar.concreteLever}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IMMEDIATE NEXT STEP CTA */}
        <section className="surface-hover rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="text-xs font-semibold text-rose-400">
              {isAuthenticated ? 'Étape suivante du parcours' : 'Étape suivante · Inscription'}
            </div>
            <h3 className="font-['Fraunces',Georgia,serif] text-2xl font-semibold text-white">
              {isAuthenticated ? 'Connecter ton compte & continuer' : 'Prêt à créer ton compte ?'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isAuthenticated
                ? 'Relie ton compte TikTok, découvre ce qui retient vraiment l’attention humaine, puis accède à Mon Coach avec toutes tes données.'
                : 'Crée ton compte pour relier ton TikTok, comprendre l’attention humaine et ouvrir Mon Coach avec toutes tes données.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { onNavigateNext(); }}
            className="btn-brand inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition cursor-pointer shrink-0"
          >
            <span>{isAuthenticated ? 'Continuer' : 'Passer à l’inscription'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>
    </div>
  );
};
