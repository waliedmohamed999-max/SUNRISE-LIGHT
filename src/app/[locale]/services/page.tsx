import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { TextPage } from "@/components/site/TextPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.servicesTitle, alternates: { canonical: `/${locale}/services`, languages: { ar: "/ar/services", en: "/en/services" } } };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const [content, finishings] = await Promise.all([getContent(locale), db.finishingOption.findMany({ where: { isAvailable: true, code: { not: "none" } }, orderBy: { sortOrder: "asc" } })]);
  return (
    <TextPage locale={locale} title={t.pages.servicesTitle} crumb={t.nav.services} body={content("services.body")}>
      {finishings.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-navy">{t.home.finishingTitle}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {finishings.map((f) => (
              <li key={f.id} className="rounded-full border border-navy/12 bg-white px-4 py-2 text-sm font-medium text-navy">
                {ar ? f.nameAr : f.nameEn}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-500">{t.home.materialsBody}</p>
        </section>
      )}
    </TextPage>
  );
}
