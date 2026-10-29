import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { loadCatalog } from "@/lib/catalog-data";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { ProductsExplorer, ProductsHero } from "@/components/experience/ProductsExplorer";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  const c = await db.packagingCategory.findUnique({ where: { slug: category } });
  if (!c || c.status === "HIDDEN") return {};
  return {
    title: locale === "ar" ? c.nameAr : c.nameEn,
    description: locale === "ar" ? c.descriptionAr : c.descriptionEn,
    alternates: { canonical: `/${locale}/products/${category}`, languages: { ar: `/ar/products/${category}`, en: `/en/products/${category}` } },
  };
}

/* Category — the same explorer, opened on this category. */
export default async function CategoryPage({ params }: { params: Promise<{ locale: Locale; category: string }> }) {
  const { locale, category } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const { categories, products } = await loadCatalog(locale);
  const c = categories.find((x) => x.slug === category);
  if (!c) notFound();
  const own = products.filter((p) => p.category === category);

  return (
    <div className="text-cream">
      <ProductsHero
        category={c.slug}
        title={c.name}
        body={
          own.length
            ? c.description
            : `${c.description}${c.description ? " — " : ""}${ar ? "هذه الفئة قيد الإعداد ولا يمكن تصميمها في الاستوديو بعد. يمكنك طلبها كمنتج مخصص." : "This category is being prepared and cannot be designed in the studio yet. You can request it as a custom product."}`
        }
        crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.products, href: `/${locale}/products` }, { label: c.name }]}
        showcase={own.slice(0, 3).map((p) => p.code)}
        stats={
          own.length === 0
            ? []
            : [
                { value: own.length, label: ar ? "قالب في هذه الفئة" : "Templates in this category" },
                { value: new Set(own.flatMap((p) => p.materials.map((m) => m.name))).size, label: ar ? "خامة متاحة" : "Available materials" },
              ]
        }
      />
      <ProductsExplorer categories={categories} products={products} initialCategory={category} />
    </div>
  );
}
