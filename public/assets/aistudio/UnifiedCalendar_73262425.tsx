import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Film,
  Clock,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { ContentItem } from '../types';

interface UnifiedCalendarProps {
  contentItems: ContentItem[];
  onSelectContentItem: (item: ContentItem) => void;
  onNewContent: () => void;
}

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  contentItems,
  onSelectContentItem,
  onNewContent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayString, setSelectedDayString] = useState<string>(
    toLocalDateStr(new Date())
  );
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'agenda'>('month');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayString(toLocalDateStr(today));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Convert to Monday = 0
  const startOffset = (firstDayOfMonth + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const weekDayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Map events to date strings
  const getEventsForDate = (dateStr: string) => {
    const contents = contentItems.filter((item) => item.scheduledDate === dateStr);
    return { contents, total: contents.length };
  };

  // Build grid cells
  const calendarCells = [];

  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = toLocalDateStr(prevMonthDate);
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      events: getEventsForDate(dateStr),
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum);
    const dateStr = toLocalDateStr(d);

    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: true,
      events: getEventsForDate(dateStr),
    });
  }

  // Next month leading days to complete full grid
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const nextMonthDate = new Date(year, month + 1, dayNum);
    const dateStr = toLocalDateStr(nextMonthDate);
    calendarCells.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      events: getEventsForDate(dateStr),
    });
  }

  const todayStr = toLocalDateStr(new Date());
  const selectedDayEvents = getEventsForDate(selectedDayString);

  // Agenda items: sorted by date and time
  const allScheduledItems = [...contentItems].sort((a, b) =>
    `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime}`)
  );

  return (
    <div className="space-y-6">
      {/* Calendar Header Controls */}
      <div className="surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 text-rose-400 flex items-center justify-center shadow-sm shadow-black/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Calendrier Éditorial TikTok
            </h1>
            <p className="text-xs text-zinc-400">
              Planifiez et visualisez la diffusion de vos publications originales
            </p>
          </div>
        </div>

        {/* View Switcher & Action button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNewContent}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Planifier une vidéo</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex bg-zinc-950 p-1 rounded-xl text-xs font-semibold text-zinc-400 border border-zinc-800">
            <button
              onClick={() => setCalendarViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                calendarViewMode === 'month' ? 'bg-zinc-800 text-white shadow-sm shadow-black/20' : 'hover:text-white'
              }`}
            >
              Grille Mois
            </button>
            <button
              onClick={() => setCalendarViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                calendarViewMode === 'agenda' ? 'bg-zinc-800 text-white shadow-sm shadow-black/20' : 'hover:text-white'
              }`}
            >
              Vue Agenda ({allScheduledItems.length})
            </button>
          </div>
        </div>
      </div>

      {calendarViewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Month Grid (8 columns on large screen) */}
          <div className="surface lg:col-span-8 p-5 sm:p-6 space-y-4">
            {/* Month Navigator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition cursor-pointer"
                >
                  Aujourd'hui
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-zinc-500 py-1 border-b border-zinc-800">
              {weekDayNames.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDayString;
                const isToday = cell.dateStr === todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayString(cell.dateStr)}
                    className={`min-h-[78px] sm:min-h-[96px] p-2 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-500/80 bg-rose-950/20 ring-1 ring-rose-500/30'
                        : isToday
                        ? 'border-amber-500/60 bg-amber-950/20'
                        : cell.isCurrentMonth
                        ? 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/60'
                        : 'border-transparent bg-zinc-950/20 opacity-30 hover:opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-rose-500 text-white'
                            : isSelected
                            ? 'bg-rose-600 text-white'
                            : cell.isCurrentMonth
                            ? 'text-zinc-200'
                            : 'text-zinc-500'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {cell.events.total > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/40">
                          {cell.events.total}
                        </span>
                      )}
                    </div>

                    {/* Events Mini Dots / Chips */}
                    <div className="space-y-1 mt-1">
                      {cell.events.contents.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-950/80 text-rose-200 border border-rose-800/50 truncate"
                          title={`Publication : ${item.title}`}
                        >
                          {item.title}
                        </div>
                      ))}

                      {cell.events.total > 2 && (
                        <div className="text-[9px] text-zinc-400 font-semibold pl-1">
                          +{cell.events.total - 2} autre{cell.events.total - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-3 text-xs text-zinc-400 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Publications originales</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Cliquez sur un jour pour voir les détails
              </div>
            </div>
          </div>

          {/* Right Sidebar: Selected Day Details (4 columns) */}
          <div className="surface lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {new Date(`${selectedDayString}T12:00:00`).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedDayEvents.total} publication{selectedDayEvents.total > 1 ? 's' : ''} programmée{selectedDayEvents.total > 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  onClick={onNewContent}
                  title="Planifier une vidéo"
                  className="p-2 rounded-xl bg-zinc-800 text-rose-400 hover:bg-zinc-700 border border-zinc-700 cursor-pointer transition"
                >
                  <Film className="w-4 h-4" />
                </button>
              </div>

              {/* Day items list */}
              {selectedDayEvents.total === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-2 border border-zinc-700">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">Aucune publication ce jour</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Planifiez une nouvelle vidéo originale pour cette date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {selectedDayEvents.contents.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectContentItem(item)}
                      className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 hover:bg-zinc-950 hover:border-rose-500/40 transition cursor-pointer text-left space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                          <Film className="w-3 h-3" />
                          Publication
                        </span>
                        <span className="font-mono text-zinc-400 text-[11px] font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {item.scheduledTime}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">
                        {item.caption || 'Sans légende'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action button */}
            <div className="pt-4 border-t border-zinc-800">
              <button
                onClick={onNewContent}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Planifier une nouvelle vidéo</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="surface p-6 space-y-4">
          <h3 className="font-bold text-white text-base">
            Toutes les publications programmées ({allScheduledItems.length})
          </h3>

          {allScheduledItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Aucune publication planifiée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {allScheduledItems.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-950/50 px-2 rounded-xl transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-zinc-800 border border-zinc-700 text-rose-400">
                      <Film className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                          Publication Vidéo
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {item.scheduledDate} &bull; {item.scheduledTime}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {item.caption || 'Sans légende'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onSelectContentItem(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>Éditer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
