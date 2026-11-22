import React, { useEffect, useState } from 'react';

export { usePageReveal } from './usePageReveal';
export { installSpotlight } from './spotlight';

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
      setProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-zinc-900/60 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-500 transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function useScrollReveal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal, [data-reveal]'));
    if (targets.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in', 'revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in', 'revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 }
    );

    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95) {
        el.classList.add('is-in', 'revealed');
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [ref]);
}

interface RevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function Reveal({ children, index = 0, className = '' }: RevealProps) {
  return (
    <div
      className={`reveal is-in ${className}`.trim()}
      style={{ '--i': index } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedNumberProps) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(safeTarget);

  useEffect(() => {
    const start = display;
    const end = safeTarget;
    if (Math.abs(end - start) < 0.0001) {
      setDisplay(end);
      return;
    }

    let rafId = 0;
    const duration = 420;
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(end);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [safeTarget]);

  const formatted = display.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  percent,
  size = 96,
  stroke = 8,
  color = '#fb7185',
  trackColor = 'rgba(63, 63, 70, 0.45)',
  children,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  const radius = Math.max(4, (size - stroke) / 2);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
          {children}
        </div>
      )}
    </div>
  );
}

interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartItem[];
  from?: string;
  to?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChart({
  data,
  from = '#fb7185',
  to = '#fbbf24',
  height = 120,
  formatValue = (v) => v.toLocaleString('fr-FR'),
}: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl"
        style={{ height }}
      >
        Aucune donnée à afficher
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => (Number.isFinite(d.value) ? Math.max(0, d.value) : 0)));

  return (
    <div className="relative select-none">
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
          <span className="text-zinc-400">{data[hoveredIdx].label} :</span>
          <span className="text-amber-300">{formatValue(data[hoveredIdx].value)}</span>
        </div>
      )}
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((item, idx) => {
          const val = Number.isFinite(item.value) ? Math.max(0, item.value) : 0;
          const pct = val > 0 ? Math.max(6, (val / maxVal) * 100) : 3;
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={`${item.label}_${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group cursor-pointer min-w-0"
              title={`${item.label} : ${formatValue(val)}`}
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`chart-bar w-full rounded-t-md transition-all duration-300 ${
                    isHovered ? 'brightness-125 scale-y-[1.03] origin-bottom' : 'opacity-90'
                  }`}
                  style={{
                    '--i': idx,
                    height: `${pct}%`,
                    background:
                      val > 0
                        ? `linear-gradient(to top, ${from}, ${to})`
                        : 'rgba(63, 63, 70, 0.45)',
                  } as React.CSSProperties}
                />
              </div>
              <span className="text-[10px] font-medium text-zinc-500 group-hover:text-zinc-200 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function Sparkline({
  data,
  labels,
  color = '#fb7185',
  height = 120,
  formatValue = (v) => v.toLocaleString('fr-FR'),
}: SparklineProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = React.useId().replace(/:/g, '_');

  const safeData = (data || []).map((v) => (Number.isFinite(v) ? v : 0));
  if (safeData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl"
        style={{ height }}
      >
        Aucune donnée disponible
      </div>
    );
  }

  const width = 480;
  const padX = 8;
  const padY = 12;
  const minVal = Math.min(...safeData);
  const maxVal = Math.max(...safeData);
  const range = Math.max(1e-6, maxVal - minVal);

  const coords = safeData.map((val, i) => {
    const x =
      safeData.length === 1
        ? width / 2
        : padX + (i / (safeData.length - 1)) * (width - padX * 2);
    const norm = maxVal === minVal ? 0.5 : (val - minVal) / range;
    const y = height - padY - norm * (height - padY * 2);
    return { x, y, val, label: labels?.[i] ?? `#${i + 1}` };
  });

  const linePoints = coords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `M ${coords[0].x.toFixed(1)},${(height - padY).toFixed(1)} L ${coords
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' L ')} L ${coords[coords.length - 1].x.toFixed(1)},${(height - padY).toFixed(1)} Z`
      : '';

  const activePoint = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="relative select-none">
      {activePoint && (
        <div className="absolute right-2 top-1 z-10 pointer-events-none rounded-lg border border-zinc-700 bg-zinc-950/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
          <span className="text-zinc-400 mr-1.5">{activePoint.label} :</span>
          <span style={{ color }}>{formatValue(activePoint.val)}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} className="chart-area" />}

        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePoints}
            className="chart-line"
          />
        )}

        {activePoint && (
          <line
            x1={activePoint.x}
            y1={padY / 2}
            x2={activePoint.x}
            y2={height - padY}
            stroke="rgba(161, 161, 170, 0.35)"
            strokeDasharray="3 3"
          />
        )}

        {coords.map((pt, i) => {
          const isActive = hoverIdx === i;
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} className="cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 5 : coords.length <= 12 ? 3 : 0}
                fill={isActive ? '#ffffff' : color}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 0}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
}

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 152,
}: DonutChartProps) {
  const safeSegments = (segments || []).filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = safeSegments.reduce((acc, s) => acc + s.value, 0);
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(63, 63, 70, 0.4)"
            strokeWidth={stroke}
          />
          {total > 0 &&
            safeSegments.map((seg, i) => {
              const frac = seg.value / total;
              const dashLen = frac * circumference;
              const dashOffset = -cumulative * circumference;
              cumulative += frac;
              return (
                <circle
                  key={`${seg.label}_${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dashLen} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-500"
                />
              );
            })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
            {centerValue && (
              <div className="text-base font-black text-white leading-tight">{centerValue}</div>
            )}
            {centerLabel && (
              <div className="text-[10px] font-medium text-zinc-400 leading-tight mt-0.5">
                {centerLabel}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 w-full space-y-2.5 min-w-0">
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div key={`${seg.label}_${i}`} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-zinc-300 font-medium truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="font-bold text-white">{seg.value.toLocaleString('fr-FR')}</span>
                <span className="text-[11px] text-zinc-500">
                  ({pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MeterBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  hint?: string;
  decimals?: number;
  suffix?: string;
}

export function MeterBar({
  label,
  value,
  max,
  color = '#fb7185',
  hint,
  decimals = 2,
  suffix = '%',
}: MeterBarProps) {
  const safeVal = Number.isFinite(value) ? Math.max(0, value) : 0;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const pct = Math.min(100, Math.max(0, (safeVal / safeMax) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-semibold text-zinc-200 truncate">{label}</span>
          {hint && <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">{hint}</span>}
        </div>
        <span className="font-mono font-bold text-white shrink-0 tabular-nums">
          {safeVal.toLocaleString('fr-FR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800/90 overflow-hidden">
        <div
          className="chart-bar-x h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface StackedPart {
  label: string;
  value: number;
  color: string;
}

interface StackedBarProps {
  parts: StackedPart[];
}

export function StackedBar({ parts }: StackedBarProps) {
  const safeParts = (parts || []).filter((p) => Number.isFinite(p.value) && p.value > 0);
  const total = safeParts.reduce((acc, p) => acc + p.value, 0);

  if (safeParts.length === 0 || total <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex gap-0.5 p-0.5">
        {safeParts.map((part, i) => {
          const pct = (part.value / total) * 100;
          return (
            <div
              key={`${part.label}_${i}`}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
              style={{
                width: `${Math.max(2, pct)}%`,
                backgroundColor: part.color,
              }}
              title={`${part.label} : ${part.value.toLocaleString('fr-FR')} (${pct.toFixed(1)} %)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {safeParts.map((part, i) => {
          const pct = (part.value / total) * 100;
          return (
            <div key={`${part.label}_${i}`} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: part.color }} />
              <span className="text-zinc-300 font-medium">{part.label}</span>
              <span className="text-zinc-500 tabular-nums">
                {pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ACCENT_STYLES: Record<string, { badge: string; icon: string; orb: string }> = {
  teal: {
    badge: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
    icon: 'text-teal-400',
    orb: 'bg-teal-500/15',
  },
  rose: {
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    icon: 'text-rose-400',
    orb: 'bg-rose-500/15',
  },
  indigo: {
    badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    icon: 'text-indigo-400',
    orb: 'bg-indigo-500/15',
  },
  amber: {
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    icon: 'text-amber-400',
    orb: 'bg-amber-500/15',
  },
  emerald: {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    icon: 'text-emerald-400',
    orb: 'bg-emerald-500/15',
  },
  purple: {
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
    icon: 'text-purple-400',
    orb: 'bg-purple-500/15',
  },
  cyan: {
    badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    icon: 'text-cyan-400',
    orb: 'bg-cyan-500/15',
  },
};

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  right?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accent = 'rose',
  right,
}: PageHeaderProps) {
  const palette = ACCENT_STYLES[accent] || ACCENT_STYLES.rose;

  return (
    <div className="surface relative overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl ${palette.orb}`}
        aria-hidden="true"
      />
      <div className="relative space-y-2.5 max-w-2xl">
        {eyebrow && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${palette.badge}`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${palette.icon}`} />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight text-balance">
          {title}
        </h1>
        {subtitle && <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{subtitle}</p>}
      </div>
      {right && <div className="relative shrink-0">{right}</div>}
    </div>
  );
}
