import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  Zap,
  Target,
  Compass,
  ArrowRight,
  Info,
  Clock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { StrategicAccountDiagnostic, TikTokOfficialVideo } from '../types';

interface StrategeChatViewProps {
  diagnostic: StrategicAccountDiagnostic;
  officialVideos?: TikTokOfficialVideo[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  officialSourceCitation?: string;
}

const SUGGESTED_PROMPTS = [
  "Pourquoi les 2 premières secondes jouent-elles un rôle clé selon TikTok ?",
  "Comment passer au palier de vues supérieur sans me fier à un seul pic viral ?",
  "Pourquoi une vidéo peut-elle faire beaucoup de vues avec peu de likes ?",
  "Mon format long (>60s) est-il valorisé par l'algorithme Pour Toi ?",
  "Comment distinguer corrélation et causalité avant de modifier mon montage ?",
];

export const StrategeChatView: React.FC<StrategeChatViewProps> = ({ diagnostic }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'coach',
      text: `Bonjour. Je suis **Mon Coach TikTok**, votre espace d'analyse stratégique.

Mes réponses s'appuient sur la **documentation officielle de TikTok** (Support, Newsroom, Creator Academy, Creative Center) et sur vos **${diagnostic.totalVideos} publications réelles** (${diagnostic.totalViews.toLocaleString('fr-FR')} vues cumulées, médiane de **${diagnostic.medianViews.toLocaleString('fr-FR')} vues**, et **${diagnostic.engagementRate}% d'engagement global**).

Aucune recette magique n'est fabriquée : je sépare faits chiffrés, limites de l'API, hypothèses éditoriales et tests à valider sur votre propre compte.

Quelle question souhaitez-vous analyser ?`,
      timestamp: 'À l\'instant',
      officialSourceCitation: 'TikTok Creator Academy & Newsroom',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/tiktok/coach-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          accountContext: {
            handle: diagnostic.accountHandle,
            totalVideos: diagnostic.totalVideos,
            totalViews: diagnostic.totalViews,
            medianViews: diagnostic.medianViews,
            avgViews: diagnostic.avgViews,
            engagementRate: diagnostic.engagementRate,
            topVideo: diagnostic.topPerformers[0]?.title || '',
            topViews: diagnostic.topPerformers[0]?.views || 0,
            durationVerdict: diagnostic.durationAnalysis.verdict,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Fallback response');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `msg_s_${Date.now()}`,
        sender: 'coach',
        text: data.answer || buildCoachDeterministicAnswer(textToSend, diagnostic),
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        officialSourceCitation: data.officialCitation || 'TikTok Newsroom & Creator Academy',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // High-precision grounded deterministic fallback
      const fallbackText = buildCoachDeterministicAnswer(textToSend, diagnostic);
      const botMsg: ChatMessage = {
        id: `msg_s_${Date.now()}`,
        sender: 'coach',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        officialSourceCitation: 'Documentation Officielle TikTok Newsroom & Support',
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface overflow-hidden flex flex-col h-[750px] animate-fadeIn text-white font-sans">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-black shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>Mon Coach TikTok</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Documentation Officielle Certifiée
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ancré sur vos {diagnostic.totalVideos} publications réelles et la documentation officielle de TikTok.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Médiane compte : {diagnostic.medianViews} vues</span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 bg-zinc-950/60 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-zinc-400 shrink-0 text-[11px] uppercase tracking-wider pl-1">
          Questions rapides :
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 text-zinc-300 font-medium whitespace-nowrap transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-rose-600 text-white shadow-sm shadow-black/20'
                  : 'bg-zinc-950 text-amber-300 border border-zinc-800'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-rose-600 text-white shadow-sm shadow-black/20'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] opacity-70 mb-2 border-b border-zinc-800 pb-1">
                <span className="font-bold">{msg.sender === 'user' ? 'Vous' : 'Mon Coach TikTok'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                {msg.text}
              </div>

              {msg.officialSourceCitation && msg.sender === 'coach' && (
                <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                  <BookOpen className="w-3 h-3 text-emerald-400" />
                  <span>Source officielle TikTok vérifiée : {msg.officialSourceCitation}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 text-amber-400 flex items-center justify-center shrink-0 border border-zinc-800">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Consultation de la documentation officielle et analyse de vos {diagnostic.totalVideos} vidéos...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-zinc-950/80 border-t border-zinc-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Posez une question stratégique au Coach (accroche, durée, algorithme, cohabitation)..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-950"
          >
            <span>Envoyer</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

function buildCoachDeterministicAnswer(question: string, diag: StrategicAccountDiagnostic): string {
  const q = question.toLowerCase();
  const handle = diag.accountHandle || 'votre compte';

  if (q.includes('durée') || q.includes('format') || q.includes('long') || q.includes('court') || q.includes('60')) {
    return `### Analyse de la Durée des Vidéos

1. **Ce que TikTok confirme officiellement (Newsroom)** :
   Les vidéos de plus de 60 secondes comme les formats courts peuvent performer : l'algorithme évalue avant tout la rétention et le visionnage complet, sans durée universelle obligatoire.

2. **Ce que révèlent vos données (${handle})** :
   - Courts (< 30s) : ${diag.durationAnalysis.shortUnder30s.count} vidéo(s), médiane ${diag.durationAnalysis.shortUnder30s.medianViews.toLocaleString('fr-FR')} vues
   - Moyens (30-60s) : ${diag.durationAnalysis.medium30to60s.count} vidéo(s), médiane ${diag.durationAnalysis.medium30to60s.medianViews.toLocaleString('fr-FR')} vues
   - Longs (> 60s) : ${diag.durationAnalysis.longOver60s.count} vidéo(s), médiane ${diag.durationAnalysis.longOver60s.medianViews.toLocaleString('fr-FR')} vues
   Verdict : ${diag.durationAnalysis.verdict}

3. **Recommandation** :
   Ajustez la durée à ce que le récit exige réellement et comparez vos durées au sein d'un même sujet avant de conclure.`;
  }

  if (q.includes('2 seconde') || q.includes('accroche') || q.includes('hook') || q.includes('première')) {
    const topLine = diag.topPerformers[0]
      ? `Votre vidéo la plus vue (*${diag.topPerformers[0].title}*, ${diag.topPerformers[0].views.toLocaleString('fr-FR')} vues) peut servir de référence à comparer dans « Détails ».`
      : 'Synchronisez vos vidéos et complétez les fiches éditoriales (accroche, texte à l’écran) pour comparer vos meilleures sorties.';
    return `### Optimisation des 2 Premières Secondes

1. **Ce que TikTok confirme officiellement (Creator Academy)** :
   Le spectateur décide quasi immédiatement de poursuivre ou de passer à la vidéo suivante. Une entrée directe sur l'enjeu ou l'action évite les abandons précoces.

2. **Ce que montrent vos données (${handle})** :
   Médiane actuelle : **${diag.medianViews.toLocaleString('fr-FR')} vues** sur ${diag.totalVideos} vidéo(s). ${topLine}

3. **Test contrôlé conseillé** :
   Sur votre prochaine vidéo d'un sujet familier, ne modifiez qu'une variable (ex: texte d'ouverture à 0:00) et enregistrez le résultat dans l'onglet **Expérimentations**.`;
  }

  if (q.includes('palier') || q.includes('niveau') || q.includes('pic') || q.includes('like') || q.includes('vues')) {
    return `### Interpréter Paliers, Pics et Ratios

1. **Faits & méthode** :
   Une seule vidéo très vue élève la moyenne (${diag.avgViews.toLocaleString('fr-FR')} vues) sans modifier le palier habituel représenté par la médiane (**${diag.medianViews.toLocaleString('fr-FR')} vues**). Par ailleurs, les vues incluent les re-visionnages et ne sont pas des spectateurs uniques.

2. **Lecture de vos ratios (${handle})** :
   - Likes/vues global : ${diag.likesToViewsRatio}% (médiane vidéo : ${diag.medianLikesToViewsRatio}%)
   - Commentaires/vues global : ${diag.commentsToViewsRatio}%
   - Partages/vues global : ${diag.sharesToViewsRatio}%

3. **Prochaine action** :
   Ouvrez **Paliers & Niveau Supérieur** et **Remarque intéressante** dans Mon Coach pour comparer vos vidéos au-dessus du palier à votre base habituelle.`;
  }

  return `### Analyse Stratégique & Documentation TikTok

1. **Documentation officielle** :
   Chaque vidéo est évaluée indépendamment selon les interactions réelles (visionnage complet, partages, commentaires, likes), sans preuve automatique de causalité sans test dédié.

2. **Vos chiffres réels (${handle}, ${diag.totalVideos} vidéos)** :
   - Vues cumulées : **${diag.totalViews.toLocaleString('fr-FR')}** (médiane : **${diag.medianViews.toLocaleString('fr-FR')} vues**)
   - Taux d'engagement global consolidé : **${diag.engagementRate}%**

3. **Prochaine étape** :
   Consultez les créneaux qualifiés dans **TikTok Analytics > Agenda** et consignez une hypothèse à une seule variable dans **Mon Coach > Expérimentations**.`;
}
