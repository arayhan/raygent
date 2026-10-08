import { useEffect, useRef, useState } from 'react';
import type { RingScene } from '../three/ringScene';
import { prefersReducedMotion } from '../motion/gsap';

/**
 * The hero's tech-rings. three.js is loaded only when this mounts, renders one
 * still frame under reduced motion, and stops whenever it is off screen, the
 * tab is hidden, or the visitor pauses it.
 */
export function RingField() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RingScene | null>(null);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const syncRef = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const sync = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      if (!reduced && !pausedRef.current && visibleRef.current && !document.hidden) scene.start();
      else scene.stop();
    };
    const onResize = () => {
      sceneRef.current?.resize();
      if (reduced || pausedRef.current) sceneRef.current?.renderOnce();
    };
    const onPointer = (e: PointerEvent) => {
      const b = wrap.getBoundingClientRect();
      sceneRef.current?.setPointer(((e.clientX - b.left) / b.width - 0.5) * 2, -((e.clientY - b.top) / b.height - 0.5) * 2);
    };
    const onLeave = () => sceneRef.current?.setPointer(0, 0);

    import('../three/ringScene').then(({ createRingScene }) => {
      if (cancelled) return;
      try {
        sceneRef.current = createRingScene(canvas);
      } catch {
        return; // no WebGL: the hero reads fine without the rings
      }
      sceneRef.current.resize();
      sceneRef.current.renderOnce();
      setReady(true);
      observer = new IntersectionObserver(([entry]) => {
        visibleRef.current = entry.isIntersecting;
        sync();
      });
      observer.observe(wrap);
      sync();
    });

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', sync);
    if (!reduced) {
      wrap.addEventListener('pointermove', onPointer);
      wrap.addEventListener('pointerleave', onLeave);
    }
    syncRef.current = sync;

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', sync);
      wrap.removeEventListener('pointermove', onPointer);
      wrap.removeEventListener('pointerleave', onLeave);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [reduced]);

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    syncRef.current();
  };

  return (
    <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[560px]">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full transition-opacity duration-700 motion-reduce:transition-none"
        style={{ opacity: ready ? 1 : 0, transitionTimingFunction: 'var(--ease-out-expo)' }}
      />
      {!reduced && ready && (
        <button
          type="button"
          onClick={togglePause}
          className="copy absolute right-2 bottom-2 min-h-9"
          aria-pressed={paused}
        >
          {paused ? 'Play rings' : 'Pause rings'}
        </button>
      )}
    </div>
  );
}
