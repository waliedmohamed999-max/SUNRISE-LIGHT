import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Card, PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/site/ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.contactTitle, alternates: { canonical: `/${locale}/contact`, languages: { ar: "/ar/contact", en: "/en/contact" } } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await getContent(locale);
  const ar = locale === "ar";
  const info: [string, string, string | null][] = [
    [t.pages.phone, c("contact.phone"), c("contact.phone") ? `tel:${c("contact.phone")}` : null],
    ["WhatsApp", c("contact.whatsapp"), c("contact.whatsapp") ? `https://wa.me/${c("contact.whatsapp").replace(/\D/g, "")}` : null],
    [t.pages.email, c("contact.email"), c("contact.email") ? `mailto:${c("contact.email")}` : null],
    [t.account.address, c("contact.address"), null],
    [ar ? "ساعات العمل" : "Working hours", c("contact.hours"), null],
  ];
  return (
    <>
      <PageHeader title={t.pages.contactTitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.contact }]} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-navy">{t.pages.contactInfo}</h2>
          <dl className="space-y-5">
            {info.map(([k, v, href]) => (
              <div key={k}>
                <dt className="text-xs text-ink-500">{k}</dt>
                <dd className="mt-0.5 font-medium text-navy">
                  {!v ? (
                    <span className="text-sm font-normal text-ink-500 italic">{t.common.placeholderNotice}</span>
                  ) : href ? (
                    <a href={href} className="num hover:text-sun-600" dir="ltr">
                      {v}
                    </a>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-navy">{t.pages.contactForm}</h2>
          <ContactForm />
        </Card>
      </div>
    </>
  );
}
