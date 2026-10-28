import type { Metadata } from "next";
import { getDict } from "@/i18n/dictionaries";
import { getContent } from "@/lib/content";
import type { Locale } from "@/i18n/config";
import { TextPage } from "@/components/site/TextPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.termsTitle, alternates: { canonical: `/${locale}/terms` } };
}

const BODY = {
  ar: `المعاينات ثنائية وثلاثية الأبعاد ومخططات القص الناتجة عن الاستوديو هي لأغراض العرض، ولا تُعد ملفات إنتاج معتمدة حتى يراجعها الفريق الفني للمصنع.

الألوان على الشاشة تقريبية وقد تختلف عن الطباعة النهائية بحسب الخامة وطريقة الطباعة.

إرسال طلب عرض سعر لا يُعد طلب شراء ملزماً. يصبح الطلب ملزماً بعد اعتماد العميل لعرض السعر الصادر من المصنع ووفق الشروط المذكورة فيه.

يقرّ العميل بامتلاكه حقوق استخدام الشعارات والعلامات التجارية التي يرفعها.`,
  en: `2D/3D previews and cut layouts produced by the studio are for visualisation only and are not approved production files until reviewed by the factory's technical team.

On-screen colours are approximate and may differ from the final print depending on material and print process.

Submitting a quotation request is not a binding purchase order. An order becomes binding once the customer approves a factory-issued quotation, under the terms stated in it.

The customer confirms they hold the rights to use any logos and trademarks they upload.`,
};

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  // approved text from Admin → Website content ("terms.body") replaces the built-in draft and its review notice
  const approved = (await getContent(locale))("terms.body").trim();
  return <TextPage locale={locale} title={t.pages.termsTitle} crumb={t.pages.termsTitle} body={approved || BODY[locale]} notice={approved ? undefined : t.pages.legalDraft} />;
}
