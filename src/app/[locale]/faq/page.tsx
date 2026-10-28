import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { FaqList } from "@/components/site/FaqList";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.faqTitle, alternates: { canonical: `/${locale}/faq`, languages: { ar: "/ar/faq", en: "/en/faq" } } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const items = await db.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: ar ? f.questionAr : f.questionEn, acceptedAnswer: { "@type": "Answer", text: ar ? f.answerAr : f.answerEn } })),
  };
  return (
    <>
      <PageHeader title={t.pages.faqTitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.faq }]} />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {items.length === 0 ? <EmptyState title={t.common.empty} /> : <FaqList items={items.map((f) => ({ id: f.id, q: ar ? f.questionAr : f.questionEn, a: ar ? f.answerAr : f.answerEn }))} />}
      </div>
      {items.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    </>
  );
}
