"use client";

import { useRef } from "react";
import { useTimelineStyler } from "./ScrollDriver";
import { clamp, window4 } from "./scroll";
import { dimsAt } from "./story";
import { cx } from "@/components/ui";

/** A block that fades / un-blurs in over [a,b] and out over [c,d] (screens). Hidden blocks don't take clicks. */
export function Chapter({ range, className, children, rise = 24 }: { range: [number, number, number, number]; className?: string; children: React.ReactNode; rise?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useTimelineStyler((s) => {
    const n = el.current;
    if (!n) return;
    const o = window4(s, ...range);
    n.style.opacity = String(o);
    n.style.filter = o > 0.995 ? "none" : `blur(${(1 - o) * 12}px)`;
    n.style.transform = `translate3d(0, ${(1 - o) * rise * (s < range[2] ? 1 : -1)}px, 0)`;
    n.style.visibility = o < 0.01 ? "hidden" : "visible";
  });
  return (
    <div ref={el} className={cx("pointer-events-none absolute will-change-[opacity,filter,transform] [&_a]:pointer-events-auto [&_button]:pointer-events-auto", className)} style={{ opacity: 0, visibility: "hidden" }}>
      {children}
    </div>
  );
}

/**
 * Headline that resolves unit by unit as you scroll through [a, b].
 * Arabic is split by word (splitting letters would break Arabic joining); Latin by letter.
 */
export function KineticText({ text, range, className }: { text: string; range: [number, number]; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const arabic = /[؀-ۿ]/.test(text);
  const units = arabic ? text.split(/(\s+)/) : [...text];
  useTimelineStyler((s) => {
    const n = el.current;
    if (!n) return;
    const p = clamp((s - range[0]) / (range[1] - range[0]));
    const kids = n.children;
    const count = kids.length;
    for (let i = 0; i < count; i++) {
      const local = clamp(p * (count + 2) - i);
      const k = kids[i] as HTMLElement;
      k.style.opacity = String(0.08 + 0.92 * local);
      k.style.filter = local > 0.99 ? "none" : `blur(${(1 - local) * 14}px)`;
    }
  });
  return (
    <span ref={el} className={className} aria-label={text}>
      {units.map((u, i) => (
        <span key={i} aria-hidden className="inline-block whitespace-pre" style={{ opacity: 0.08, filter: "blur(14px)" }}>
          {u}
        </span>
      ))}
    </span>
  );
}

/** Live L × W × H readout following the resize chapter. */
export function DimensionCounter({ className }: { className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useTimelineStyler((s) => {
    if (!el.current) return;
    const d = dimsAt(s);
    const txt = `${d.length} × ${d.width} × ${d.height}`;
    if (el.current.textContent !== txt) el.current.textContent = txt;
  });
  return (
    <span className={cx("num", className)}>
      <span ref={el}>300 × 200 × 120</span>
      <span className="ms-3 text-[0.35em] align-middle text-cream/60">mm</span>
    </span>
  );
}

/** Horizontal track scrubbed by vertical scroll while its section is pinned. */
export function useHorizontalScrub(section: React.RefObject<HTMLElement | null>, track: React.RefObject<HTMLElement | null>, rtl: boolean) {
  useTimelineStyler(() => {
    const sec = section.current;
    const tr = track.current;
    if (!sec || !tr) return;
    const r = sec.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const distance = Math.max(0, tr.scrollWidth - window.innerWidth);
    tr.style.transform = `translate3d(${(rtl ? 1 : -1) * p * distance}px, 0, 0)`;
  });
}
