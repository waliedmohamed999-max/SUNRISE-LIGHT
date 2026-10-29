import type { Metadata } from "next";
import { getSiteInfo } from "@/lib/content";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { ContactChannels, ContactFormPanel, ContactHero } from "@/components/experience/ContactShowcase";
import { FaqShowcase } from "@/components/experience/FaqShowcase";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: getDict(locale).pages.contactTitle,
    description:
      locale === "ar"
        ? "تواصل مع مصنع ضوء الشروق للكرتون والتغليف في الرياض: الهاتف والبريد والعنوان، أو أرسل رسالة مباشرة لفريق المبيعات."
        : "Contact Sunrise Light Packaging Factory in Riyadh: phone, email and address, or send a message straight to the sales team.",
    alternates: { canonical: `/${locale}/contact`, languages: { ar: "/ar/contact", en: "/en/contact" } },
  };
}

/* Contact — same editorial identity as the homepage: hero with the 3D stage, channels, location, form, FAQ. */
export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const [info, faq] = await Promise.all([getSiteInfo(locale), db.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 6 })]);

  return (
    <div className="text-cream">
      <ContactHero info={info} />
      <ContactChannels info={info} />
      <ContactFormPanel />
      <FaqShowcase items={faq.map((f) => ({ id: f.id, q: ar ? f.questionAr : f.questionEn, a: ar ? f.answerAr : f.answerEn }))} />
    </div>
  );
}
