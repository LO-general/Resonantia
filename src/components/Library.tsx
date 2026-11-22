import React, { useState } from 'react';
import {
  FolderKanban,
  Film,
  Search,
  Copy,
  Trash2,
  Edit,
  Calendar,
} from 'lucide-react';
import { ContentItem } from '../types';
import { AnimatedNumber, PageHeader, Reveal } from './ui';

interface LibraryProps {
  contentItems: ContentItem[];
  onOpenContentItem: (item: ContentItem) => void;
  onDeleteContentItem: (id: string) => void;
}

export const Library: React.FC<LibraryProps> = ({
  contentItems,
  onOpenContentItem,
  onDeleteContentItem,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter items
  const filteredItems = contentItems.filter((item) => {
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        (item.caption && item.caption.toLowerCase().includes(q)) ||
        (item.hashtags && item.hashtags.some((h) => h.toLowerCase().includes(q))) ||
        (item.analysis?.subject && item.analysis.subject.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal>
        <PageHeader
          eyebrow="Médiathèque centrale"
          title="Ta bibliothèque de contenus"
          subtitle="Tous tes montages, légendes générées et publications au même endroit."
          icon={FolderKanban}
          accent="teal"
          right={
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-6 py-3 text-center">
              <div className="text-3xl font-black text-teal-300">
                <AnimatedNumber value={contentItems.length} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Vidéos</div>
            </div>
          }
        />
      </Reveal>

      {/* Filters and search bar */}
      <div className="surface p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, légende, hashtag, sujet..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/60 transition"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Filters pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl text-xs font-semibold text-zinc-400 border border-zinc-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-zinc-800 text-white shadow-xs' : 'hover:text-white'
              }`}
            >
              Toutes ({contentItems.length})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'scheduled' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 shadow-xs' : 'hover:text-white'
              }`}
            >
              Planifiées
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'published' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-xs' : 'hover:text-white'
              }`}
            >
              Publiées
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'draft' ? 'bg-zinc-800 text-white shadow-xs' : 'hover:text-white'
              }`}
            >
              Brouillons
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Library Items */}
      {filteredItems.length === 0 ? (
        <div className="surface p-12 text-center">
          <FolderKanban className="w-10 h-10 text-zinc-600 mx-auto mb-2 float-slow" />
          <h4 className="text-base font-bold text-white">Rien par ici… pour l’instant</h4>
          <p className="text-xs text-zinc-400 mt-1">
            Change ta recherche ou tes filtres.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <Reveal key={item.id} index={idx % 6}>
            <div
              className="surface surface-hover h-full overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Visual Header */}
                <div
                  className="relative aspect-[16/10] bg-zinc-950 overflow-hidden cursor-pointer"
                  onClick={() => onOpenContentItem(item)}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Film className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-600 to-amber-500 text-white flex items-center gap-1 shadow-md">
                    <Film className="w-3 h-3" />
                    Création Vidéo
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {item.scheduledDate} &bull; {item.scheduledTime}
                    </span>
                    <span
                      className={`font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                        item.status === 'published'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          : item.status === 'scheduled'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {item.status === 'published' ? 'Publié' : item.status === 'scheduled' ? 'Planifié' : 'Brouillon'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-rose-400 transition">
                    {item.title}
                  </h3>

                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {item.caption || 'Sans légende définie'}
                  </p>

                  {/* Hashtags */}
                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-950 text-zinc-400 border border-zinc-800 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-zinc-950/70 border-t border-zinc-800/80 flex items-center justify-between">
                <button
                  onClick={() => onOpenContentItem(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Détails &amp; Édition</span>
                </button>

                <div className="flex items-center gap-1">
                  {item.caption && (
                    <button
                      onClick={() => handleCopy(item.id, `${item.caption}\n\n${item.hashtags?.join(' ') || ''}`)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer transition"
                      title={copiedId === item.id ? 'Copié !' : 'Copier texte'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteContentItem(item.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 cursor-pointer transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
};
