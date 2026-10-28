import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { TemplateGlyph } from "@/components/studio/TemplateGlyph";
import { getEngine } from "@/packaging/engine";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  const c = await db.packagingCategory.findUnique({ where: { slug: category } });
  if (!c) return {};
  return {
    title: locale === "ar" ? c.nameAr : c.nameEn,
    description: locale === "ar" ? c.descriptionAr : c.descriptionEn,
    alternates: { canonical: `/${locale}/products/${category}`, languages: { ar: `/ar/products/${category}`, en: `/en/products/${category}` } },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: Locale; category: string }> }) {
  const { locale, category } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const c = await db.packagingCategory.findUnique({
    where: { slug: category },
    include: { templates: { where: { isEnabled: true }, include: { currentVersion: true, materialRules: { include: { material: true } } } } },
  });
  if (!c || c.status === "HIDDEN") notFound();
  const active = c.status === "ACTIVE";

  return (
    <>
      <PageHeader
        title={ar ? c.nameAr : c.nameEn}
        body={ar ? c.descriptionAr : c.descriptionEn}
        crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.products, href: `/${locale}/products` }, { label: ar ? c.nameAr : c.nameEn }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {!active || c.templates.length === 0 ? (
          <EmptyState
            title={t.common.comingSoon}
            body={ar ? "هذه الفئة قيد الإعداد ولا يمكن تصميمها في الاستوديو بعد. تواصل معنا لطلب خاص." : "This category is being prepared and cannot be designed in the studio yet. Contact us for a custom request."}
            action={<LinkButton href={`/${locale}/contact`}>{t.nav.contact}</LinkButton>}
          />
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-navy">{t.pages.availableTemplates}</h2>
            {c.templates.map((tpl) => {
              const v = tpl.currentVersion;
              if (!v) return null;
              return (
                <Card key={tpl.id} className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <TemplateGlyph engineKey={tpl.engineKey} className="size-20" />
                  <div>
                    <h3 className="text-lg font-semibold text-navy">{ar ? tpl.nameAr : tpl.nameEn}</h3>
                    <p className="mt-1 text-sm text-ink-500">{ar ? tpl.descriptionAr : tpl.descriptionEn}</p>
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      <div>
                        <dt className="text-xs text-ink-500">{t.pages.sizeRange}</dt>
                        <dd className="num font-medium text-navy">
                          L {v.minLengthMm}–{v.maxLengthMm} · W {v.minWidthMm}–{v.maxWidthMm} · H {v.minHeightMm}–{v.maxHeightMm} mm
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-500">{t.studio.material}</dt>
                        <dd className="flex flex-wrap gap-1">
                          {tpl.materialRules.map((r) => (
                            <Badge key={r.materialId}>{ar ? r.material.nameAr : r.material.nameEn}</Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-500">{t.studio.surfaces}</dt>
                        <dd className="num font-medium text-navy">{getEngine(tpl.engineKey).surfaces({ length: 1, width: 1, height: 1 }).length}</dd>
                      </div>
                    </dl>
                    {!v.dielineValidated && <p className="mt-3 text-xs text-ink-500">{t.studio.visualOnly}</p>}
                  </div>
                  <LinkButton href={`/${locale}/studio?template=${tpl.code}`} variant="accent">
                    {t.pages.designNow}
                  </LinkButton>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
