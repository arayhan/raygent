import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);

// MASTER.md ease-out-expo, exactly: cubic-bezier(0.16, 1, 0.3, 1).
export const EASE_OUT_EXPO = CustomEase.create('raygentOutExpo', '0.16,1,0.3,1');

// MASTER.md motion tokens, in seconds.
export const DUR = { enterS: 0.45, enter: 0.6, enterL: 0.7 } as const;
export const STAGGER = 0.06;
export const TYPE_CHAR_MS = 35;
export const TYPE_LINE_MS = 120;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, ScrollTrigger, useGSAP };
