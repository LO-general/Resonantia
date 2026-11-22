import React, { useEffect } from 'react';

export function usePageReveal(
  ref: React.RefObject<HTMLElement | null>,
  key?: unknown
) {
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
      { threshold: 0.05 }
    );

    targets.forEach((el, idx) => {
      if (!el.style.getPropertyValue('--i')) {
        el.style.setProperty('--i', String(Math.min(idx, 10)));
      }
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.98) {
        el.classList.add('is-in', 'revealed');
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [ref, key]);
}
