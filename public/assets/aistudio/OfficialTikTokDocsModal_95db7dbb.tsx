import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Brain,
  Sparkles,
  X,
  Target,
} from 'lucide-react';
import {
  TIKTOK_OFFICIAL_DOCS,
  TikTokOfficialDocSource,
  searchOfficialDocs,
  getDocsByCategory,
} from '../utils/tiktokOfficialDocsEngine';

interface OfficialTikTokDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const OfficialTikTokDocsModal: React.FC<OfficialTikTokDocsModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [selectedDoc, setSelectedDoc] = useState<TikTokOfficialDocSource | null>(null);

  if (!isOpen) return null;

  const categories = [
    'Toutes',
    'Distribution & Recommandation',
    'Creator Search Insights & SEO',
    'Formats & Durées',
    'Création & Contenu',
    'Communauté & Sécurité',
  ];

  const filteredDocs = searchOfficialDocs(searchQuery).filter(
    (d) => selectedCategory === 'Toutes' || d.category === selectedCategory
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn font-sans"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between gap-4 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center font-bold text-sm">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  Base Documentaire Officielle TikTok
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  100% Sources Certifiées
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Support, Newsroom, Creator Academy, Creative Center &middot; Règle d'or : aucune théorie non officielle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 sm:p-6 border-b border-zinc-800/60 bg-zinc-900/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une règle, un mécanisme officiel (ex: rétention, SEO, formats, musique)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-zinc-100 text-zinc-950 shadow-xs'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-4 transition shadow-xs"
            >
              {/* Doc Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-900 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-lg text-[11px]">
                    {doc.sourceName}
                  </span>
                  <span className="text-zinc-400 font-medium">{doc.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-500 font-mono">{doc.lastUpdated}</span>
                  <a
                    href={doc.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 underline underline-offset-4"
                  >
                    <span>Lien officiel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Title & Official Excerpt */}
              <div>
                <h4 className="text-base font-extrabold text-white">{doc.title}</h4>
                <div className="bg-zinc-900/80 rounded-xl p-3.5 border border-zinc-800/80 mt-2 text-xs text-zinc-300 italic leading-relaxed">
                  « {doc.officialExcerpt} »
                </div>
              </div>

              {/* 3 Epistemological Levels (Section 2 Requirements) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Level 1: Ce que TikTok confirme officiellement */}
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmé officiellement</span>
                  </div>
                  <ul className="space-y-1 text-emerald-200 text-[11px] pl-3 list-disc">
                    {doc.confirmedByTikTok.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Level 2: Ce que les données de votre compte observent */}
                <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-400 text-[11px] uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Observé sur votre compte</span>
                  </div>
                  <ul className="space-y-1 text-indigo-200 text-[11px] pl-3 list-disc">
                    {(doc.observedByAccountData || ['Cohérence validée avec vos publications réelles.']).map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>

                {/* Level 3: Ce qui reste inconnu ou non documenté */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-400 text-[11px] uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Inconnu / Non documenté</span>
                  </div>
                  <ul className="space-y-1 text-zinc-400 text-[11px] pl-3 list-disc">
                    {doc.unknownOrUndocumented.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Creator Implication */}
              <div className="bg-rose-950/20 border border-rose-600/30 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2">
                <Target className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300">Conséquence pratique pour votre compte : </span>
                  <span>{doc.creatorImplication}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center py-10 space-y-2 text-zinc-500 text-xs">
              <p>Aucune documentation trouvée pour « {searchQuery} ».</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-rose-400 underline font-semibold"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fermer la documentation
          </button>
        </div>
      </div>
    </div>
  );
};
