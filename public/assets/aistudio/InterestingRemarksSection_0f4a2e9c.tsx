import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  FlaskConical,
  AlertCircle,
  Compass,
  ExternalLink,
  Scale,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  InterestingRemarkCategory,
  InterestingRemarkDimension,
  InterestingRemarkItem,
} from '../types';

interface InterestingRemarksSectionProps {
  remarks: InterestingRemarkItem[];
  sampleSize: number;
  accountHandle: string;
}

const CATEGORY_STYLE: Record<
  InterestingRemarkCategory,
  { accentText: string; border: string; bgTint: string }
> = {
  high_views_low_likes: {
    accentText: 'text-cyan-300',
    border: 'border-cyan-500/35',
    bgTint: 'bg-cyan-950/20',
  },
  high_shares: {
    accentText: 'text-emerald-300',
    border: 'border-emerald-500/35',
    bgTint: 'bg-emerald-950/20',
  },
  high_comments: {
    accentText: 'text-indigo-300',
    border: 'border-indigo-500/35',
    bgTint: 'bg-indigo-950/20',
  },
  low_views_high_interaction: {
    accentText: 'text-amber-300',
    border: 'border-amber-500/35',
    bgTint: 'bg-amber-950/20',
  },
  positive_outlier: {
    accentText: 'text-rose-300',
    border: 'border-rose-500/35',
    bgTint: 'bg-rose-950/20',
  },
  counter_intuitive: {
    accentText: 'text-purple-300',
    border: 'border-purple-500/35',
    bgTint: 'bg-purple-950/20',
  },
};

const DIMENSION_STYLE: Record<InterestingRemarkDimension, string> = {
  Portée: 'text-cyan-300 border-cyan-500/30 bg-cyan-950/40',
  Interaction: 'text-rose-300 border-rose-500/30 bg-rose-950/40',
  Conversion: 'text-amber-300 border-amber-500/30 bg-amber-950/40',
  'Valeur stratégique': 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40',
};

export const InterestingRemarksSection: React.FC<InterestingRemarksSectionProps> = ({
  remarks,
  sampleSize,
  accountHandle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | InterestingRemarkCategory>('all');

  const visibleRemarks =
    selectedCategory === 'all'
      ? remarks
      : remarks.filter((r) => r.category === selectedCategory);

  return (
    <section
      id="remarque-interessante"
      className="bg-zinc-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-zinc-800">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Lecture Stratégique Multi-Dimensionnelle &bull; {accountHandle}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Remarque intéressante
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Détection automatique de phénomènes notables dans vos <strong>{sampleSize}</strong> publications réelles, comparés exclusivement à votre propre historique (médianes et quantiles du compte) pour comprendre comment une vidéo contribue à votre progression au-delà du simple compteur de likes.
          </p>
        </div>

        {/* Filter selector when multiple remarks exist */}
        {remarks.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Toutes ({remarks.length})
            </button>
            {remarks.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedCategory(r.category)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                  selectedCategory === r.category
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {r.categoryLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4 Dimensions Framework Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>1. Portée</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Volume de vues distribuées. Rappel : <strong>vues &ne; spectateurs uniques</strong> (les lectures répétées s’ajoutent au total).
          </p>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="font-bold text-rose-300 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            <span>2. Interaction</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Likes, commentaires et partages rapportés aux vues. Un faible taux de likes n’annule pas un fort signal de partage ou de discussion.
          </p>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>3. Conversion</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Abonnements et visites de profil. L’API <code className="text-zinc-300">video.list</code> ne les attribue pas vidéo par vidéo (donnée profil global uniquement).
          </p>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>4. Valeur stratégique</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Rôle de la vidéo pour le compte : porte d’entrée découverte, bouche-à-oreille ou ancrage communautaire.
          </p>
        </div>
      </div>

      {/* Methodological Rule Notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
        <Scale className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-200">Rigueur d’interprétation :</strong> Les remarques ci-dessous signalent des écarts statistiques observés dans vos données réelles. Une association observée n’est jamais présentée comme une causalité certaine : chaque remarque distingue le fait chiffré, son interprétation prudente et le test à mener pour valider l’hypothèse.
        </p>
      </div>

      {/* Remarks List or Honest Empty State */}
      {visibleRemarks.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center space-y-2">
          <Info className="w-8 h-8 text-zinc-500 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-200">
            Aucun phénomène atypique qualifié détecté sur cet échantillon
          </h4>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
            {sampleSize < 5
              ? `Le Coach exige au moins 5 publications synchronisées avec des vues pour calculer les médianes de référence de votre compte (${sampleSize} actuellement).`
              : 'Vos publications actuelles restent homogènes autour de vos médianes de référence, sans anomalie statistique marquante à signaler pour cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleRemarks.map((remark, idx) => {
            const theme = CATEGORY_STYLE[remark.category];
            return (
              <article
                key={remark.id}
                className={`rounded-2xl border ${theme.border} ${theme.bgTint} p-5 sm:p-6 space-y-4 transition`}
              >
                {/* Remark Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`font-black uppercase tracking-wider ${theme.accentText}`}>
                        Remarque #{idx + 1} &bull; {remark.categoryLabel}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                      {remark.title}
                    </h4>
                  </div>

                  {/* Dimensions Impacted */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {remark.dimensionsImpacted.map((dim) => (
                      <span
                        key={dim}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${DIMENSION_STYLE[dim]}`}
                      >
                        {dim}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Numeric Baseline Comparison Strip */}
                {remark.baselineComparisons.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {remark.baselineComparisons.map((comp, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {comp.label}
                          </div>
                          <div className="text-sm font-black text-white font-mono tabular-nums mt-0.5">
                            {comp.videoValue}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-zinc-400 font-mono tabular-nums">
                          {comp.accountBaseline}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Structured 3/4-Part Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                  <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                      1. Observation statistique
                    </div>
                    <p className="text-zinc-200 leading-relaxed text-[12px]">
                      {remark.statisticalObservation}
                    </p>
                  </div>

                  <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                      2. Explication (Portée / Interaction / Mécanisme)
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-[12px]">
                      {remark.explanation}
                    </p>
                  </div>

                  <div className="bg-zinc-950/90 border border-emerald-500/25 rounded-xl p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      3. Intérêt stratégique pour votre compte
                    </div>
                    <p className="text-zinc-200 leading-relaxed text-[12px]">
                      {remark.strategicInterest}
                    </p>
                  </div>

                  {remark.experimentIdea && (
                    <div className="bg-zinc-950/90 border border-amber-500/25 rounded-xl p-4 space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>4. Piste d’expérimentation (optionnelle)</span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed text-[12px]">
                        {remark.experimentIdea}
                      </p>
                    </div>
                  )}
                </div>

                {/* Real Video Examples Detected */}
                {remark.featuredVideos.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/70 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Vidéos réelles illustrant ce phénomène :
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                      {remark.featuredVideos.map((vid) => (
                        <div
                          key={vid.id}
                          className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 space-y-1.5 text-[11px]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-zinc-200 line-clamp-1">
                              {vid.title}
                            </span>
                            {vid.shareUrl && (
                              <a
                                href={vid.shareUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-400 hover:text-white shrink-0"
                                title="Voir sur TikTok"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono tabular-nums text-zinc-400">
                            <span className="text-cyan-300 font-bold">
                              {vid.views.toLocaleString('fr-FR')} vues
                            </span>
                            <span className="text-rose-300">
                              {vid.likes} likes ({vid.likeRate}%)
                            </span>
                            <span className="text-indigo-300 flex items-center gap-0.5">
                              <MessageCircle className="w-2.5 h-2.5" />
                              {vid.comments} ({vid.commentRate}%)
                            </span>
                            <span className="text-emerald-300 flex items-center gap-0.5">
                              <Share2 className="w-2.5 h-2.5" />
                              {vid.shares} ({vid.shareRate}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Honest Data Limits Footer */}
                <div className="flex items-start gap-2 text-[11px] text-zinc-400 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3.5 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span>{remark.dataLimitsNote}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
