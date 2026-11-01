"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadImage } from "@/design/render";
import { Spinner, buttonClass, cx } from "@/components/ui";
import { BACKDROPS, BackdropPicker } from "@/components/three/Backdrops";
import { openingFor, openingLabel } from "@/components/three/opening-label";
import { getEngine } from "@/packaging/engine";
import type { Dimensions, SurfaceKey } from "@/packaging/types";

const BoxViewer = dynamic(() => import("@/components/three/BoxViewer"), { ssr: false });

export interface ShareSpec {
  name: string;
  engineKey: string;
  nameAr: string;
  nameEn: string;
  dimensions: Dimensions;
  materialColor: string;
  insideColor: string | null;
  addons: string[];
}

/** The public 3D view: it only ever receives the flat, watermarked face images. */
export function ShareViewer({ token, spec, locale }: { token: string; spec: ShareSpec; locale: string }) {
  const ar = locale === "ar";
  const engine = getEngine(spec.engineKey);
  const opening = openingFor(engine.key);
  const host = useRef<HTMLDivElement>(null);
  const [canvases, setCanvases] = useState<Record<SurfaceKey, HTMLCanvasElement> | null>(null);
  const [failed, setFailed] = useState(false);
  const [spin, setSpin] = useState(true);
  const [lid, setLid] = useState(false);
  const [backdrop, setBackdrop] = useState(BACKDROPS[0].color);

  useEffect(() => {
    let live = true;
    Promise.all(
      engine.surfaces(spec.dimensions).map(async ({ key }) => {
        const img = await loadImage(`/api/share/${token}/${key}`);
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        return [key, c] as const;
      }),
    )
      .then((faces) => live && setCanvases(Object.fromEntries(faces) as Record<SurfaceKey, HTMLCanvasElement>))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [engine, spec.dimensions, token]);

  const chip = "rounded-full px-3 py-1.5 text-xs font-semibold transition";
  return (
    <main className="flex h-[calc(100dvh-4.5rem)] min-h-[560px] flex-col bg-[#050505] pt-4 text-cream">
      <div className="flex w-full flex-wrap items-end justify-between gap-3 px-4 pb-3 sm:px-8">
        <div>
          <p className="text-xs text-[#E2BC6B]">{ar ? "معاينة ثلاثية الأبعاد" : "3D preview"}</p>
          <h1 className="display mt-1 text-2xl text-cream">{spec.name}</h1>
          <p className="num mt-1 text-xs text-cream/60">
            {ar ? spec.nameAr : spec.nameEn} · {spec.dimensions.length} × {spec.dimensions.width} × {spec.dimensions.height} mm
          </p>
        </div>
        <Link href={`/${locale}/studio`} className={buttonClass("outline", "sm")}>
          {ar ? "صمّم عبوتك" : "Design your own"}
        </Link>
      </div>

      <div ref={host} className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {failed ? (
          <p className="grid h-full place-items-center text-sm text-cream/70">{ar ? "تعذر تحميل المعاينة." : "The preview could not be loaded."}</p>
        ) : !canvases ? (
          <div className="grid h-full place-items-center text-[#E2BC6B]">
            <Spinner />
          </div>
        ) : (
          <BoxViewer
            className="absolute inset-0"
            background={backdrop}
            dims={spec.dimensions}
            boxStyle={engine.boxStyle}
            canvases={canvases}
            textureVersion={1}
            materialColor={spec.materialColor}
            insideColor={spec.insideColor}
            addons={spec.addons}
            lidOpen={lid}
            opening={opening}
            autoRotate={spin}
            fallback={<p className="grid h-full place-items-center p-6 text-center text-sm text-cream/70">{ar ? "متصفحك لا يدعم العرض ثلاثي الأبعاد." : "Your browser does not support 3D."}</p>}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Sunrise Light" className="pointer-events-none absolute end-4 top-4 w-32 select-none opacity-50" draggable={false} />
        <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/70 p-1.5 backdrop-blur">
            <button onClick={() => setSpin((s) => !s)} aria-pressed={spin} className={cx(chip, spin ? "bg-[#E2BC6B] text-black" : "text-cream hover:bg-white/10")}>
              {ar ? "دوران 360°" : "360° spin"}
            </button>
            {opening && (
              <button onClick={() => setLid((o) => !o)} aria-pressed={lid} className={cx(chip, lid ? "bg-[#E2BC6B] text-black" : "text-cream hover:bg-white/10")}>
                {openingLabel(opening, lid, locale)}
              </button>
            )}
            <BackdropPicker value={backdrop} onChange={setBackdrop} locale={locale} />
            <button onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : host.current?.requestFullscreen())} className={cx(chip, "text-cream hover:bg-white/10")}>
              {ar ? "ملء الشاشة" : "Fullscreen"}
            </button>
          </div>
        </div>
      </div>
      <p className="px-4 py-3 text-center text-[11px] text-cream/50">
        {ar ? "معاينة للعرض فقط. التصميم والعلامة التجارية محفوظان، ولا يُسمح باستخدام هذه المعاينة أو طباعتها." : "For viewing only. This preview may not be used or printed."}
      </p>
    </main>
  );
}
