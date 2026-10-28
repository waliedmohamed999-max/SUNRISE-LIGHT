import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { loadShowcase } from "@/lib/showcase-data";
import { FACTORY_SERVICES } from "@/lib/factory-services";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { ServicesHero, ServicesIndex } from "@/components/experience/ServicesShowcase";
import { ChooseBox } from "@/components/experience/ChooseBox";
import { CartonGuide } from "@/components/experience/CartonGuide";
import { FaqShowcase } from "@/components/experience/FaqShowcase";
import { HowItWorks, MaterialsFinishing } from "@/components/experience/HomeSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return {
    title: t.pages.servicesTitle,
    description:
      locale === "ar"
        ? "خدمات مصنع ضوء الشروق: كرتون إنفركوت ومضلّع وكرافت ودمج وهارد كفر، أكياس كرافت وإنفركوت، استيكر رول وشيت، وورق لف — بشعارك وتصميمك."
        : "Sunrise Light services: Invercote, corrugated, kraft, merge and hard-cover boxes; kraft and Invercote bags; sticker rolls and sheets; wrapping paper — with your logo and design.",
    alternates: { canonical: `/${locale}/services`, languages: { ar: "/ar/services", en: "/en/services" } },
  };
}

/* Services — same editorial identity and tools as the homepage: 3D stage, template comparison, carton guide, process, materials, FAQ. */
export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const [content, { materials, finishings, faq, templates, choose }] = await Promise.all([getContent(locale), loadShowcase(locale)]);

  return (
    <div className="text-cream">
      <ServicesHero
        body={content("services.body")}
        stats={[
          { value: FACTORY_SERVICES.length, label: ar ? "خدمات" : "Services" },
          { value: templates.length, label: ar ? "قالب جاهز" : "Templates" },
          { value: materials.length, label: ar ? "خامات" : "Materials" },
        ]}
      />
      <ServicesIndex />
      <ChooseBox templates={choose} />
      <CartonGuide />
      <div className="relative z-20 bg-walnut">
        <HowItWorks locale={locale} />
        <MaterialsFinishing locale={locale} materials={materials} finishings={finishings} />
      </div>
      <FaqShowcase items={faq} />
    </div>
  );
}
