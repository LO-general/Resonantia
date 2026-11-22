import React from 'react';
import {
  X,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export type MetricDetailKey =
  | 'views'
  | 'likes_ratio'
  | 'comments_rate'
  | 'shares_rate'
  | 'followers'
  | 'global_engagement'
  | 'median_views'
  | 'avg_views';

interface MetricDetailModalProps {
  metricKey: MetricDetailKey | null;
  onClose: () => void;
  accountHandle?: string;
  accountFollowers?: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  totalVideos?: number;
  medianViews?: number;
  avgViews?: number;
  medianLikesRatio?: number;
  medianCommentsRatio?: number;
  medianSharesRatio?: number;
  medianEngagementRate?: number;
}

interface MetricMeta {
  title: string;
  badge: string;
  theme: 'emerald' | 'rose' | 'indigo' | 'amber' | 'purple' | 'cyan';
  icon: React.ComponentType<{ className?: string }>;
  measuredValue: string;
  secondaryValue?: string;
  formula: string;
  formulaRealNumbers: string;
  explanation: string;
  accountMedian: string;
  accountAverage: string;
  dataSource: string;
  algorithmicInsight: string;
  distinctionNote?: string;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({
  metricKey,
  onClose,
  accountHandle,
  accountFollowers = 0,
  totalViews = 0,
  totalLikes = 0,
  totalComments = 0,
  totalShares = 0,
  totalVideos = 0,
  medianViews,
  avgViews,
  medianLikesRatio,
  medianCommentsRatio,
  medianSharesRatio,
  medianEngagementRate,
}) => {
  if (!metricKey) return null;

  const hasViews = totalViews > 0;
  const hasVideos = totalVideos > 0;
  const computedAvgViews =
    typeof avgViews === 'number'
      ? avgViews
      : hasVideos
      ? Math.round(totalViews / totalVideos)
      : 0;
  const hasMedianViews = typeof medianViews === 'number';
  const likesToViewsConsolidated = hasViews
    ? ((totalLikes / totalViews) * 100).toFixed(2)
    : 'Non disponible';
  const commentsToViewsConsolidated = hasViews
    ? ((totalComments / totalViews) * 100).toFixed(3)
    : 'Non disponible';
  const sharesToViewsConsolidated = hasViews
    ? ((totalShares / totalViews) * 100).toFixed(3)
    : 'Non disponible';
  const totalInteractions = totalLikes + totalComments + totalShares;
  const engagementOnViews = hasViews
    ? ((totalInteractions / totalViews) * 100).toFixed(2)
    : 'Non disponible';
  const engagementOnFollowers =
    accountFollowers > 0 ? Math.round((totalInteractions / accountFollowers) * 100) : null;
  const reachToFollowerRatio =
    accountFollowers > 0 && hasViews
      ? (totalViews / accountFollowers).toFixed(1)
      : null;
  const handleLabel = accountHandle
    ? `@${accountHandle.replace('@', '')}`
    : 'votre compte connecté';

  const getMetricData = (key: MetricDetailKey): MetricMeta => {
    switch (key) {
      case 'views':
      case 'avg_views':
        return {
          title: 'Vues Globales Cumulées',
          badge: 'Diffusion Flux Pour Toi',
          theme: 'cyan',
          icon: Eye,
          measuredValue: hasVideos
            ? `${totalViews.toLocaleString('fr-FR')} vues`
            : 'Non disponible',
          secondaryValue: hasVideos
            ? `${totalVideos} vidéo${totalVideos > 1 ? 's' : ''} analysée${totalVideos > 1 ? 's' : ''} (moyenne : ${computedAvgViews.toLocaleString('fr-FR')} vues/vidéo)`
            : 'Aucune vidéo synchronisée pour le moment',
          formula: '∑ (video.view_count) sur la sélection active du compte',
          formulaRealNumbers: hasVideos
            ? `Somme sur ${totalVideos} vidéo(s) réelle(s) = ${totalViews.toLocaleString('fr-FR')} vues`
            : 'Aucune donnée collectée (0 vidéo)',
          explanation:
            "Une vue est comptabilisée par TikTok dès que la lecture démarre sur l'écran d'un spectateur. Ce compteur inclut les re-visionnages et ne doit jamais être confondu avec un nombre de spectateurs uniques.",
          accountMedian: hasMedianViews
            ? `${medianViews.toLocaleString('fr-FR')} vues par vidéo`
            : 'Non disponible',
          accountAverage: hasVideos
            ? `${computedAvgViews.toLocaleString('fr-FR')} vues par vidéo`
            : 'Non disponible',
          dataSource: 'API TikTok Officielle (/v2/video/list/ & relevés stockés)',
          algorithmicInsight:
            'TikTok distribue chaque publication par vagues successives en fonction des signaux observés auprès des premiers spectateurs exposés (temps de visionnage, complétion, partages, commentaires).',
          distinctionNote: reachToFollowerRatio
            ? `Avec ${accountFollowers.toLocaleString('fr-FR')} abonnés et ${totalViews.toLocaleString('fr-FR')} vues cumulées (ratio ${reachToFollowerRatio}×), la portée provient majoritairement de spectateurs non abonnés.`
            : undefined,
        };

      case 'median_views':
        return {
          title: 'Vues Médianes du Compte',
          badge: 'Représentativité Centrale Réelle',
          theme: 'amber',
          icon: BarChart2,
          measuredValue: hasMedianViews
            ? `${medianViews.toLocaleString('fr-FR')} vues`
            : 'Non disponible',
          secondaryValue: hasMedianViews
            ? `50% des ${totalVideos} vidéos dépassent ${medianViews.toLocaleString('fr-FR')} vues`
            : 'Synchronisez des publications pour calculer la médiane',
          formula: 'Valeur centrale de la série triée des vues du compte',
          formulaRealNumbers: hasMedianViews
            ? `Médiane sur ${totalVideos} vidéo(s) = ${medianViews.toLocaleString('fr-FR')} vues`
            : 'Non disponible',
          explanation:
            'La médiane mesure le niveau typique de vos publications sans être tirée artificiellement vers le haut par un ou deux pics viraux isolés, contrairement à la moyenne arithmétique.',
          accountMedian: hasMedianViews
            ? `${medianViews.toLocaleString('fr-FR')} vues`
            : 'Non disponible',
          accountAverage: hasVideos
            ? `${computedAvgViews.toLocaleString('fr-FR')} vues (sensible aux pics)`
            : 'Non disponible',
          dataSource: 'Calcul statistique sur vos vidéos synchronisées',
          algorithmicInsight:
            'Comparer chaque nouvelle sortie à votre propre médiane (plutôt qu’à une moyenne externe) permet de vérifier si votre palier habituel progresse réellement dans le temps.',
        };

      case 'likes_ratio':
        return {
          title: 'Ratio Likes / Vues',
          badge: 'Engagement Émotionnel Immédiat',
          theme: 'rose',
          icon: Heart,
          measuredValue: hasViews ? `${likesToViewsConsolidated}%` : 'Non disponible',
          secondaryValue: `${totalLikes.toLocaleString('fr-FR')} likes cumulés${
            typeof medianLikesRatio === 'number' ? ` · Médiane/vidéo : ${medianLikesRatio}%` : ''
          }`,
          formula: '(Total des Likes ÷ Total des Vues) × 100',
          formulaRealNumbers: hasViews
            ? `(${totalLikes.toLocaleString('fr-FR')} ÷ ${totalViews.toLocaleString('fr-FR')}) × 100 = ${likesToViewsConsolidated}%`
            : 'Division impossible sans vues mesurées',
          explanation:
            "Ce ratio mesure la part de vues générant un like. Il dépend fortement du cercle d'exposition : une vidéo poussée largement auprès d'une audience froide a souvent un taux de likes inférieur à une vidéo vue surtout par vos abonnés.",
          accountMedian:
            typeof medianLikesRatio === 'number'
              ? `${medianLikesRatio}% (médiane vidéo par vidéo)`
              : 'Non disponible',
          accountAverage: hasViews
            ? `${likesToViewsConsolidated}% (ratio global consolidé)`
            : 'Non disponible',
          dataSource: 'API TikTok Officielle (like_count / view_count)',
          algorithmicInsight:
            'Un ratio de likes plus modéré sur une vidéo très vue n’indique pas nécessairement un échec : analysez aussi les partages, commentaires et la portée absolue.',
        };

      case 'comments_rate':
        return {
          title: 'Taux de Commentaires / Vues',
          badge: 'Débat & Conversation Communautaire',
          theme: 'indigo',
          icon: MessageCircle,
          measuredValue: hasViews ? `${commentsToViewsConsolidated}%` : 'Non disponible',
          secondaryValue: `${totalComments.toLocaleString('fr-FR')} commentaires enregistrés`,
          formula: '(Total des Commentaires ÷ Total des Vues) × 100',
          formulaRealNumbers: hasViews
            ? `(${totalComments.toLocaleString('fr-FR')} ÷ ${totalViews.toLocaleString('fr-FR')}) × 100 = ${commentsToViewsConsolidated}%`
            : 'Division impossible sans vues mesurées',
          explanation:
            'Mesure la proportion de vues donnant lieu à un commentaire écrit, qui demande un engagement actif nettement supérieur à un simple like.',
          accountMedian:
            typeof medianCommentsRatio === 'number'
              ? `${medianCommentsRatio}% par vidéo`
              : 'Non disponible',
          accountAverage: hasViews ? `${commentsToViewsConsolidated}% (global)` : 'Non disponible',
          dataSource: 'API TikTok Officielle (comment_count)',
          algorithmicInsight:
            'Une question légitime liée au sujet de la vidéo encourage des réponses naturelles et prolonge l’activité autour de la publication.',
        };

      case 'shares_rate':
        return {
          title: 'Taux de Partages / Vues',
          badge: 'Viralité & Recommandation Externe',
          theme: 'emerald',
          icon: Share2,
          measuredValue: hasViews ? `${sharesToViewsConsolidated}%` : 'Non disponible',
          secondaryValue: `${totalShares.toLocaleString('fr-FR')} partages enregistrés`,
          formula: '(Total des Partages ÷ Total des Vues) × 100',
          formulaRealNumbers: hasViews
            ? `(${totalShares.toLocaleString('fr-FR')} ÷ ${totalViews.toLocaleString('fr-FR')}) × 100 = ${sharesToViewsConsolidated}%`
            : 'Division impossible sans vues mesurées',
          explanation:
            'Mesure la part de vues débouchant sur un envoi à un proche, une copie de lien ou un partage externe.',
          accountMedian:
            typeof medianSharesRatio === 'number'
              ? `${medianSharesRatio}% par vidéo`
              : 'Non disponible',
          accountAverage: hasViews ? `${sharesToViewsConsolidated}% (global)` : 'Non disponible',
          dataSource: 'API TikTok Officielle (share_count)',
          algorithmicInsight:
            'Le partage traduit une forte valeur sociale, émotionnelle ou utilitaire ; la comparaison à votre propre médiane aide à repérer les sujets les plus recommandables.',
        };

      case 'followers':
        return {
          title: 'Abonnés du Compte',
          badge: 'Audience Fidélisée Acquise',
          theme: 'amber',
          icon: Users,
          measuredValue: `${accountFollowers.toLocaleString('fr-FR')} abonnés`,
          secondaryValue: `Profil : ${handleLabel}`,
          formula: 'Compteur global retourné par le profil TikTok (user.info.stats)',
          formulaRealNumbers: `follower_count = ${accountFollowers.toLocaleString('fr-FR')}`,
          explanation: `Nombre total d'abonnés rattachés à ${handleLabel}. L'API TikTok video.list ne fournit pas l'attribution des nouveaux abonnés vidéo par vidéo.`,
          accountMedian: 'Compteur global de profil',
          accountAverage: `${accountFollowers.toLocaleString('fr-FR')} abonnés`,
          dataSource: 'API TikTok Officielle (/v2/user/info/)',
          algorithmicInsight:
            'Sur TikTok, la distribution dépend d’abord de la réaction des spectateurs exposés à chaque vidéo, puis de la clarté de votre promesse éditoriale pour convertir les visiteurs du profil.',
          distinctionNote: reachToFollowerRatio
            ? `Votre ratio vues cumulées / abonnés (${reachToFollowerRatio}×) illustre la distinction entre diffusion algorithmique et conversion en abonnés.`
            : undefined,
        };

      case 'global_engagement':
      default:
        return {
          title: 'Taux d’Engagement Global',
          badge: 'Synthèse Multi-Facteurs des Interactions',
          theme: 'purple',
          icon: Zap,
          measuredValue: hasViews ? `${engagementOnViews}% sur vues` : 'Non disponible',
          secondaryValue:
            engagementOnFollowers !== null
              ? `${engagementOnFollowers.toLocaleString('fr-FR')}% rapporté aux abonnés`
              : undefined,
          formula: '((Likes + Commentaires + Partages) ÷ Vues) × 100',
          formulaRealNumbers: hasViews
            ? `((${totalLikes.toLocaleString('fr-FR')} + ${totalComments.toLocaleString('fr-FR')} + ${totalShares.toLocaleString('fr-FR')}) ÷ ${totalViews.toLocaleString('fr-FR')}) × 100 = ${engagementOnViews}%`
            : 'Aucune vue mesurée pour calculer un taux',
          explanation:
            'Taux global consolidé calculé sur la somme des vues. Il se distingue de la moyenne vidéo par vidéo et de la médiane vidéo par vidéo (qui neutralise le poids d’une seule vidéo virale). Les favoris ne sont pas inclus par défaut car non fournis par video.list.',
          accountMedian:
            typeof medianEngagementRate === 'number'
              ? `${medianEngagementRate}% (médiane vidéo par vidéo)`
              : 'Non disponible',
          accountAverage: hasViews
            ? `${engagementOnViews}% (global consolidé)`
            : 'Non disponible',
          dataSource: 'Calcul consolidé sur vos vidéos synchronisées',
          algorithmicInsight:
            'Interprétez toujours ce taux par rapport à votre propre historique et à votre médiane vidéo par vidéo, sans présumer d’un seuil universel fixe.',
          distinctionNote:
            'Les calculs rapportés aux abonnés mélangent portée hors abonnés et base profil : gardez toujours les vues au dénominateur pour comparer deux vidéos.',
        };
    }
  };

  const meta = getMetricData(metricKey);
  const Icon = meta.icon;

  const getThemeStyles = (theme: MetricMeta['theme']) => {
    switch (theme) {
      case 'rose':
        return {
          glow: 'from-rose-500/30 via-pink-500/10 to-transparent',
          border: 'border-rose-500/40',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          text: 'text-rose-400',
          iconBg: 'bg-rose-500/20 text-rose-300',
        };
      case 'amber':
        return {
          glow: 'from-amber-500/30 via-orange-500/10 to-transparent',
          border: 'border-amber-500/40',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          text: 'text-amber-400',
          iconBg: 'bg-amber-500/20 text-amber-300',
        };
      case 'emerald':
        return {
          glow: 'from-emerald-500/30 via-teal-500/10 to-transparent',
          border: 'border-emerald-500/40',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          text: 'text-emerald-400',
          iconBg: 'bg-emerald-500/20 text-emerald-300',
        };
      case 'indigo':
        return {
          glow: 'from-indigo-500/30 via-blue-500/10 to-transparent',
          border: 'border-indigo-500/40',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          text: 'text-indigo-400',
          iconBg: 'bg-indigo-500/20 text-indigo-300',
        };
      case 'cyan':
        return {
          glow: 'from-cyan-500/30 via-blue-500/10 to-transparent',
          border: 'border-cyan-500/40',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          text: 'text-cyan-400',
          iconBg: 'bg-cyan-500/20 text-cyan-300',
        };
      case 'purple':
      default:
        return {
          glow: 'from-purple-500/30 via-violet-500/10 to-transparent',
          border: 'border-purple-500/40',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          text: 'text-purple-400',
          iconBg: 'bg-purple-500/20 text-purple-300',
        };
    }
  };

  const style = getThemeStyles(meta.theme);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl bg-zinc-900 border ${style.border} rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top subtle ambient glow line */}
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${style.glow}`} />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center font-bold shadow-md`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${style.badge}`}>
                  {meta.badge}
                </span>
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Officiel TikTok</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                {meta.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Measured Value Highlight Box */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Valeur mesurée sur votre compte
            </span>
            <div className={`text-3xl sm:text-4xl font-black ${style.text} mt-1`}>
              {meta.measuredValue}
            </div>
            {meta.secondaryValue && (
              <p className="text-xs text-zinc-400 mt-1 font-medium">{meta.secondaryValue}</p>
            )}
          </div>

          <div className="sm:text-right space-y-1 pl-4 sm:border-l border-zinc-800">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Historique de votre compte
            </span>
            <div className="text-xs text-zinc-300 font-mono">
              Médiane : <strong className="text-white">{meta.accountMedian}</strong>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Moyenne : <strong className="text-zinc-300">{meta.accountAverage}</strong>
            </div>
          </div>
        </div>

        {/* Certified Mathematical Formula */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-rose-400" />
            <span>Formule mathématique certifiée</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-2 font-mono text-xs">
            <div className="text-zinc-400 font-semibold">{meta.formula}</div>
            <div className="text-emerald-400 font-bold bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800">
              {meta.formulaRealNumbers}
            </div>
          </div>
        </div>

        {/* Plain explanation */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Explication vulgarisée : que signifie ce chiffre ?
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
            {meta.explanation}
          </p>
        </div>

        {/* Algorithmic mechanism (Official Docs) */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Mécanisme algorithmique TikTok (Documentation officielle)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
            {meta.algorithmicInsight}
          </p>
        </div>

        {/* Distinction note if available */}
        {meta.distinctionNote && (
          <div className="bg-amber-950/20 border border-amber-600/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Attention méthodologique : </span>
              {meta.distinctionNote}
            </div>
          </div>
        )}

        {/* Modal Footer / Source */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">Source :</span>
            <span className="font-mono text-zinc-300">{meta.dataSource}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition cursor-pointer self-end sm:self-auto"
          >
            Fermer la fiche
          </button>
        </div>
      </div>
    </div>
  );
};
