"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { useI18n } from "@/i18n/client";
import { buttonClass, cx } from "@/components/ui";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { ScrollDriver, useTimelineStyler } from "./ScrollDriver";
import { Chapter, DimensionCounter, KineticText, useHorizontalScrub } from "./Overlays";
import { Blueprint } from "./Blueprint";
import { CH, CINEMA_SCREENS, window4 } from "./scroll";
import { featureAt, finishStageAt, lightAt } from "./story";

const ExperienceScene = dynamic(() => import("./ExperienceScene"), { ssr: false });

export interface GalleryCategory {
  slug: string;
  name: string;
  description: string;
  active: boolean;
}

const display = "display leading-[0.88] text-cream";

/** Text colour flips to walnut while the daylight (cream) chapter is on screen. */
function useInkFlip(ref: React.RefObject<HTMLElement | null>) {
  useTimelineStyler((s) => {
    if (ref.current) ref.current.style.color = lightAt(s) > 0.5 ? "#100904" : "";
  });
}

/** Frosted feature panel that cross-fades between the three features. */
function FeaturePanels() {
  const { t } = useI18n();
  const items = t.story.features;
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const formula = useRef<(HTMLDivElement | null)[]>([]);
  useTimelineStyler((s) => {
    const { span } = featureAt(s);
    items.forEach((_, i) => {
      const a = CH.features[0] + i * span;
      const o = window4(s, a + 0.05, a + 0.3, a + span - 0.25, a + span);
      for (const el of [refs.current[i], formula.current[i]]) {
        if (!el) continue;
        el.style.opacity = String(o);
        el.style.filter = o > 0.99 ? "none" : `blur(${(1 - o) * 10}px)`;
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
    });
  });
  return (
    <>
      <Chapter range={[CH.features[0] - 0.05, CH.features[0] + 0.25, CH.features[1] - 0.3, CH.features[1]]} className="inset-y-0 start-0 w-full sm:w-[34vw] sm:min-w-[340px]" rise={0}>
        <div className="relative h-full border-e border-cream/10 bg-walnut/45 backdrop-blur-2xl">
          {items.map((f, i) => (
            <div key={f.title} ref={(el) => void (refs.current[i] = el)} className="absolute inset-0 flex flex-col justify-between px-6 pt-28 pb-16 sm:px-8" style={{ opacity: 0, visibility: "hidden" }}>
              <div>
                <span className="grid size-14 place-items-center rounded-full border border-cream/20 bg-cream/10">
                  <span className="serif num text-xl text-cream">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <p className="eyebrow mt-8 text-xs font-medium text-cream/60">{f.label}</p>
                <h3 className="display mt-3 text-[29px] leading-[1] text-cream">{f.title}</h3>
                <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-cream/75">{f.body}</p>
              </div>
              <div>
                <div className="rule-cream mb-5" />
                <p className="display text-[29px] leading-[0.95] text-cream sm:text-[34px]">{f.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Chapter>
      {items.map((f, i) => (
        <div key={f.formula} ref={(el) => void (formula.current[i] = el)} className="pointer-events-none absolute end-4 bottom-20 hidden text-end sm:end-8 sm:block" style={{ opacity: 0, visibility: "hidden" }}>
          <span className="eyebrow block text-[11px] font-medium text-cream/55">{f.label}</span>
          <span className="serif num mt-2 block text-[34px] text-cream lg:text-[44px]">{f.formula}</span>
        </div>
      ))}
    </>
  );
}

/** Finishes lab overlay: heading, stage indicator and the active finish's description. */
function FinishStages() {
  const { t } = useI18n();
  const st = t.story;
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const tabs = useRef<(HTMLSpanElement | null)[]>([]);
  useTimelineStyler((s) => {
    const { span } = finishStageAt(s);
    st.finishStages.forEach((_, i) => {
      const a = CH.finish[0] + i * span;
      const o = window4(s, a + 0.05, a + 0.25, a + span - 0.2, a + span);
      const el = blocks.current[i];
      if (el) {
        el.style.opacity = String(o);
        el.style.filter = o > 0.99 ? "none" : `blur(${(1 - o) * 10}px)`;
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
      const tab = tabs.current[i];
      if (tab) tab.style.opacity = String(0.35 + 0.65 * o);
    });
  });
  return (
    <>
      <Chapter range={[CH.finish[0] + 0.05, CH.finish[0] + 0.35, CH.finish[1] - 0.3, CH.finish[1]]} className="inset-x-4 top-[14vh] flex flex-wrap items-end justify-between gap-6 sm:inset-x-8">
        <div>
          <p className="eyebrow text-xs font-medium text-cream/60">{st.finishEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[51px]")}>{st.finishTitle}</h2>
        </div>
        <div className="flex gap-6">
          {st.finishStages.map((f, i) => (
            <span key={f.title} ref={(el) => void (tabs.current[i] = el)} className="flex items-center gap-2 text-xs font-medium text-cream" style={{ opacity: 0.35 }}>
              <span className="serif num text-sm">{String(i + 1).padStart(2, "0")}</span>
              {f.title}
            </span>
          ))}
        </div>
      </Chapter>
      {st.finishStages.map((f, i) => (
        <div key={f.title} ref={(el) => void (blocks.current[i] = el)} className="pointer-events-none absolute inset-x-4 bottom-20 grid gap-4 sm:inset-x-8 md:grid-cols-[1fr_1fr] md:items-end" style={{ opacity: 0, visibility: "hidden" }}>
          <p className="display text-[51px] leading-[0.9] text-cream sm:text-[72px]">{f.title}</p>
          <div className="md:text-end">
            <p className="eyebrow text-[11px] font-medium text-ember">{f.tag}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-cream/80 md:ms-auto md:max-w-md">{f.body}</p>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Homepage cinematic: one fixed WebGL scene + chapter overlays scrubbed by scroll,
 * followed by a pinned horizontal category gallery.
 */
export function Experience({ categories }: { categories: GalleryCategory[] }) {
  const { t, locale } = useI18n();
  const b = `/${locale}`;
  const st = t.story;
  const lightLayer = useRef<HTMLDivElement>(null);
  useInkFlip(lightLayer);

  return (
    <>
      <ScrollDriver hint={st.hint} />
      <ExperienceScene />

      {/* overlays */}
      <div className="pointer-events-none fixed inset-0 z-10">
        {/* 0 — measured on the mat */}
        <Chapter range={[-1, -0.5, 0.35, 0.8]} className="inset-x-0 bottom-20 flex flex-col items-center gap-2 px-4 text-center">
          <span className="eyebrow text-[11px] font-medium text-cream/70">{t.editorial.serial}</span>
          <span className="display text-[24px] text-cream sm:text-[29px]">{st.intro}</span>
        </Chapter>

        {/* 1 — title */}
        <Chapter range={[0.75, 1.1, 2.0, 2.4]} className="inset-x-0 top-[12vh] px-4 text-center sm:px-8">
          <h1 className={cx(display, "text-[clamp(52px,10.5vw,170px)]")}>
            <KineticText text={t.home.heroTitle} range={[0.7, 1.55]} />
          </h1>
          <p className="display mt-3 text-[15px] text-ember sm:text-[18px]">{st.titleKicker}</p>
        </Chapter>
        <Chapter range={[1.05, 1.4, 2.0, 2.4]} className="inset-x-4 bottom-20 grid gap-6 sm:inset-x-8 md:grid-cols-[1fr_1fr] md:items-end">
          <p className="display max-w-sm text-[18px] leading-snug text-cream sm:text-[24px]">{t.home.heroSubtitle}</p>
          <div className="flex flex-col items-start gap-5 md:items-end">
            <p className="max-w-md text-sm leading-relaxed text-cream/70 md:text-end">{t.home.heroBody}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`${b}/studio`} className={buttonClass("primary", "md")}>
                {t.home.ctaDesign}
              </Link>
              <Link href={`${b}/products`} className={buttonClass("outline", "md")}>
                {t.home.ctaProducts}
              </Link>
            </div>
          </div>
        </Chapter>

        {/* 2 — unfold */}
        <Chapter range={[2.45, 2.85, 3.55, 3.9]} className="start-4 top-[18vh] max-w-md sm:start-8">
          <p className="eyebrow text-xs font-medium text-cream/60">{st.unfoldEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[51px]")}>{st.unfoldTitle}</h2>
          <div className="rule-cream my-6" />
          <p className="text-[15px] leading-relaxed text-cream/80 sm:text-[18px]">{st.unfoldBody}</p>
        </Chapter>
        <Chapter range={[2.7, 3.0, 3.55, 3.85]} className="end-4 bottom-20 flex flex-col gap-3 sm:end-8">
          <span className="eyebrow flex items-center gap-3 text-xs font-medium text-cream">
            <span className="h-0.5 w-10 bg-[#E0301E]" />
            {st.cutLine}
          </span>
          <span className="eyebrow flex items-center gap-3 text-xs font-medium text-cream">
            <span className="w-10 border-t-2 border-dashed border-cream" />
            {st.foldLine}
          </span>
        </Chapter>

        {/* 3 — resize */}
        <Chapter range={[3.95, 4.25, 4.95, 5.25]} className="start-4 top-[16vh] max-w-md sm:start-8">
          <p className="eyebrow text-xs font-medium text-cream/60">{st.resizeEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[51px]")}>{st.resizeTitle}</h2>
        </Chapter>
        <Chapter range={[4.0, 4.3, 4.95, 5.25]} className="inset-x-4 bottom-20 flex flex-col gap-5 sm:inset-x-8 md:flex-row md:items-end md:justify-between">
          <DimensionCounter className={cx("serif text-cream", "text-[clamp(40px,6vw,96px)] leading-none font-light whitespace-nowrap")} />
          <p className="max-w-sm text-[15px] leading-relaxed text-cream/80">{st.resizeBody}</p>
        </Chapter>

        {/* 4 — print */}
        <Chapter range={[5.25, 5.55, 6.25, 6.55]} className="end-4 top-[20vh] max-w-md sm:end-8">
          <p className="eyebrow text-xs font-medium text-cream/60">{st.printEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[51px]")}>{st.printTitle}</h2>
          <div className="rule-cream my-6" />
          <p className="text-[15px] leading-relaxed text-cream/80 sm:text-[18px]">{st.printBody}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {(locale === "ar" ? ["لون واحد", "لونان", "كامل الألوان", "ورنيش", "سلوفان"] : ["1 colour", "2 colours", "Full colour", "Varnish", "Lamination"]).map((c) => (
              <li key={c} className="rounded-[22.5px] border border-cream/40 px-3 py-1.5 text-xs font-medium text-cream/85">
                {c}
              </li>
            ))}
          </ul>
        </Chapter>

        {/* 4b — finishes lab (foil, emboss, spot UV) */}
        <FinishStages />

        {/* 5 — corrugated macro */}
        <Chapter range={[8.7, 9.05, 9.55, 9.9]} className="start-4 top-[16vh] max-w-sm sm:start-8">
          <p className="eyebrow text-xs font-medium text-cream/60">{st.macroEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[51px]")}>{st.macroTitle}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-cream/80">{st.macroBody}</p>
        </Chapter>
        <Chapter range={[8.85, 9.15, 9.55, 9.9]} className="end-4 bottom-20 sm:end-8">
          <ol className="space-y-2">
            {st.macroParts.map((p, i) => (
              <li key={p} className="flex items-center justify-end gap-3 text-xs font-medium text-cream">
                {p}
                <span className={cx("h-3 w-10 rounded-sm", i === 0 ? "bg-[#C2470C]" : i === 1 ? "bg-[#B8854F]" : "bg-[#C29262]")} />
              </li>
            ))}
          </ol>
        </Chapter>

        {/* 6 — features (frosted panel + formula) */}
        <FeaturePanels />

        {/* 7 — family */}
        <Chapter range={[12.8, 13.2, 13.9, 14.2]} className="inset-x-0 top-[13vh] px-4 text-center">
          <p className="eyebrow text-xs font-medium text-cream/60">{st.familyEyebrow}</p>
          <h2 className={cx(display, "mt-4 text-[41px] sm:text-[64px]")}>{st.familyTitle}</h2>
        </Chapter>
        <Chapter range={[13.0, 13.35, 13.9, 14.2]} className="inset-x-4 bottom-20 sm:inset-x-8">
          <ul className="grid grid-cols-3 gap-[18px] md:grid-cols-6">
            {st.familyItems.map((it, i) => (
              <li key={it} className="border-t border-dashed border-cream/40 pt-3">
                <span className="serif num text-[13px] text-cream/50">{String(i + 1).padStart(2, "0")}</span>
                <span className="display mt-1 block text-[15px] text-cream">{it}</span>
              </li>
            ))}
          </ul>
        </Chapter>

        {/* 8 — blueprint */}
        <Chapter range={[14.2, 14.5, 15.7, 16.05]} className="inset-0 flex flex-col" rise={0}>
          <div className="px-4 pt-24 text-center sm:px-8">
            <p className="eyebrow text-xs font-medium text-cream/60">{st.blueprintEyebrow}</p>
            <h2 className={cx(display, "mt-3 text-[29px] sm:text-[41px]")}>{st.blueprintTitle}</h2>
          </div>
          <div className="min-h-0 flex-1 px-4 pb-24 sm:px-16">
            <Blueprint />
          </div>
          <p className="absolute inset-x-0 bottom-14 px-4 text-center text-[11px] text-cream/50">{st.blueprintNote}</p>
        </Chapter>

        {/* 9 — giant word on daylight + facts */}
        <div ref={lightLayer} className="absolute inset-0">
          <Chapter range={[16.1, 16.45, 17.3, 17.7]} className="inset-x-0 top-[22vh] px-4 sm:px-8" rise={0}>
            <p className="eyebrow mb-2 text-sm font-medium opacity-70 sm:text-base">{st.wordEyebrow}</p>
            <p className="display text-[clamp(56px,13vw,230px)] leading-[0.85] font-semibold tracking-[0.01em] whitespace-nowrap">
              <KineticText text={st.word} range={[16.05, 16.7]} />
            </p>
            <p className="mx-auto mt-8 max-w-md text-center text-[15px] leading-relaxed opacity-80 sm:text-[18px]">{st.wordBody}</p>
          </Chapter>
          <Chapter range={[16.6, 16.95, 17.3, 17.7]} className="inset-x-4 bottom-16 sm:inset-x-8">
            <ul className="grid grid-cols-2 gap-[18px] md:grid-cols-4">
              {st.wordFacts.map((f) => (
                <li key={f.t} className="rounded-[12px] bg-[#e7d5bc]/70 p-5">
                  <span className="serif num block text-[44px] leading-none font-light">{f.n}</span>
                  <span className="display mt-4 block text-[15px] leading-tight">{f.t}</span>
                  <span className="mt-2 block text-xs leading-relaxed opacity-70">{f.d}</span>
                </li>
              ))}
            </ul>
          </Chapter>
        </div>
      </div>

      {/* scroll track that drives the cinematic */}
      <div aria-hidden style={{ height: `${CINEMA_SCREENS * 100}dvh` }} />
      <Gallery categories={categories} />
    </>
  );
}

const CARD_TONES = ["bg-bark", "bg-mat", "bg-[#5a2a10]", "bg-[#2a221c]", "bg-[#6c6153]", "bg-[#1f2a2f]", "bg-[#3a2a1c]", "bg-[#4a1e0c]"];

function Gallery({ categories }: { categories: GalleryCategory[] }) {
  const { t, locale } = useI18n();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useHorizontalScrub(section, track, locale === "ar");
  return (
    <section ref={section} className="relative z-20 bg-walnut" style={{ height: `${Math.max(2, categories.length * 0.6) * 100}dvh` }} aria-labelledby="gallery-title">
      <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden">
        <div className="mb-8 flex items-end justify-between gap-6 px-4 sm:px-8">
          <div>
            <p className="eyebrow text-xs font-medium text-cream/60">{t.story.galleryEyebrow}</p>
            <h2 id="gallery-title" className={cx(display, "mt-3 text-[41px] sm:text-[51px]")}>
              {t.story.galleryTitle}
            </h2>
          </div>
          <Link href={`/${locale}/products`} className="eyebrow border-b border-dashed border-cream pb-0.5 text-xs font-medium text-cream">
            {t.home.ctaProducts}
          </Link>
        </div>
        <div ref={track} className="flex w-max gap-[18px] px-4 will-change-transform sm:px-8">
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              href={`/${locale}/products/${c.slug}`}
              className={cx("group relative flex h-[64vh] w-[80vw] shrink-0 flex-col justify-between overflow-hidden rounded-[12px] p-6 sm:w-[46vw] lg:w-[38vw]", CARD_TONES[i % CARD_TONES.length])}
            >
              <div className="relative z-10 flex items-start justify-between">
                <span className="serif num text-sm text-cream/60">{String(i + 1).padStart(2, "0")}</span>
                <span className="eyebrow rounded-[22.5px] border border-cream/40 px-3 py-1 text-[11px] font-medium text-cream/85">{c.active ? t.pages.designNow : t.common.comingSoon}</span>
              </div>
              <CategoryIcon slug={c.slug} className="absolute end-[-6%] bottom-[-8%] size-[62%] text-cream/[0.08] transition duration-700 group-hover:text-cream/15" />
              {/* giant word crossing the card, ORYZO-style */}
              <p className="display pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-[clamp(44px,6.4vw,104px)] leading-[0.9] font-semibold text-cream">{c.name}</p>
              <p className="relative z-10 max-w-sm text-sm text-cream/75">{c.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
