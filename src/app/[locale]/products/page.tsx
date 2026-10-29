import type { Metadata } from "next";
import Link from "next/link";
import { loadCatalog } from "@/lib/catalog-data";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { INDUSTRIES } from "@/packaging/industries";
import { buttonClass } from "@/components/ui";
import { ProductsExplorer, ProductsHero } from "@/components/experience/ProductsExplorer";
import { IndustryGrid } from "@/components/experience/IndustryGrid";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return { title: t.pages.productsTitle, description: t.pages.productsBody, alternates: { canonical: `/${locale}/products`, languages: { ar: "/ar/products", en: "/en/products" } } };
}

/* Products — catalogue explorer in the site's editorial identity: live 3D preview, specs from the factory data, filters. */
export default async function ProductsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const { categories, products, materialCount } = await loadCatalog(locale);
  const industriesUsed = new Set(products.flatMap((p) => p.industries)).size;
  // hero composition: a carton, a bag and a premium box when available
  const showcase = ["shipping-carton", "paper-bag", "perfume-box"].filter((code) => products.some((p) => p.code === code));

  return (
    <div className="text-cream">
      <ProductsHero
        title={ar ? "منتجاتنا" : "Our products"}
        body={t.pages.productsBody}
        crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.products }]}
        showcase={showcase.length === 3 ? showcase : products.slice(0, 3).map((p) => p.code)}
        stats={[
          { value: products.length, label: ar ? "قالب جاهز للتصميم" : "Ready-to-design templates" },
          { value: categories.filter((c) => c.active).length, label: ar ? "فئة منتجات" : "Product categories" },
          { value: Math.min(industriesUsed, INDUSTRIES.length), label: ar ? "نشاط تجاري" : "Industries" },
          { value: materialCount, label: ar ? "خامة" : "Materials" },
        ]}
      />
      <ProductsExplorer categories={categories} products={products} />
      <IndustryGrid templates={products.map((p) => ({ code: p.code, engineKey: p.engineKey, name: p.name, industries: p.industries }))} />
      <section className="relative z-20 bg-walnut">
        <div className="rule mx-4 sm:mx-8" />
        <div className="grid gap-8 px-4 py-24 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-xs font-medium text-cream/60">{ar ? "تغليف مخصص" : "Custom packaging"}</p>
            <h2 className="display mt-4 text-[41px] leading-[0.9] sm:text-[64px]">{ar ? "منتجك غير موجود؟ نصنعه لك." : "Not in the catalogue? We'll make it."}</h2>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-cream/60">
              {ar
                ? "أرسل لنا المقاسات أو عينة أو فكرة العبوة، ويقترح فريق المصنع الهيكل والخامة المناسبة ويرسل لك عرض السعر."
                : "Send us dimensions, a sample or just the idea; the factory team will propose the structure and material and send you a quotation."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href={`/${locale}/contact`} className={buttonClass("primary", "md")}>
              {ar ? "اطلب منتجًا مخصصًا" : "Request a custom product"}
            </Link>
            <Link href={`/${locale}/services`} className={buttonClass("outline", "md")}>
              {t.nav.services}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
