import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSiteInfo } from "@/lib/content";
import { whatsappUrl } from "@/lib/site-settings";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass, PageHeader } from "@/components/ui";
import { FaqList } from "@/components/site/FaqList";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.faqTitle, alternates: { canonical: `/${locale}/faq`, languages: { ar: "/ar/faq", en: "/en/faq" } } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const [items, info] = await Promise.all([db.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }), getSiteInfo(locale)]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: ar ? f.questionAr : f.questionEn, acceptedAnswer: { "@type": "Answer", text: ar ? f.answerAr : f.answerEn } })),
  };
  const wa = whatsappUrl(info.whatsapp);

  return (
    <div className="bg-walnut text-cream">
      <PageHeader
        eyebrow={t.story.faqEyebrow}
        title={t.pages.faqTitle}
        body={ar ? "إجابات مختصرة عن التصميم والخامات والطباعة وطلبات عروض الأسعار." : "Short answers about design, materials, printing and quotation requests."}
        crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.faq }]}
      />
      <div className="grid gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[2fr_1fr]">
        <div>
          {items.length === 0 ? (
            <p className="display text-[28px] text-cream/60">{t.common.empty}</p>
          ) : (
            <FaqList items={items.map((f) => ({ id: f.id, q: ar ? f.questionAr : f.questionEn, a: ar ? f.answerAr : f.answerEn }))} />
          )}
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[12px] border border-cream/10 bg-bark/40 p-7">
            <p className="eyebrow text-[10px] font-medium text-ember">{ar ? "لم تجد إجابتك؟" : "Still have a question?"}</p>
            <p className="display mt-3 text-[30px] leading-tight">{ar ? "اسأل فريق المصنع مباشرة" : "Ask the factory team directly"}</p>
            <p className="mt-3 text-sm leading-relaxed text-cream/60">
              {ar ? "أرسل سؤالك عن مقاس أو خامة أو طريقة طباعة، ونرد عليك بالتفاصيل." : "Send us your question about a size, material or print method and we'll reply with the details."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${locale}/contact#contact-form`} className={buttonClass("primary", "md")}>
                {ar ? "أرسل سؤالك" : "Ask a question"}
              </Link>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md")}>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          <Link href={`/${locale}/studio`} className="group mt-4 flex items-center justify-between rounded-[12px] border border-dashed border-cream/20 p-5 transition hover:border-cream/40">
            <span>
              <span className="eyebrow block text-[10px] font-medium text-cream/45">{ar ? "جرّب بنفسك" : "Try it yourself"}</span>
              <span className="display mt-1 block text-[20px]">{t.home.ctaDesign}</span>
            </span>
            <span aria-hidden className="text-xl text-ember transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1">
              →
            </span>
          </Link>
        </aside>
      </div>
      {items.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    </div>
  );
}
