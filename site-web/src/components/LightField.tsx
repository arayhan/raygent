import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';

const pool = (rgba: string) => `radial-gradient(circle, ${rgba} 0%, transparent 62%)`;
// MASTER.md v2.3: blue #5b8cff and indigo #7b6bff, light field only, low alpha.
const BLUE = pool('rgba(91, 140, 255, 0.12)');
const INDIGO = pool('rgba(123, 107, 255, 0.12)');

/**
 * Soft light pools fixed behind the page. They drift, scale and cross from
 * blue to indigo as the page scrolls, scrubbed to the scrollbar. Transform
 * and opacity only; static under reduced motion.
 */
export function LightField() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });
      tl.to('[data-pool="a"]', { x: '-55vw', y: '55vh', scale: 1.3 }, 0)
        .to('[data-pool="b"]', { x: '35vw', y: '-75vh', scale: 1.2, opacity: 0 }, 0)
        .to('[data-pool="b2"]', { x: '35vw', y: '-75vh', scale: 1.2, opacity: 1 }, 0)
        .to('[data-pool="c"]', { y: '-70vh', scale: 1.4, opacity: 1 }, 0.35);
    },
    { scope: ref }
  );

  const base = 'absolute rounded-full will-change-transform';
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div data-pool="a" className={base} style={{ width: '90vmax', height: '90vmax', top: '-35vmax', right: '-30vmax', background: BLUE }} />
      <div data-pool="b" className={base} style={{ width: '80vmax', height: '80vmax', bottom: '-55vmax', left: '-25vmax', background: BLUE }} />
      <div
        data-pool="b2"
        className={base}
        style={{ width: '80vmax', height: '80vmax', bottom: '-55vmax', left: '-25vmax', background: INDIGO, opacity: 0 }}
      />
      <div
        data-pool="c"
        className={base}
        style={{ width: '70vmax', height: '70vmax', bottom: '-75vmax', left: '25vw', background: BLUE, opacity: 0.6 }}
      />
    </div>
  );
}
