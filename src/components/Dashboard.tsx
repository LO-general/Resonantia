import React, { useMemo } from 'react';
import {
  Film,
  Calendar,
  Clock,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Flame,
  BarChart3,
  Compass,
  Eye,
  FileText,
} from 'lucide-react';
import { ContentItem, ActiveTab } from '../types';
import { AnimatedNumber, BarChart, ProgressRing, Reveal } from './ui';

interface DashboardProps {
  contentItems: ContentItem[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenContentItem: (item: ContentItem) => void;
}

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const Dashboard: React.FC<DashboardProps> = ({ contentItems, onNavigateTab, onOpenContentItem }) => {
  const totalSavedVideos = contentItems.length;
  const scheduledPublications = contentItems.filter((i) => i.status === 'scheduled').length;
  const publishedPublications = contentItems.filter((i) => i.status === 'published').length;
  const draftPublications = contentItems.filter((i) => i.status === 'draft').length;

  const upcomingContents = contentItems
    .filter((i) => i.status === 'scheduled')
    .sort((a, b) => `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime}`));
  const topUpcoming = upcomingContents.slice(0, 5);

  const formatUpcomingLabel = (dateStr: string, timeStr: string) => {
    const today = toLocalDateStr(new Date());
    const tomorrow = toLocalDateStr(new Date(Date.now() + 86400000));
    if (dateStr === today) return `Aujourd'hui à ${timeStr}`;
    if (dateStr === tomorrow) return `Demain à ${timeStr}`;
    const date = new Date(`${dateStr}T12:00:00`);
    return `${date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à ${timeStr}`;
  };

  // Données réelles uniquement : publications programmées sur les 14 prochains jours.
  const next14 = useMemo(() => {
    const days: Array<{ label: string; value: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const key = toLocalDateStr(d);
      days.push({
        label: i === 0 ? 'Auj.' : d.toLocaleDateString('fr-FR', { weekday: 'narrow' }),
        value: contentItems.filter((c) => c.status === 'scheduled' && c.scheduledDate === key).length,
      });
    }
    return days;
  }, [contentItems]);
  const hasPlanning = next14.some((d) => d.value > 0);
  const publishRate = totalSavedVideos > 0 ? Math.round((publishedPublications / totalSavedVideos) * 100) : 0;

  const metrics = [
    { tab: 'library' as ActiveTab, value: totalSavedVideos, label: 'Bibliothèque', hint: 'Montages sauvegardés', icon: Film, color: 'rose', border: 'hover:border-rose-400/70', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/40', text: 'text-rose-300', glow: 'from-rose-500/20' },
    { tab: 'calendar' as ActiveTab, value: scheduledPublications, label: 'Programmées', hint: "En file d'attente", icon: Clock, color: 'amber', border: 'hover:border-amber-400/70', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40', text: 'text-amber-300', glow: 'from-amber-500/20' },
    { tab: 'analytics' as ActiveTab, value: publishedPublications, label: 'En ligne', hint: 'Publiées sur TikTok', icon: CheckCircle2, color: 'emerald', border: 'hover:border-emerald-400/70', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', text: 'text-emerald-300', glow: 'from-emerald-500/20' },
    { tab: 'library' as ActiveTab, value: draftPublications, label: 'Brouillons', hint: 'Prêts pour analyse', icon: FileText, color: 'indigo', border: 'hover:border-indigo-400/70', chip: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40', text: 'text-indigo-300', glow: 'from-indigo-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Reveal>
        <div className="surface relative overflow-hidden p-6 sm:p-10">
          <div className="pointer-events-none absolute -left-10 -top-16 h-72 w-72 rounded-full bg-rose-600/25 blur-3xl float-slow" />
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-1/3 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl float-slow" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                <span className="live-dot" />
                <span>Studio TikTok · Comprendre avant de réussir</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white text-balance sm:text-5xl">
                Ton espace créateur,
                <br />
                <span className="gradient-text">vivant et pilotable.</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Un parcours en 3 temps : <strong className="text-white">Re-build</strong>,{' '}
                <strong className="text-white">Internet avant de performer</strong>, puis{' '}
                <strong className="text-white">Mon Coach</strong> avec tes vraies données.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button onClick={() => onNavigateTab('vision')} className="btn-brand inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
                  <Compass className="h-4 w-4" />
                  <span>Étape 1 : Re-build</span>
                </button>
                <button onClick={() => onNavigateTab('comprendre')} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-sm font-bold text-indigo-200 hover:bg-indigo-500/25">
                  <Eye className="h-4 w-4" />
                  <span>Étape 2 : Internet</span>
                </button>
                <button onClick={() => onNavigateTab('coach')} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:brightness-110">
                  <Sparkles className="h-4 w-4" />
                  <span>Mon Coach</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => onNavigateTab('visionnaire')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20">
                  <Eye className="h-3.5 w-3.5 text-amber-300" />
                  <span>Visionnaire</span>
                </button>
                <button onClick={() => onNavigateTab('analytics')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Analytics</span>
                </button>
              </div>
            </div>

            {/* Anneau : part de vidéos publiées */}
            <div className="flex items-center gap-5 self-start rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 lg:self-center">
              <ProgressRing percent={publishRate} size={96} stroke={9}>
                <AnimatedNumber value={publishRate} suffix="%" />
              </ProgressRing>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Mises en ligne</div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {publishedPublications} sur {totalSavedVideos}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">de ta bibliothèque</div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 4 CHIFFRES CLÉS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <Reveal key={m.label} index={i}>
              <div
                onClick={() => onNavigateTab(m.tab)}
                className={`surface surface-hover group relative h-full cursor-pointer overflow-hidden p-5 ${m.border}`}
              >
                <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${m.glow} to-transparent blur-2xl`} />
                <div className="relative flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition group-hover:scale-110 group-hover:-rotate-6 ${m.chip}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
                <div className="relative mt-4 text-4xl font-black tracking-tight text-white">
                  <AnimatedNumber value={m.value} />
                </div>
                <div className={`relative mt-1 text-[11px] font-bold uppercase tracking-wider ${m.text}`}>{m.label}</div>
                <div className="relative mt-0.5 text-[11px] text-zinc-500">{m.hint}</div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* PROCHAINES PUBLICATIONS */}
        <Reveal className="lg:col-span-7">
          <div className="surface h-full space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300">
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-white">Prochaines publications</h2>
              </div>
              <button onClick={() => onNavigateTab('calendar')} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300">
                <span>Calendrier</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {topUpcoming.length === 0 ? (
              <div className="space-y-2 py-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-zinc-600 float-slow" />
                <p className="text-sm font-semibold text-zinc-300">Rien de programmé</p>
                <p className="mx-auto max-w-sm text-xs text-zinc-500">Programme une vidéo : elle apparaîtra ici.</p>
              </div>
            ) : (
              <div className="stagger divide-y divide-zinc-800/80">
                {topUpcoming.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between gap-4 py-3.5">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 text-rose-400 transition group-hover:border-rose-500/50 group-hover:bg-rose-500/10">
                        <Film className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-amber-300">{formatUpcomingLabel(item.scheduledDate, item.scheduledTime)}</span>
                        <h4 className="mt-0.5 truncate text-sm font-bold text-white">{item.title}</h4>
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{item.caption || 'Sans légende définie'}</p>
                      </div>
                    </div>
                    <button onClick={() => onOpenContentItem(item)} className="shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-bold text-white hover:border-rose-500/60 hover:bg-zinc-700">
                      Détails
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* RYTHME + RACCOURCIS */}
        <div className="space-y-6 lg:col-span-5">
          <Reveal index={1}>
            <div className="surface space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                <Flame className="h-4 w-4 text-orange-400" />
                <span>Ton rythme · 14 prochains jours</span>
              </div>
              {hasPlanning ? (
                <BarChart data={next14} from="#6366f1" to="#fbbf24" height={110} formatValue={(v) => `${v} vidéo${v > 1 ? 's' : ''}`} />
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
                  Aucune publication planifiée : le graphique se remplit dès que tu programmes.
                </p>
              )}
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Calculé uniquement sur tes propres programmations. Les meilleurs créneaux sont dans Analytics.
              </p>
              <button onClick={() => onNavigateTab('analytics')} className="btn-brand flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs">
                <Calendar className="h-4 w-4" />
                <span>Ouvrir l&apos;agenda Analytics</span>
              </button>
            </div>
          </Reveal>

          <Reveal index={2}>
            <div className="surface space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Compass className="h-4 w-4 text-indigo-400" />
                <span>Outils stratégiques</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onNavigateTab('music-advisor')} className="cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/20">
                  Conseiller Musical
                </button>
                <button onClick={() => onNavigateTab('comprendre-tiktok')} className="cursor-pointer rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
                  Guide &amp; Règles
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};
