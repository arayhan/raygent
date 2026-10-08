import { useEffect, useRef } from 'react';
import { ScrollTrigger, prefersReducedMotion } from '../motion/gsap';
import { PALETTE } from '../motion/palette';

type Mix = { blue: number; tint: number; indigo: number; mute: number };
interface FieldTarget {
  density: number;
  mix: Mix;
  /** Drift direction in degrees, 0 = right, -90 = up. */
  angle: number;
}

// Per-section mood, keyed by the section ids in App. MASTER.md v2.4.
const SECTION_FIELDS: Record<string, FieldTarget> = {
  top: { density: 1, mix: { blue: 0.5, tint: 0.3, indigo: 0.05, mute: 0.15 }, angle: -60 },
  why: { density: 0.6, mix: { blue: 0.2, tint: 0.45, indigo: 0, mute: 0.35 }, angle: -90 },
  flagship: { density: 0.85, mix: { blue: 0.6, tint: 0.25, indigo: 0, mute: 0.15 }, angle: 90 },
  features: { density: 0.7, mix: { blue: 0.35, tint: 0.2, indigo: 0.3, mute: 0.15 }, angle: 180 },
  compare: { density: 0.5, mix: { blue: 0.15, tint: 0.35, indigo: 0, mute: 0.5 }, angle: -100 },
  docs: { density: 0.65, mix: { blue: 0.5, tint: 0.3, indigo: 0, mute: 0.2 }, angle: -45 },
  examples: { density: 0.85, mix: { blue: 0.4, tint: 0.2, indigo: 0.25, mute: 0.15 }, angle: 0 },
  creator: { density: 0.6, mix: { blue: 0.25, tint: 0.25, indigo: 0.35, mute: 0.15 }, angle: -120 },
  start: { density: 1, mix: { blue: 0.65, tint: 0.25, indigo: 0.05, mute: 0.05 }, angle: -90 },
};

// far / mid / near. factor drives parallax and streak length.
const LAYERS = [
  { count: 60, factor: 0.25, size: 1, alpha: 0.3, speed: 0.08 },
  { count: 50, factor: 0.55, size: 1.5, alpha: 0.45, speed: 0.14 },
  { count: 30, factor: 1, size: 2.5, alpha: 0.6, speed: 0.22 },
];
const EASE_TARGET = 0.03; // per frame at 60fps, about 800ms to settle
const EASE_VELOCITY = 0.12; // about 400ms for streaks to settle
const MAX_STREAK = 24;

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const SLOT_COLORS: Record<keyof Mix, number[]> = {
  blue: hexToRgb(PALETTE.blue),
  tint: hexToRgb(PALETTE.blueTint),
  indigo: hexToRgb(PALETTE.indigo),
  mute: hexToRgb(PALETTE.signalMute),
};

interface Particle {
  x: number;
  y: number;
  layer: (typeof LAYERS)[number];
  rank: number; // stable 0..1, decides colour slot and whether density keeps it
  rgb: number[];
  targetRgb: number[];
  vis: number;
}

function slotFor(rank: number, mix: Mix): keyof Mix {
  const total = mix.blue + mix.tint + mix.indigo + mix.mute;
  let acc = 0;
  for (const key of ['blue', 'tint', 'indigo', 'mute'] as const) {
    acc += mix[key] / total;
    if (rank < acc) return key;
  }
  return 'mute';
}

/**
 * Dots at three depths behind the page. Near dots move further with scroll
 * than far ones; scroll speed accelerates the drift and draws a short streak;
 * each section eases the field to its own density, colours and direction.
 * Reduced motion draws one still frame and listens to nothing.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = prefersReducedMotion();

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const start = SECTION_FIELDS.top;
    const particles: Particle[] = [];
    for (const layer of LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        const rank = Math.random();
        const rgb = [...SLOT_COLORS[slotFor(rank, start.mix)]];
        particles.push({ x: Math.random() * w, y: Math.random() * h, layer, rank, rgb, targetRgb: [...rgb], vis: 1 });
      }
    }

    const target = { ...start };
    let density = start.density;
    let dirX = Math.cos((start.angle * Math.PI) / 180);
    let dirY = Math.sin((start.angle * Math.PI) / 180);
    let velocity = 0;
    let lastScroll = window.scrollY;
    let raf = 0;
    let last = 0;

    const draw = (scrollDelta: number) => {
      ctx.clearRect(0, 0, w, h);
      const streak = Math.min(Math.abs(velocity), 60);
      for (const p of particles) {
        if (p.vis < 0.02) continue;
        const [r, g, b] = p.rgb;
        const alpha = p.layer.alpha * p.vis;
        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.layer.size / 2 + 0.25, 0, Math.PI * 2);
        ctx.fill();
        const len = Math.min(streak * p.layer.factor * 0.8, MAX_STREAK);
        if (len > 1) {
          ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.5})`;
          ctx.lineWidth = p.layer.size * 0.75;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + Math.sign(scrollDelta || velocity) * len);
          ctx.stroke();
        }
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 16.67, 3) : 1;
      last = now;
      const scroll = window.scrollY;
      const delta = scroll - lastScroll;
      lastScroll = scroll;
      velocity += (delta - velocity) * EASE_VELOCITY * dt;

      density += (target.density - density) * EASE_TARGET * dt;
      const tx = Math.cos((target.angle * Math.PI) / 180);
      const ty = Math.sin((target.angle * Math.PI) / 180);
      dirX += (tx - dirX) * EASE_TARGET * dt;
      dirY += (ty - dirY) * EASE_TARGET * dt;
      const boost = 1 + Math.min(Math.abs(velocity), 60) * 0.04;

      for (const p of particles) {
        p.y -= delta * p.layer.factor * 0.6;
        p.x += dirX * p.layer.speed * boost * dt;
        p.y += dirY * p.layer.speed * boost * dt;
        if (p.x < -10) p.x += w + 20;
        else if (p.x > w + 10) p.x -= w + 20;
        if (p.y < -10) p.y += h + 20;
        else if (p.y > h + 10) p.y -= h + 20;
        const wanted = p.rank < density ? 1 : 0;
        p.vis += (wanted - p.vis) * EASE_TARGET * 2 * dt;
        for (let c = 0; c < 3; c++) p.rgb[c] += (p.targetRgb[c] - p.rgb[c]) * EASE_TARGET * dt;
      }
      draw(delta);
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resize();
      if (reduced) draw(0);
    };
    window.addEventListener('resize', onResize);

    if (reduced) {
      draw(0);
      return () => window.removeEventListener('resize', onResize);
    }

    // Each section retargets the field while it crosses the 60% line.
    const triggers = Object.entries(SECTION_FIELDS).flatMap(([id, field]) => {
      const el = document.getElementById(id);
      if (!el) return [];
      return [
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 60%',
          onToggle: (self) => {
            if (!self.isActive) return;
            Object.assign(target, field);
            for (const p of particles) p.targetRgb = [...SLOT_COLORS[slotFor(p.rank, field.mix)]];
          },
        }),
      ];
    });

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = 0;
        lastScroll = window.scrollY;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      triggers.forEach((t) => t.kill());
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
