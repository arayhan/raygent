import type { RefObject } from 'react';
import { DUR, EASE_OUT_EXPO, STAGGER, gsap, prefersReducedMotion, useGSAP } from './gsap';

/**
 * Staggered opacity fade for every `[data-reveal]` inside `scope`, once, when
 * the group scrolls into view. No slide: v2 motion is fades only. Reduced
 * motion skips it, and the content is already at rest.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, opts: { start?: string } = {}) {
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;
      const items = scope.current.querySelectorAll<HTMLElement>('[data-reveal]');
      if (items.length === 0) return;
      gsap.from(items, {
        opacity: 0,
        duration: DUR.enter,
        ease: EASE_OUT_EXPO,
        stagger: STAGGER,
        scrollTrigger: { trigger: scope.current, start: opts.start ?? 'top 82%', once: true },
      });
    },
    { scope }
  );
}
