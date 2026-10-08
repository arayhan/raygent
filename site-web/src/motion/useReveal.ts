import type { RefObject } from 'react';
import { DUR, EASE_OUT_EXPO, STAGGER, gsap, prefersReducedMotion, useGSAP } from './gsap';

/**
 * Staggered entrance for every `[data-reveal]` inside `scope`, once, when the
 * group scrolls into view. Reduced motion skips it: the content is already in
 * its resting place.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, opts: { start?: string } = {}) {
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;
      const items = scope.current.querySelectorAll<HTMLElement>('[data-reveal]');
      if (items.length === 0) return;
      gsap.from(items, {
        opacity: 0,
        y: 24,
        duration: DUR.enter,
        ease: EASE_OUT_EXPO,
        stagger: STAGGER,
        scrollTrigger: { trigger: scope.current, start: opts.start ?? 'top 82%', once: true },
      });
    },
    { scope }
  );
}
