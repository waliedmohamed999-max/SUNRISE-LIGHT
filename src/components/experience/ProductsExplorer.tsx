"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/client";
import { buttonClass, cx, inputClass } from "@/components/ui";
import { brandMarkReady } from "@/components/three/showcase";
import { catalogCanvases } from "@/components/three/catalog-art";
import { INDUSTRIES } from "@/packaging/industries";
import { formatDims } from "@/packaging/sizes";
import type { BoxStyle, SurfaceKey } from "@/packaging/types";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-data";

const BoxViewer = dynamic(() => import("@/components/three/BoxViewer"), { ssr: false });

/** Studio render of each catalogue template (public/products/<code>.webp). */
const productImage = (code: string) => `/products/${code}.webp`;

/* ───────────────────────── hero ───────────────────────── */

/** Products hero (catalogue and category pages): headline beside a composition of real product renders. */
export function ProductsHero({ title, body, crumbs, stats, showcase, category }: { title: string; body: string; crumbs: { label: string; href?: string }[]; stats: { value: number; label: string }[]; showcase: string[]; category?: string }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const [a, b, c] = showcase;
  return (
    <section className="relative z-20 overflow-hidden bg-walnut" aria-labelledby="products-title">
      <div aria-hidden className="pointer-events-none absolute end-[-10%] top-[-20%] size-[720px] rounded-full bg-ember/12 blur-[140px]" />
      <div className="relative grid gap-10 px-4 pt-12 pb-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-16">
        <div>
          <nav aria-label={ar ? "مسار الصفحة" : "Breadcrumb"} className="eyebrow flex flex-wrap items-center gap-2 text-[11px] font-medium text-cream/45">
            {crumbs.map((cr, i) => (
              <span key={cr.label} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {cr.href ? (
                  <Link href={cr.href} className="hover:text-cream">
                    {cr.label}
                  </Link>
                ) : (
                  <span className="text-cream/75">{cr.label}</span>
                )}
              </span>
            ))}
          </nav>
          <p className="eyebrow mt-10 text-xs font-medium text-ember">{t.brand.name}</p>
          <h1 id="products-title" className="display mt-4 text-[52px] leading-[0.9] sm:text-[80px] lg:text-[96px]">
            {title}
          </h1>
          {body && <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-cream/65">{body}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#catalogue" className={buttonClass("primary", "md")}>
              {ar ? "تصفّح المنتجات" : "Browse products"}
            </a>
            {/* on a category page the studio opens straight on that category's first template */}
            <Link href={`/${locale}/studio${category ? `?category=${encodeURIComponent(category)}` : ""}`} className={buttonClass("outline", "md")}>
              {t.home.ctaDesign}
            </Link>
          </div>
          {stats.length > 0 && (
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-dashed border-cream/20 pt-7">
              {stats.map((s) => (
                <div key={s.label}>
                  <dd className="num display text-[36px] leading-none">{s.value}</dd>
                  <dt className="eyebrow mt-2 text-[10px] font-medium text-cream/45">{s.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
        {a && (
          <div aria-hidden className="relative mx-auto aspect-[5/4] w-full max-w-[640px]">
            <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(234_91_50/0.22),transparent)]" />
            <Image src={productImage(a)} alt="" width={1200} height={900} priority className="absolute start-[2%] top-[6%] w-[64%] drop-shadow-[0_40px_40px_rgb(0_0_0/0.55)]" />
            {b && <Image src={productImage(b)} alt="" width={1200} height={900} priority className="absolute end-[0%] top-[0%] w-[52%] drop-shadow-[0_40px_40px_rgb(0_0_0/0.55)]" />}
            {c && <Image src={productImage(c)} alt="" width={1200} height={900} className="absolute end-[14%] bottom-[0%] w-[50%] drop-shadow-[0_40px_40px_rgb(0_0_0/0.55)]" />}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── tile ───────────────────────── */

function ProductTile({ p, onOpen }: { p: CatalogProduct; onOpen: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [broken, setBroken] = useState(false);
  return (
    <li className="group relative">
      <button type="button" onClick={onOpen} aria-label={`${p.name} — ${ar ? "معاينة سريعة" : "quick view"}`} className="block w-full text-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-cream/8 bg-[radial-gradient(120%_90%_at_50%_30%,#3a2618_0%,#1c120c_60%,#140c07_100%)] transition duration-500 group-hover:border-cream/25">
          <div aria-hidden className="absolute inset-x-[18%] bottom-[10%] h-[12%] rounded-full bg-black/40 blur-xl" />
          {!broken ? (
            <Image
              src={productImage(p.code)}
              alt={p.name}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
              onError={() => setBroken(true)}
              className="object-contain p-[6%] transition duration-700 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-cream/40">{p.name}</div>
          )}
          <span className="eyebrow pointer-events-none absolute start-3 top-3 rounded-full bg-walnut/70 px-2.5 py-1 text-[9px] font-medium text-cream/70 opacity-0 backdrop-blur transition group-hover:opacity-100">
            {ar ? "معاينة ثلاثية الأبعاد" : "3D quick view"}
          </span>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-medium text-cream">{p.name}</p>
            <p className="num mt-1 truncate text-[11px] whitespace-nowrap text-cream/45 sm:text-[12px]" dir="ltr">
              {formatDims(p.defaults, p.boxStyle)}
            </p>
          </div>
          <span className="mt-1 hidden shrink-0 -space-x-1 sm:flex rtl:space-x-reverse">
            {p.materials.slice(0, 4).map((m) => (
              <span key={m.name} title={m.name} className="size-3.5 rounded-full border border-walnut" style={{ background: m.color }} />
            ))}
          </span>
        </div>
      </button>
      <Link
        href={`/${locale}/studio?template=${p.code}`}
        className="eyebrow absolute end-3 top-3 rounded-full bg-ember px-3 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 focus:opacity-100"
      >
        {ar ? "صمّم" : "Design"}
      </Link>
    </li>
  );
}

/* ───────────────────────── quick view ───────────────────────── */

function QuickView({ p, category, onClose, onPrev, onNext }: { p: CatalogProduct; category?: string; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const [canvases, setCanvases] = useState<Record<SurfaceKey, HTMLCanvasElement> | null>(null);
  const [version, setVersion] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    brandMarkReady().then(() => {
      if (!alive) return;
      setCanvases(catalogCanvases(p));
      setVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, [p]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") (ar ? onNext : onPrev)?.();
      if (e.key === "ArrowRight") (ar ? onPrev : onNext)?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext, ar]);

  const industryName = (k: string) => INDUSTRIES.find((i) => i.key === k)?.[locale] ?? k;
  const specs: [string, string][] = [
    [ar ? "المقاس الافتراضي" : "Default size", formatDims(p.defaults, p.boxStyle)],
    [ar ? "الأوجه القابلة للطباعة" : "Printable faces", String(p.printableFaces)],
    [ar ? "الطول" : "Length", `${p.limits.minL}–${p.limits.maxL} mm`],
    [ar ? "العرض" : "Width", `${p.limits.minW}–${p.limits.maxW} mm`],
    [ar ? "الارتفاع" : "Height", `${p.limits.minH}–${p.limits.maxH} mm`],
    [ar ? "المخطط" : "Dieline", p.validated ? (ar ? "معتمد هندسيًا" : "Engineering-validated") : ar ? "يُراجع مع الطلب" : "Reviewed with each order"],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="qv-title">
      <button type="button" aria-label={ar ? "إغلاق" : "Close"} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative grid max-h-[100dvh] w-full max-w-6xl overflow-y-auto rounded-t-[20px] border border-cream/10 bg-walnut text-cream shadow-[0_40px_120px_-20px_rgb(0_0_0/0.8)] sm:max-h-[92dvh] sm:rounded-[20px] lg:grid-cols-[1.15fr_1fr] lg:overflow-hidden">
        {/* viewer */}
        <div className="relative h-[46vh] min-h-[300px] bg-[radial-gradient(110%_90%_at_50%_35%,#3a2618_0%,#160e08_70%)] lg:h-auto lg:min-h-[560px]">
          {canvases ? (
            <BoxViewer
              className="absolute inset-0"
              dims={p.defaults}
              boxStyle={p.boxStyle as BoxStyle}
              canvases={canvases}
              textureVersion={version}
              materialColor={p.displayColor}
              size={p.boxStyle === "bag" ? 1.45 : 1.85}
              autoRotate
              preset="iso"
              fallback={<Image src={productImage(p.code)} alt={p.name} fill className="object-contain p-10" />}
            />
          ) : (
            <Image src={productImage(p.code)} alt={p.name} fill className="object-contain p-10" />
          )}
          <button type="button" onClick={onClose} aria-label={ar ? "إغلاق" : "Close"} className="absolute end-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-cream/20 bg-walnut/70 text-cream backdrop-blur lg:hidden">
            ✕
          </button>
          <span className="eyebrow pointer-events-none absolute start-4 bottom-4 rounded-full bg-walnut/70 px-3 py-1 text-[10px] font-medium text-cream/70 backdrop-blur">
            {ar ? "اسحب للتدوير · مطبوع بشعار المصنع للعرض" : "Drag to rotate · shown with the factory logo"}
          </span>
          {(onPrev || onNext) && (
            <div className="absolute end-4 bottom-4 flex gap-2">
              {[
                { fn: ar ? onNext : onPrev, label: ar ? "التالي" : "Previous", glyph: "←" },
                { fn: ar ? onPrev : onNext, label: ar ? "السابق" : "Next", glyph: "→" },
              ].map((b) => (
                <button key={b.glyph} type="button" onClick={b.fn} disabled={!b.fn} aria-label={b.label} className="grid size-10 place-items-center rounded-full border border-cream/20 bg-walnut/70 text-cream backdrop-blur transition hover:border-cream/50 disabled:opacity-30">
                  {b.glyph}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div className="flex flex-col p-6 sm:p-8 lg:max-h-[92dvh] lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow text-[10px] font-medium text-ember">{category}</p>
            <button ref={closeRef} type="button" onClick={onClose} aria-label={ar ? "إغلاق" : "Close"} className="grid size-9 shrink-0 place-items-center rounded-full border border-cream/20 text-cream/80 transition hover:border-cream/50 hover:text-cream">
              ✕
            </button>
          </div>
          <h2 id="qv-title" className="display mt-1 text-[36px] leading-[0.95] sm:text-[44px]">
            {p.name}
          </h2>
          {p.description && <p className="mt-4 text-[15px] leading-relaxed text-cream/65">{p.description}</p>}

          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-cream/10 bg-cream/10 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="bg-walnut p-3.5">
                <dt className="eyebrow text-[10px] font-medium text-cream/45">{k}</dt>
                <dd className="num mt-1 font-medium text-cream" dir={/mm$|^\d+$/.test(v) ? "ltr" : undefined}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          {p.materials.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-2.5 text-[10px] font-medium text-cream/45">{ar ? "الخامات المتاحة" : "Available materials"}</p>
              <ul className="flex flex-wrap gap-2">
                {p.materials.map((m) => (
                  <li key={m.name} className="flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1.5 text-xs text-cream/80">
                    <span className="size-3 rounded-full border border-cream/20" style={{ background: m.color }} />
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.industries.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-2.5 text-[10px] font-medium text-cream/45">{ar ? "مناسب لـ" : "Suits"}</p>
              <ul className="flex flex-wrap gap-2">
                {p.industries.map((k) => (
                  <li key={k}>
                    <Link href={`/${locale}/products?industry=${k}`} className="block rounded-full bg-cream/8 px-3 py-1.5 text-xs text-cream/75 transition hover:bg-cream/15">
                      {industryName(k)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-3 pt-8">
            <Link href={`/${locale}/studio?template=${p.code}`} className={buttonClass("primary", "lg", "flex-1")}>
              {ar ? "صمّم هذا المنتج" : "Design this product"}
            </Link>
            <Link href={`/${locale}/contact#contact-form`} className={buttonClass("outline", "lg")}>
              {t.nav.quote}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── catalogue ───────────────────────── */

/** Catalogue: category chips, search and industry filter, product tiles by category, 3D quick view. */
export function ProductsExplorer({ categories, products, initialCategory }: { categories: CatalogCategory[]; products: CatalogProduct[]; initialCategory?: string }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const [cat, setCat] = useState<string>(initialCategory ?? "all");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // deep links: ?category=…&industry=…&p=…
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("category");
    if (!initialCategory && c && categories.some((x) => x.slug === c)) setCat(c);
    const ind = sp.get("industry");
    if (ind && INDUSTRIES.some((i) => i.key === ind)) setIndustry(ind);
    const p = sp.get("p");
    if (p && products.some((x) => x.code === p)) setOpen(p);
  }, [categories, products, initialCategory]);

  // keep the URL shareable
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const put = (k: string, v: string | null) => (v ? sp.set(k, v) : sp.delete(k));
    if (!initialCategory) put("category", cat === "all" ? null : cat);
    put("industry", industry || null);
    put("p", open);
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [cat, industry, open, initialCategory]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) => (cat === "all" || p.category === cat) && (!industry || p.industries.includes(industry)) && (!s || p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.code.includes(s)),
    );
  }, [products, cat, q, industry]);

  const groups = categories.map((c) => ({ ...c, items: filtered.filter((p) => p.category === c.slug) })).filter((g) => g.items.length);
  const selectedCategory = categories.find((c) => c.slug === cat);
  const openIndex = open ? filtered.findIndex((p) => p.code === open) : -1;
  const openProduct = open ? products.find((p) => p.code === open) : undefined;
  const close = useCallback(() => setOpen(null), []);
  const prev = openIndex > 0 ? () => setOpen(filtered[openIndex - 1].code) : undefined;
  const next = openIndex >= 0 && openIndex < filtered.length - 1 ? () => setOpen(filtered[openIndex + 1].code) : undefined;

  const chip = (on: boolean) => cx("shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium whitespace-nowrap transition", on ? "border-cream bg-cream text-walnut" : "border-cream/20 text-cream/75 hover:border-cream/50 hover:text-cream");

  return (
    <section id="catalogue" className="relative z-20 scroll-mt-20 bg-walnut" aria-label={ar ? "كتالوج المنتجات" : "Product catalogue"}>
      {/* filter bar */}
      <div className="z-30 border-y border-dashed border-cork bg-walnut/92 backdrop-blur-md lg:sticky lg:top-[4.5rem]">
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-8 xl:flex-row xl:items-center">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:flex-1 xl:pb-0" role="tablist" aria-label={ar ? "الفئات" : "Categories"}>
            {[{ slug: "all", name: ar ? "كل المنتجات" : "All products", active: true }, ...categories].map((c) => (
              <button key={c.slug} role="tab" aria-selected={cat === c.slug} onClick={() => setCat(c.slug)} className={chip(cat === c.slug)}>
                {c.name}
                {!c.active && <span className="ms-1.5 text-[10px] opacity-60">· {t.common.comingSoon}</span>}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem] xl:w-[34rem]">
            <label className="relative block">
              <span className="sr-only">{ar ? "بحث في المنتجات" : "Search products"}</span>
              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-cream/40" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث: علبة برجر، كيس، علبة عطر…" : "Search: burger box, bag, perfume box…"} aria-label={ar ? "بحث في المنتجات" : "Search products"} className={cx(inputClass, "rounded-full bg-bark/40 ps-9")} />
            </label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label={ar ? "النشاط" : "Industry"} className={cx(inputClass, "rounded-full bg-bark/40")}>
              <option value="">{ar ? "كل الأنشطة" : "All industries"}</option>
              {INDUSTRIES.map((i) => (
                <option key={i.key} value={i.key}>
                  {i[locale]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 pt-10 pb-24 sm:px-8">
        <p className="num mb-10 text-[12px] text-cream/45" aria-live="polite">
          {filtered.length} {ar ? "منتج" : filtered.length === 1 ? "product" : "products"}
          {industry && ` · ${INDUSTRIES.find((i) => i.key === industry)?.[locale]}`}
        </p>

        {selectedCategory && !selectedCategory.active ? (
          <div className="rounded-[16px] border border-dashed border-cream/25 px-6 py-16 text-center">
            <p className="eyebrow text-[11px] font-medium text-ember">{t.common.comingSoon}</p>
            <p className="display mt-4 text-[40px] leading-none">{selectedCategory.name}</p>
            {selectedCategory.description && <p className="mx-auto mt-4 max-w-md text-sm text-cream/60">{selectedCategory.description}</p>}
            <Link href={`/${locale}/contact#contact-form`} className={cx(buttonClass("outline", "md"), "mt-8")}>
              {ar ? "اطلب منتجًا مخصصًا" : "Request a custom product"}
            </Link>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-cream/25 px-6 py-16 text-center">
            <p className="display text-[32px]">{ar ? "لا توجد منتجات مطابقة" : "No matching products"}</p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setIndustry("");
                setCat("all");
              }}
              className={cx(buttonClass("outline", "sm"), "mt-6")}
            >
              {ar ? "إزالة الفلاتر" : "Clear filters"}
            </button>
          </div>
        ) : (
          <div className="space-y-20">
            {groups.map((g) => (
              <div key={g.slug}>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="display text-[34px] leading-none sm:text-[44px]">{g.name}</h2>
                    {g.description && <p className="mt-3 max-w-xl text-sm text-cream/55">{g.description}</p>}
                  </div>
                  {cat === "all" && (
                    <button type="button" onClick={() => setCat(g.slug)} className="eyebrow text-[11px] font-medium text-cream/60 transition hover:text-ember">
                      {ar ? `عرض الفئة (${g.items.length}) ←` : `View category (${g.items.length}) →`}
                    </button>
                  )}
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                  {g.items.map((p) => (
                    <ProductTile key={p.code} p={p} onOpen={() => setOpen(p.code)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* rendered at the document root so it sits above the site header */}
      {openProduct && createPortal(<QuickView p={openProduct} category={categories.find((c) => c.slug === openProduct.category)?.name} onClose={close} onPrev={prev} onNext={next} />, document.body)}
    </section>
  );
}
