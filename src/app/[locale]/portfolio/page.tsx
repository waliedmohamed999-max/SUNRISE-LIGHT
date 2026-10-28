import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.portfolioTitle, alternates: { canonical: `/${locale}/portfolio`, languages: { ar: "/ar/portfolio", en: "/en/portfolio" } } };
}

export default async function PortfolioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const items = await db.portfolioItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title={t.pages.portfolioTitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.portfolio }]} />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <EmptyState title={t.home.portfolioEmpty} action={<LinkButton href={`/${locale}/studio`} variant="accent">{t.home.ctaDesign}</LinkButton>} />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-[var(--radius-card)] border border-navy/8 bg-white">
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={ar ? p.titleAr : p.titleEn} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                )}
                <div className="p-5">
                  <h2 className="font-semibold text-navy">{ar ? p.titleAr : p.titleEn}</h2>
                  <p className="mt-1 text-sm text-ink-500">{ar ? p.descriptionAr : p.descriptionEn}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
