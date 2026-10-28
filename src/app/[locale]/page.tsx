import { db } from "@/lib/db";
import { loadShowcase } from "@/lib/showcase-data";
import type { Locale } from "@/i18n/config";
import { Experience } from "@/components/experience/Experience";
import { ChooseBox } from "@/components/experience/ChooseBox";
import { FaqShowcase } from "@/components/experience/FaqShowcase";
import { CartonGuide } from "@/components/experience/CartonGuide";
import { IndustryGrid } from "@/components/experience/IndustryGrid";
import { HowItWorks, MaterialsFinishing } from "@/components/experience/HomeSections";

/*
 * Homepage — scroll-driven product film:
 * one fixed 3D scene in which a Sunrise carton is measured, unfolded into its real dieline,
 * resized, printed and joined by the product family, with chapter text scrubbed over it.
 * Regular content (categories, process, materials, FAQ) follows on a solid surface.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";

  const [categories, { materials, finishings, faq, templates, choose }] = await Promise.all([
    db.packagingCategory.findMany({ where: { status: { not: "HIDDEN" } }, orderBy: { sortOrder: "asc" } }),
    loadShowcase(locale),
  ]);

  return (
    <div className="text-cream">
      <Experience
        categories={categories.map((c) => ({ slug: c.slug, name: ar ? c.nameAr : c.nameEn, description: ar ? c.descriptionAr : c.descriptionEn, active: c.status === "ACTIVE" }))}
      />

      <ChooseBox templates={choose} />

      <IndustryGrid templates={templates.map((tp) => ({ code: tp.code, engineKey: tp.engineKey, name: ar ? tp.nameAr : tp.nameEn, industries: tp.industries }))} />

      <CartonGuide />

      <div className="relative z-20 bg-walnut">
        <HowItWorks locale={locale} />
        <MaterialsFinishing locale={locale} materials={materials} finishings={finishings} />
      </div>

      <FaqShowcase items={faq} />
    </div>
  );
}
