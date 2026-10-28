import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { TextPage } from "@/components/site/TextPage";
import { ProcessSteps, ServicesShowcase } from "@/components/site/SiteSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.aboutTitle, alternates: { canonical: `/${locale}/about`, languages: { ar: "/ar/about", en: "/en/about" } } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const content = await getContent(locale);
  const ar = locale === "ar";
  const pillars = ar
    ? [
        ["تصميم بنفسك", "استوديو تصميم أونلاين بمقاسات دقيقة ومعاينة ثلاثية الأبعاد ومخطط قص."],
        ["مراجعة فنية", "كل طلب يراجعه فريق المصنع قبل اعتماد المواصفات والسعر."],
        ["متابعة من حسابك", "تصاميمك وطلباتك وعروض الأسعار في مكان واحد."],
      ]
    : [
        ["Design it yourself", "An online studio with exact dimensions, a 3D preview and a dieline."],
        ["Technical review", "Every request is reviewed by the factory team before specs and price are confirmed."],
        ["Track it in your account", "Your designs, requests and quotations in one place."],
      ];
  return (
    <TextPage locale={locale} title={t.pages.aboutTitle} crumb={t.nav.about} body={content("about.body")}>
      <ul className="mt-12 grid gap-3 sm:grid-cols-3">
        {pillars.map(([title, body]) => (
          <li key={title} className="rounded-2xl border border-navy/10 bg-white p-5">
            <p className="font-semibold text-navy">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{body}</p>
          </li>
        ))}
      </ul>
      <ServicesShowcase locale={locale} compact />
      <ProcessSteps locale={locale} />
    </TextPage>
  );
}
