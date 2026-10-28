"use client";

import { useMemo, useRef } from "react";
import { getEngine } from "@/packaging/engine";
import { useTimelineStyler } from "./ScrollDriver";
import { clamp, CH, ramp } from "./scroll";
import { BASE_DIMS } from "./story";

/**
 * Technical drawing of the real shipping-carton blank (from the packaging engine),
 * drawn stroke by stroke with scroll, then resolving into an outlined wordmark.
 */
export function Blueprint() {
  const svg = useRef<SVGSVGElement>(null);
  const d = useMemo(() => getEngine("rsc").dieline(BASE_DIMS), []);
  const segments = useMemo(() => [...d.cuts.map((c) => ({ c, kind: "cut" as const })), ...d.folds.map((c) => ({ c, kind: "fold" as const }))], [d]);
  const vertices = useMemo(() => {
    const seen = new Map<string, [number, number]>();
    for (const { c } of segments) for (const p of c) seen.set(`${Math.round(p[0])},${Math.round(p[1])}`, p);
    return [...seen.values()];
  }, [segments]);
  const pad = 70;
  const vb = `${-pad} ${-pad} ${d.width + pad * 2} ${d.height + pad * 2}`;

  useTimelineStyler((s) => {
    const root = svg.current;
    if (!root) return;
    const [a, b] = CH.blueprint;
    const draw = ramp(s, a + 0.15, a + 0.95);
    const word = ramp(s, b - 0.75, b - 0.3);
    const lines = root.querySelectorAll<SVGLineElement>("[data-seg]");
    lines.forEach((el, i) => {
      // staggered: each segment starts a little after the previous one
      const local = clamp(draw * 1.6 - (i / segments.length) * 0.6);
      if (el.dataset.seg === "cut") el.style.strokeDashoffset = String(1 - local);
      else el.style.opacity = String(local);
    });
    const dots = root.querySelector<SVGGElement>("[data-dots]");
    if (dots) dots.style.opacity = String(ramp(s, a + 0.5, a + 1.0) * (1 - word));
    const drawing = root.querySelector<SVGGElement>("[data-drawing]");
    if (drawing) drawing.style.opacity = String(1 - word * 0.85);
    const mark = root.querySelector<SVGTextElement>("[data-word]");
    if (mark) {
      mark.style.opacity = String(word);
      mark.style.filter = word > 0.99 ? "none" : `blur(${(1 - word) * 8}px)`;
    }
  });

  const r = (n: number) => Math.round(n * 10) / 10;
  return (
    <svg ref={svg} viewBox={vb} className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
      <g data-drawing>
        {/* construction grid */}
        {Array.from({ length: Math.ceil(d.width / 50) + 1 }, (_, i) => (
          <line key={`gx${i}`} x1={i * 50} y1={-pad / 2} x2={i * 50} y2={d.height + pad / 2} stroke="#FFEDD7" strokeOpacity={0.05} strokeWidth={0.6} />
        ))}
        {segments.map(({ c, kind }, i) => (
          <line
            key={i}
            data-seg={kind}
            x1={r(c[0][0])}
            y1={r(c[0][1])}
            x2={r(c[1][0])}
            y2={r(c[1][1])}
            pathLength={kind === "cut" ? 1 : undefined}
            stroke={kind === "cut" ? "#EA5B32" : "#FFEDD7"}
            strokeOpacity={kind === "cut" ? 0.95 : 0.55}
            strokeWidth={kind === "cut" ? 1.6 : 1}
            strokeDasharray={kind === "cut" ? "1" : "6 5"}
            style={kind === "cut" ? { strokeDashoffset: 1 } : { opacity: 0 }}
          />
        ))}
        {/* overall dimensions */}
        <g fill="#FFEDD7" fillOpacity={0.6} fontSize={14} fontFamily="var(--font-literata), Georgia, serif" textAnchor="middle">
          <line x1={0} y1={d.height + 30} x2={d.width} y2={d.height + 30} stroke="#FFEDD7" strokeOpacity={0.35} strokeWidth={0.8} />
          <text x={d.width / 2} y={d.height + 52}>{`${Math.round(d.width)} mm`}</text>
          <line x1={-30} y1={0} x2={-30} y2={d.height} stroke="#FFEDD7" strokeOpacity={0.35} strokeWidth={0.8} />
          <text x={-44} y={d.height / 2} transform={`rotate(-90 ${-44} ${d.height / 2})`}>{`${Math.round(d.height)} mm`}</text>
        </g>
      </g>
      <g data-dots style={{ opacity: 0 }}>
        {vertices.map((p, i) => (
          <circle key={i} cx={r(p[0])} cy={r(p[1])} r={3.2} fill="#EA5B32" />
        ))}
      </g>
      <text
        data-word
        x={d.width / 2}
        y={d.height / 2 + 75}
        textAnchor="middle"
        fontSize={250}
        fontWeight={600}
        fontFamily="var(--font-hanken), sans-serif"
        fill="none"
        stroke="#FFEDD7"
        strokeOpacity={0.85}
        strokeWidth={1.4}
        style={{ opacity: 0 }}
      >
        SUNRISE
      </text>
    </svg>
  );
}
