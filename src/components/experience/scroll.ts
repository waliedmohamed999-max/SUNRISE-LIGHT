"use client";

/**
 * Shared scroll timeline for the homepage experience.
 * One smoothed scroll value (in "screens" = scrollY / viewport height) drives both the
 * fixed WebGL scene (read inside useFrame) and the DOM chapter overlays (styled in one rAF loop),
 * so nothing re-renders React per frame.
 */
export const timeline = { y: 0, vh: 1, screens: 0 };

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

/** 0 → 1 as `s` goes from a to b (eased). */
export const ramp = (s: number, a: number, b: number) => smooth(clamp((s - a) / (b - a)));

/** Fades in over [a, b], holds, fades out over [c, d]. */
export const window4 = (s: number, a: number, b: number, c: number, d: number) => (s < c ? ramp(s, a, b) : 1 - ramp(s, c, d));

/**
 * Chapter map (in screens). The cinematic part of the homepage is CINEMA_SCREENS tall;
 * normal content follows it.
 */
export const CH = {
  intro: [0, 1.0],
  title: [0.7, 2.3],
  unfold: [2.2, 3.9],
  resize: [3.9, 5.2],
  print: [5.2, 6.5],
  macro: [6.5, 7.8],
  features: [7.8, 10.6],
  family: [10.6, 12.1],
  blueprint: [12.1, 13.9],
  word: [13.9, 15.6],
} as const;
export const CINEMA_SCREENS = 16.4;
