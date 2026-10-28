import type { Metadata } from "next";
import { getSiteInfo } from "@/lib/content";
import { telUrl, whatsappUrl } from "@/lib/site-settings";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { ContactForm } from "@/components/site/ContactForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.contactTitle, alternates: { canonical: `/${locale}/contact`, languages: { ar: "/ar/contact", en: "/en/contact" } } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const info = await getSiteInfo(locale);
  const ar = locale === "ar";
  // only details the factory has filled in are shown
  const rows: { label: string; value: string; href: string | null; ltr?: boolean; external?: boolean }[] = [
    { label: t.pages.phone, value: info.phone, href: telUrl(info.phone), ltr: true },
    { label: ar ? "هاتف إضافي" : "Second phone", value: info.phone2, href: telUrl(info.phone2), ltr: true },
    { label: "WhatsApp", value: info.whatsapp, href: whatsappUrl(info.whatsapp), ltr: true, external: true },
    { label: t.pages.email, value: info.email, href: info.email ? `mailto:${info.email}` : null, ltr: true },
    { label: ar ? "بريد المبيعات" : "Sales email", value: info.email2, href: info.email2 ? `mailto:${info.email2}` : null, ltr: true },
    { label: t.account.address, value: info.address, href: info.map, external: true },
    { label: ar ? "ساعات العمل" : "Working hours", value: info.hours, href: null },
  ].filter((r) => r.value);

  return (
    <>
      <PageHeader title={t.pages.contactTitle} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.nav.contact }]} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <h2 className="mb-6 text-lg font-semibold text-navy">{t.pages.contactInfo}</h2>
            {rows.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-500">{ar ? "أرسل رسالتك عبر النموذج وسيتواصل معك فريق المصنع." : "Send your message with the form and the factory team will get back to you."}</p>
            ) : (
              <dl className="space-y-5">
                {rows.map((r) => (
                  <div key={r.label}>
                    <dt className="text-xs text-ink-500">{r.label}</dt>
                    <dd className="mt-0.5 font-medium text-navy">
                      {r.href ? (
                        <a href={r.href} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={r.ltr ? "num hover:text-sun-600" : "hover:text-sun-600"} dir={r.ltr ? "ltr" : undefined}>
                          {r.value}
                        </a>
                      ) : (
                        <span className="whitespace-pre-line">{r.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {(info.whatsapp || info.map) && (
              <div className="mt-7 flex flex-wrap gap-2">
                {whatsappUrl(info.whatsapp) && (
                  <a href={whatsappUrl(info.whatsapp)!} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
                    {ar ? "راسلنا على واتساب" : "Message us on WhatsApp"}
                  </a>
                )}
                {info.map && (
                  <a href={info.map} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                    {ar ? "الموقع على الخريطة" : "Open in maps"}
                  </a>
                )}
              </div>
            )}
          </Card>
          {info.social.length > 0 && (
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 text-lg font-semibold text-navy">{ar ? "تابعنا" : "Follow us"}</h2>
              <div className="flex flex-wrap gap-2">
                {info.social.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                    {s.label}
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-navy">{t.pages.contactForm}</h2>
          <ContactForm />
        </Card>
      </div>
    </>
  );
}
