export function installSpotlight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (mq?.matches) return;

  let activeSurface: HTMLElement | null = null;

  const onPointerMove = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    const surface = target?.closest?.('.surface') as HTMLElement | null;

    if (activeSurface && activeSurface !== surface) {
      activeSurface.style.setProperty('--spot', '0');
    }

    if (surface) {
      const rect = surface.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      surface.style.setProperty('--mx', `${x.toFixed(1)}px`);
      surface.style.setProperty('--my', `${y.toFixed(1)}px`);
      surface.style.setProperty('--spot', '1');
      activeSurface = surface;
    } else {
      activeSurface = null;
    }
  };

  const onPointerLeave = () => {
    if (activeSurface) {
      activeSurface.style.setProperty('--spot', '0');
      activeSurface = null;
    }
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
}
