import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { TextPage } from "@/components/site/TextPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.aboutTitle, alternates: { canonical: `/${locale}/about`, languages: { ar: "/ar/about", en: "/en/about" } } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const content = await getContent(locale);
  return <TextPage locale={locale} title={t.pages.aboutTitle} crumb={t.nav.about} body={content("about.body")} />;
}
