"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { buttonClass, cx } from "@/components/ui";
import { brandMarkReady, SHOWCASE_DIMS, showcaseCanvases } from "@/components/three/showcase";
import type { SurfaceKey } from "@/packaging/types";

const BoxViewer = dynamic(() => import("@/components/three/BoxViewer"), { ssr: false });

export interface ChooseTemplate {
  code: string;
  engineKey: "rsc" | "mailer" | "rte" | "pizza" | "bag" | "tray";
  name: string;
  description: string;
  limits: { minL: number; maxL: number; minW: number; maxW: number; minH: number; maxH: number };
  printableFaces: number;
  materials: string[];
  validated: boolean;
}

const SHOWCASE_KIND = { rsc: "rsc", mailer: "mailer", rte: "rte", pizza: "pizza", bag: "bag", tray: "tray" } as const;

/** Template comparison: tabs + live 3D preview + spec table (data from the database). */
export function ChooseBox({ templates }: { templates: ChooseTemplate[] }) {
  const { t, locale } = useI18n();
  const st = t.story;
  const [active, setActive] = useState(0);
  const [canvases, setCanvases] = useState<Record<SurfaceKey, HTMLCanvasElement> | null>(null);
  const tpl = templates[active];
  const kind = SHOWCASE_KIND[tpl.engineKey];
  const spec = SHOWCASE_DIMS[kind];

  useEffect(() => {
    let alive = true;
    brandMarkReady().then(() => alive && setCanvases(showcaseCanvases(kind)));
    return () => {
      alive = false;
    };
  }, [kind]);

  const rows = useMemo(
    () => [
      { k: st.chooseRows.closure, v: (x: ChooseTemplate) => st.closures[x.engineKey] },
      { k: st.chooseRows.faces, v: (x: ChooseTemplate) => <span className="num">{x.printableFaces}</span> },
      { k: st.chooseRows.length, v: (x: ChooseTemplate) => <span className="num">{`${x.limits.minL}–${x.limits.maxL} mm`}</span> },
      { k: st.chooseRows.width, v: (x: ChooseTemplate) => <span className="num">{`${x.limits.minW}–${x.limits.maxW} mm`}</span> },
      { k: st.chooseRows.height, v: (x: ChooseTemplate) => <span className="num">{`${x.limits.minH}–${x.limits.maxH} mm`}</span> },
      { k: st.chooseRows.materials, v: (x: ChooseTemplate) => x.materials.join(locale === "ar" ? "، " : ", ") },
      { k: st.chooseRows.status, v: (x: ChooseTemplate) => (x.validated ? st.validated : st.review) },
    ],
    [st, locale],
  );

  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="choose-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="px-4 pt-24 sm:px-8">
        <p className="eyebrow text-center text-xs font-medium text-cream/60">{st.chooseEyebrow}</p>
        <h2 id="choose-title" className="display mt-4 text-center text-[41px] leading-[0.9] sm:text-[64px] lg:text-[80px]">
          {st.chooseTitle}
        </h2>
        <div role="tablist" className="mt-10 flex flex-wrap justify-center gap-2">
          {templates.map((x, i) => (
            <button
              key={x.code}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cx("rounded-[36px] px-4 py-2 text-xs font-medium transition", i === active ? "bg-ember text-cream" : "bg-bark/70 text-cream/70 hover:text-cream")}
            >
              {x.name}
            </button>
          ))}
        </div>

        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_1.4fr_1fr]">
          <div className="lg:self-start lg:pt-16">
            <h3 className="display text-[29px] leading-none">{tpl.name}</h3>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/65">{tpl.description}</p>
          </div>
          <div className="relative h-[46vh] min-h-[320px]">
            {canvases && (
              <BoxViewer
                key={tpl.code}
                className="absolute inset-0"
                dims={spec.dims}
                boxStyle={spec.style}
                canvases={canvases}
                textureVersion={1}
                materialColor={spec.material}
                autoRotate
                interactive
              />
            )}
          </div>
          <ul className="space-y-3 lg:self-start lg:pt-16">
            {[st.closures[tpl.engineKey], `${tpl.printableFaces} ${st.chooseRows.faces}`, tpl.validated ? st.validated : st.review].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-cream/85">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-cream/50 text-[10px]">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* comparison table */}
        <div className="mx-auto mt-14 max-w-6xl overflow-x-auto pb-24">
          <table className="w-full min-w-[1040px] border-separate border-spacing-y-2 text-center">
            <thead>
              <tr>
                <th className="w-[18%]" />
                {templates.map((x, i) => (
                  <th key={x.code} className="px-3 pb-4 align-bottom">
                    <span className="eyebrow block text-[11px] font-medium text-ember">{String(i + 1).padStart(2, "0")}</span>
                    <span className="display mt-1 block text-[18px] leading-tight text-cream sm:text-[24px]">{x.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className="bg-bark/40">
                  <th scope="row" className="eyebrow rounded-s-[12px] px-4 py-3 text-start text-[11px] font-medium text-cream/50">
                    {r.k}
                  </th>
                  {templates.map((x, i) => (
                    <td key={x.code} className={cx("px-3 py-3 text-xs font-medium text-cream/90", i === templates.length - 1 && "rounded-e-[12px]")}>
                      {r.v(x)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {templates.map((x) => (
                  <td key={x.code} className="px-3 pt-4">
                    <Link href={`/${locale}/studio?template=${x.code}`} className={buttonClass("outline", "sm")}>
                      {t.pages.designNow}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-center text-[11px] text-cream/45">{st.chooseLimitsNote}</p>
        </div>
      </div>
    </section>
  );
}
