"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { buttonClass, cx } from "@/components/ui";
import { FACTORY_SERVICES } from "@/lib/factory-services";

const ProductStage = dynamic(() => import("@/components/three/ProductStage"), { ssr: false });

/** Services hero: editorial headline beside the live 3D mailer (same stage as the homepage). */
export function ServicesHero({ body, stats }: { body: string; stats: { value: number; label: string }[] }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  return (
    <section className="relative z-20 overflow-hidden bg-walnut" aria-labelledby="services-title">
      <div aria-hidden className="pointer-events-none absolute -end-40 top-10 size-[520px] rounded-full bg-ember/15 blur-[120px]" />
      <div className="relative grid min-h-[calc(100dvh-4.5rem)] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <nav aria-label={ar ? "مسار الصفحة" : "Breadcrumb"} className="eyebrow flex items-center gap-2 text-[11px] font-medium text-cream/45">
            <Link href={`/${locale}`} className="hover:text-cream">
              {t.common.breadcrumbHome}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-cream/75">{t.nav.services}</span>
          </nav>
          <p className="eyebrow mt-10 text-xs font-medium text-ember">{t.brand.name}</p>
          <h1 id="services-title" className="display mt-4 text-[56px] leading-[0.9] sm:text-[88px] lg:text-[104px]">
            {ar ? "خدماتنا" : "Our services"}
          </h1>
          <p className="display mt-6 max-w-xl text-[22px] leading-snug text-cream/80 sm:text-[28px]">{ar ? "فريق كامل… يعمل من أجل خدمتكم." : "A complete team… working to serve you."}</p>
          {body && <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-cream/60">{body}</p>}
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/studio`} className={buttonClass("primary", "md")}>
              {t.home.ctaDesign}
            </Link>
            <Link href={`/${locale}/quote`} className={buttonClass("outline", "md")}>
              {t.nav.quote}
            </Link>
          </div>
          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-dashed border-cream/25 pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="eyebrow text-[10px] font-medium text-cream/45">{s.label}</dt>
                <dd className="num display mt-2 text-[34px] leading-none">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ProductStage kind="mailer" presenting className="relative h-[52vh] min-h-[340px] lg:h-[72vh]" />
      </div>
    </section>
  );
}

/** Editorial index of the factory's service lines with a sticky preview (images from the company profile). */
export function ServicesIndex() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [active, setActive] = useState(0);
  const s = FACTORY_SERVICES[active];
  const cta = (svc: (typeof FACTORY_SERVICES)[number]) =>
    svc.studioCategory
      ? { href: `/${locale}/studio?category=${svc.studioCategory}`, label: ar ? "صمّمها في الاستوديو" : "Design it in the studio" }
      : { href: `/${locale}/contact`, label: ar ? "اطلب عرض سعر" : "Request a quote" };

  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="services-index-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="px-4 py-24 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-xs font-medium text-cream/60">{ar ? "ما نصنعه" : "What we make"}</p>
            <h2 id="services-index-title" className="display mt-4 text-[41px] leading-[0.9] sm:text-[64px]">
              {ar ? "عشر خدمات، مصنع واحد" : "Ten services, one factory"}
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-cream/65 lg:justify-self-end">
            {ar
              ? "من الكرتون المضلّع وعلب الإنفركوت إلى الأكياس والاستيكرات وورق اللف — كلها مطبوعة بشعارك وتصميمك."
              : "From corrugated and Invercote boxes to bags, stickers and wrapping paper — all printed with your logo and design."}
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          {/* index */}
          <ol>
            {FACTORY_SERVICES.map((svc, i) => {
              const on = i === active;
              const c = cta(svc);
              return (
                <li key={svc.slug} className="border-t border-dashed border-cork last:border-b">
                  <button
                    type="button"
                    aria-expanded={on}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="group flex w-full items-baseline gap-5 py-5 text-start"
                  >
                    <span className={cx("serif num w-8 shrink-0 text-sm transition", on ? "text-ember" : "text-cream/35")}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={cx("display flex-1 text-[28px] leading-tight transition sm:text-[36px]", on ? "text-cream" : "text-cream/40 group-hover:text-cream/70")}>{svc.name[locale]}</span>
                    <span className={cx("eyebrow hidden shrink-0 text-[10px] font-medium transition sm:block", on ? "text-ember" : "text-transparent")}>
                      {svc.studioCategory ? (ar ? "في الاستوديو" : "In the studio") : ar ? "بالطلب" : "On request"}
                    </span>
                  </button>
                  {/* small screens: the preview opens under its row */}
                  {on && (
                    <div className="pb-6 lg:hidden">
                      <div className="relative aspect-[2/1] overflow-hidden rounded-[12px] bg-white">
                        <Image src={svc.image} alt={svc.name[locale]} fill sizes="100vw" className="object-contain" />
                      </div>
                      <Link href={c.href} className="eyebrow mt-4 inline-block text-[11px] font-medium text-ember">
                        {c.label} {ar ? "←" : "→"}
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {/* sticky preview */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="overflow-hidden rounded-[12px] border border-cream/10 bg-white">
                <div className="relative aspect-[2/1]">
                  {FACTORY_SERVICES.map((svc, i) => (
                    <Image
                      key={svc.slug}
                      src={svc.image}
                      alt={i === active ? svc.name[locale] : ""}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className={cx("object-contain transition-opacity duration-500", i === active ? "opacity-100" : "opacity-0")}
                      priority={i === 0}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="serif num text-sm text-cream/45">
                    {String(active + 1).padStart(2, "0")} / {String(FACTORY_SERVICES.length).padStart(2, "0")}
                  </p>
                  <p className="display mt-2 text-[32px] leading-none">{s.name[locale]}</p>
                </div>
                <Link href={cta(s).href} className={buttonClass(s.studioCategory ? "primary" : "outline", "md")}>
                  {cta(s).label}
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-cream/40">{ar ? "الصور نماذج توضيحية من ملف تعريف الشركة." : "Images are illustrative examples from the company profile."}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** About hero: headline, the company's own line and the live 3D paper bag. */
export function AboutHero({ title, lead }: { title: string; lead: string }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  return (
    <section className="relative z-20 overflow-hidden bg-walnut" aria-labelledby="about-title">
      <div aria-hidden className="pointer-events-none absolute -start-40 top-16 size-[520px] rounded-full bg-ember/15 blur-[120px]" />
      <div className="relative grid min-h-[calc(90dvh-4.5rem)] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <nav aria-label={ar ? "مسار الصفحة" : "Breadcrumb"} className="eyebrow flex items-center gap-2 text-[11px] font-medium text-cream/45">
            <Link href={`/${locale}`} className="hover:text-cream">
              {t.common.breadcrumbHome}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-cream/75">{t.nav.about}</span>
          </nav>
          <p className="eyebrow mt-10 text-xs font-medium text-ember">{ar ? "مصنع ضوء الشروق للكرتون والتغليف" : "Sunrise Light Packaging Factory"}</p>
          <h1 id="about-title" className="display mt-4 text-[52px] leading-[0.92] sm:text-[80px] lg:text-[96px]">
            {title}
          </h1>
          {lead && <p className="display mt-7 max-w-xl text-[22px] leading-snug text-cream/80 sm:text-[28px]">{lead}</p>}
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}/products`} className={buttonClass("primary", "md")}>
              {t.nav.products}
            </Link>
            <Link href={`/${locale}/contact`} className={buttonClass("outline", "md")}>
              {t.nav.contact}
            </Link>
          </div>
        </div>
        <ProductStage kind="bag" presenting className="relative h-[48vh] min-h-[340px] lg:h-[70vh]" />
      </div>
    </section>
  );
}
