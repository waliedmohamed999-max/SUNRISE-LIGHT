import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass, PageHeader } from "@/components/ui";
import { ServicesIndex } from "@/components/experience/ServicesShowcase";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.portfolioTitle, alternates: { canonical: `/${locale}/portfolio`, languages: { ar: "/ar/portfolio", en: "/en/portfolio" } } };
}

/* Portfolio — only real, published work (Admin → Website content). Until then: the service lines as illustrative examples. */
export default async function PortfolioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const items = await db.portfolioItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="bg-walnut text-cream">
      <PageHeader
        eyebrow={t.brand.name}
        title={t.pages.portfolioTitle}
        body={ar ? "نماذج من عبوات صنعناها وطبعناها لعملائنا." : "Examples of packaging we have made and printed for our customers."}
        crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.portfolio }]}
      />
      {items.length === 0 ? (
        <>
          <section className="grid gap-8 px-4 py-20 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-xs font-medium text-ember">{t.common.comingSoon}</p>
              <p className="display mt-4 text-[36px] leading-tight sm:text-[52px]">{ar ? "نجهّز معرض أعمالنا بموافقة عملائنا." : "We are preparing our gallery with our customers' approval."}</p>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-cream/60">
                {ar ? "حتى ذلك الحين، تصفّح خدماتنا والنماذج التوضيحية من ملف الشركة، أو ابدأ تصميم عبوتك الآن." : "Meanwhile, browse our services and the illustrative examples from our company profile, or start designing your box now."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href={`/${locale}/studio`} className={buttonClass("primary", "md")}>
                {t.home.ctaDesign}
              </Link>
              <Link href={`/${locale}/products`} className={buttonClass("outline", "md")}>
                {t.nav.products}
              </Link>
            </div>
          </section>
          <ServicesIndex />
        </>
      ) : (
        <section className="px-4 py-20 sm:px-8">
          <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <li key={p.id} className="group overflow-hidden rounded-[12px] border border-cream/10 bg-bark/35 transition hover:border-cream/30">
                {p.imageUrl && (
                  <div className="aspect-[4/3] overflow-hidden bg-bark">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={ar ? p.titleAr : p.titleEn} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <span className="serif num text-sm text-cream/40">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="display mt-2 text-[24px] leading-tight">{ar ? p.titleAr : p.titleEn}</h2>
                  {(ar ? p.descriptionAr : p.descriptionEn) && <p className="mt-2 text-sm leading-relaxed text-cream/60">{ar ? p.descriptionAr : p.descriptionEn}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
