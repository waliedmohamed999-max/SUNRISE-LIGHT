import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Badge, cx, PageHeader } from "@/components/ui";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { INDUSTRIES } from "@/packaging/industries";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return { title: t.pages.productsTitle, description: t.pages.productsBody, alternates: { canonical: `/${locale}/products`, languages: { ar: "/ar/products", en: "/en/products" } } };
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const categories = await db.packagingCategory.findMany({
    where: { status: { not: "HIDDEN" } },
    orderBy: { sortOrder: "asc" },
    include: { templates: { where: { isEnabled: true }, select: { id: true } } },
  });

  return (
    <>
      <PageHeader title={t.pages.productsTitle} body={t.pages.productsBody} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.products }]} />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="eyebrow mb-3 text-xs font-medium text-cream/60">{ar ? "تصفّح حسب نشاطك" : "Browse by industry"}</p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <Link key={i.key} href={`/${locale}/studio?industry=${i.key}`} className="rounded-[22.5px] border border-cream/30 px-4 py-2 text-xs font-medium text-cream/85 transition hover:bg-cream hover:text-walnut">
                {ar ? i.ar : i.en}
              </Link>
            ))}
          </div>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const active = c.status === "ACTIVE" && c.templates.length > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/${locale}/products/${c.slug}`}
                  className={cx(
                    "flex h-full gap-5 rounded-[var(--radius-card)] border bg-white p-6 transition",
                    active ? "border-navy/8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]" : "border-dashed border-navy/12",
                  )}
                >
                  <span className={cx("grid size-14 shrink-0 place-items-center rounded-2xl", active ? "bg-navy text-sun" : "bg-paper-200 text-navy-300")}>
                    <CategoryIcon slug={c.slug} className="size-7" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-navy">{ar ? c.nameAr : c.nameEn}</span>
                      {!active && <Badge>{t.common.comingSoon}</Badge>}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-ink-500">{ar ? c.descriptionAr : c.descriptionEn}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
