"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { getGuide, type Flute, type GuideItem } from "@/i18n/knowledge";
import { cx } from "@/components/ui";

/** Cross-section of a corrugated board, drawn to relative scale (liner–flute–liner, or double wall). */
function FluteSection({ flute, max }: { flute: Flute; max: number }) {
  const W = 360;
  const H = 120;
  const t = 3; // liner
  const total = (flute.thicknessMm / max) * (H - 20);
  const top = (H - total) / 2;
  const walls = flute.wall;
  const wallH = (total - t * (walls + 1)) / walls;
  const period = Math.max(10, wallH * 1.9);
  const wave = (y0: number, h: number) => {
    let d = "";
    for (let x = 0; x <= W; x += 2) {
      const y = y0 + h / 2 + Math.sin((x / period) * Math.PI * 2) * (h / 2 - 1);
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
    }
    return d;
  };
  const liners = Array.from({ length: walls + 1 }, (_, i) => top + i * (wallH + t));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" aria-hidden>
      {liners.map((y, i) => (
        <rect key={i} x={0} y={y} width={W} height={t} fill={i === 0 ? "#EA5B32" : "#C29262"} />
      ))}
      {Array.from({ length: walls }, (_, i) => (
        <path key={i} d={wave(liners[i] + t, wallH)} fill="none" stroke="#B8854F" strokeWidth={1.6} />
      ))}
    </svg>
  );
}

function ItemGrid({ items, swatches }: { items: (GuideItem & { swatch?: string })[]; swatches?: boolean }) {
  return (
    <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <li key={it.title} className="flex flex-col rounded-[12px] border border-cream/10 bg-bark/35 p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="serif num text-sm text-cream/45">{String(i + 1).padStart(2, "0")}</span>
            {it.tag && <span className="eyebrow rounded-[22.5px] border border-cream/25 px-2.5 py-1 text-[10px] font-medium text-cream/70">{it.tag}</span>}
          </div>
          {swatches && it.swatch && <span className={cx("mt-6 block h-16 w-full rounded-[8px] border border-black/20", it.swatch)} />}
          <h4 className="display mt-6 text-[24px] leading-tight text-cream">{it.title}</h4>
          <p className="mt-3 text-sm leading-relaxed text-cream/65">{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

const TABS = ["flutes", "boards", "print", "colour", "finishes", "addons"] as const;

export function CartonGuide() {
  const { locale } = useI18n();
  const g = getGuide(locale);
  const [tab, setTab] = useState<(typeof TABS)[number]>("flutes");
  const max = Math.max(...g.flutes.map((f) => f.thicknessMm));
  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="guide-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="px-4 py-24 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-xs font-medium text-cream/60">{g.eyebrow}</p>
            <h2 id="guide-title" className="display mt-4 text-[41px] leading-[0.9] sm:text-[64px]">
              {g.title}
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-cream/65 lg:justify-self-end">{g.intro}</p>
        </div>

        <div role="tablist" className="mt-12 flex gap-2 overflow-x-auto pb-2">
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cx("shrink-0 rounded-[36px] px-4 py-2 text-xs font-medium transition", tab === k ? "bg-cream text-walnut" : "border border-cream/25 text-cream/70 hover:text-cream")}
            >
              {g.tabs[k]}
            </button>
          ))}
        </div>

        <div key={tab} className="mt-10 animate-rise">
          {tab === "flutes" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-start">
                    {[g.fluteHead.code, "", g.fluteHead.thickness, g.fluteHead.use].map((h, i) => (
                      <th key={i} className="eyebrow px-4 pb-2 text-start text-[11px] font-medium text-cream/45">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.flutes.map((f) => (
                    <tr key={f.code} className="bg-bark/35">
                      <td className="rounded-s-[12px] px-4 py-3">
                        <span className="display block text-[41px] leading-none text-cream">{f.code}</span>
                        <span className="mt-1 block text-[11px] text-cream/55">{f.name}</span>
                      </td>
                      <td className="w-[36%] px-4 py-3">
                        <FluteSection flute={f} max={max} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="serif num text-[29px] font-light text-cream">≈ {f.thicknessMm}</span>
                        <span className="ms-1 text-xs text-cream/55">mm</span>
                      </td>
                      <td className="rounded-e-[12px] px-4 py-3 text-sm text-cream/75">{f.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "boards" && <ItemGrid items={g.boards} />}
          {tab === "print" && <ItemGrid items={g.print} />}
          {tab === "colour" && <ItemGrid items={g.colour} />}
          {tab === "finishes" && <ItemGrid items={g.finishes} swatches />}
          {tab === "addons" && <ItemGrid items={g.addons} />}
        </div>
        <p className="mt-8 text-[11px] text-cream/45">{g.note}</p>
      </div>
    </section>
  );
}
