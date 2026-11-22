import React, { useState } from 'react';
import { ContentMode } from '../types';
import { saveContentModeForUser } from '../services/db';
import { Sparkles, Repeat, Layers, ArrowRight, CheckCircle2, Info } from 'lucide-react';

interface ContentModeOnboardingPageProps {
  userId: string;
  initialMode?: ContentMode | null;
  onComplete: (mode: ContentMode) => void;
  onSkipToCoach?: () => void;
}

const OPTIONS: Array<{
  mode: ContentMode;
  title: string;
  subtitle: string;
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'creation',
    title: 'Création de contenu',
    subtitle: 'Je produis mes propres vidéos originales (face caméra, montage, voix off, captation).',
    details: [
      'Analyse dédiée à vos créations originales dans Analytics et Mon Coach.',
      'Suivi de l’accroche, de la rétention et des thématiques porteuses.',
      'Conseiller musical orienté narration, rythme et émotions.',
    ],
    icon: Sparkles,
  },
  {
    mode: 'repost',
    title: 'Repost de contenu',
    subtitle: 'Je republie ou relaye des séquences existantes avec droits et valeur ajoutée.',
    details: [
      'Accès complet au module « Mon Repost » avec fiche d’autorisation écrite.',
      'Rappel des outils natifs (Repost, Duo, Collage) et vérification des droits musicaux.',
      'Vigilance sur les règles d’originalité pour préserver la portée organique.',
    ],
    icon: Repeat,
  },
  {
    mode: 'both',
    title: 'Les deux (Création & Repost)',
    subtitle: 'Je publie à la fois mes créations originales et des contenus repostés autorisés.',
    details: [
      'Filtrage neutre Création vs Repost vs Global dans Mon Coach et Analytics.',
      'Comparaison objective des médianes de vues et conversions sans parti pris.',
      'Accès simultané à tous les outils : Visionnaire, Coach, Analytics, Repost et Musique.',
    ],
    icon: Layers,
  },
];

export const ContentModeOnboardingPage: React.FC<ContentModeOnboardingPageProps> = ({
  userId,
  initialMode,
  onComplete,
  onSkipToCoach,
}) => {
  const [selectedMode, setSelectedMode] = useState<ContentMode>(initialMode || 'both');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await saveContentModeForUser(userId, selectedMode);
      onComplete(selectedMode);
    } catch (err: any) {
      setErrorMsg(err?.message || "Impossible d'enregistrer votre choix pour le moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white px-4 py-10 sm:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            Étape 3 · Personnalisation de votre espace
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
            Qu’est-ce que tu veux publier ?
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
            Ce choix adapte les menus, les filtres statistiques et les rappels de droits dans votre tableau de bord. Vous pourrez le modifier à tout moment dans les paramètres.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 stagger">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selectedMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setSelectedMode(opt.mode)}
                className={`text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 flex flex-col justify-between cursor-pointer ${
                  active
                    ? 'bg-zinc-900 text-white border-rose-500 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/40 scale-[1.02] glow-rose'
                    : 'bg-zinc-900/70 text-zinc-200 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        active
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1.5">{opt.title}</h2>
                  <p className="text-xs leading-relaxed mb-4 text-zinc-300">
                    {opt.subtitle}
                  </p>
                </div>
                <ul className="space-y-2 text-xs pt-4 border-t border-zinc-800 text-zinc-300">
                  {opt.details.map((d, idx) => (
                    <li key={idx} className="leading-relaxed">
                      • {d}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-xs text-zinc-300">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Mode sélectionné : <strong className="text-white">{OPTIONS.find((o) => o.mode === selectedMode)?.title}</strong>.
              Aucune donnée existante n’est supprimée si vous changez ce réglage ultérieurement.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onSkipToCoach && (
              <button
                type="button"
                onClick={onSkipToCoach}
                className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Passer
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{saving ? 'Enregistrement…' : 'Continuer vers Mon Coach'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
