"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { CINEMA_SCREENS, clamp, timeline } from "./scroll";

type Styler = (s: number) => void;
const stylers = new Set<Styler>();

/** Register a per-frame DOM styler driven by the scroll timeline. */
export function useTimelineStyler(fn: Styler) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const s: Styler = (v) => ref.current(v);
    stylers.add(s);
    s(timeline.screens);
    return () => {
      stylers.delete(s);
    };
  }, []);
}

/**
 * Smooth scrolling (Lenis) + the single rAF loop that updates the timeline and
 * every registered overlay. Also renders the edge progress bar and the scroll hint.
 */
export function ScrollDriver({ hint }: { hint: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    if (process.env.NODE_ENV !== "production") (window as unknown as { __slTimeline: typeof timeline }).__slTimeline = timeline;
    let raf = 0;
    const loop = (t: number) => {
      lenis?.raf(t);
      timeline.vh = window.innerHeight;
      timeline.y = lenis ? lenis.scroll : window.scrollY;
      timeline.screens = timeline.y / timeline.vh;
      const s = timeline.screens;
      for (const fn of stylers) fn(s);
      const max = document.documentElement.scrollHeight - timeline.vh;
      if (bar.current) bar.current.style.transform = `translateY(${clamp(timeline.y / Math.max(1, max)) * (timeline.vh - 160)}px)`;
      // visible through the cinematic part, gone once regular content starts
      if (hintRef.current) hintRef.current.style.opacity = String(1 - clamp((s - (CINEMA_SCREENS - 1.4)) / 0.6));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      {/* edge progress indicator */}
      <div aria-hidden className="pointer-events-none fixed top-0 end-0 z-30 h-dvh w-[6px] no-print">
        <div ref={bar} className="h-[160px] w-full bg-cream/90" />
      </div>
      {/* scroll hint */}
      <div ref={hintRef} aria-hidden className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center no-print">
        <span className="eyebrow flex items-center gap-2.5 text-[11px] font-medium text-cream">
          <span className="grid size-7 place-items-center rounded-full border border-dashed border-cream/70">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          {hint}
        </span>
      </div>
    </>
  );
}
