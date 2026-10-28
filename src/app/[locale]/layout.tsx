import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
import { dirOf, isLocale, LOCALES, type Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getDict } from "@/i18n/dictionaries";
import { getCurrentUser, userIsStaff } from "@/lib/auth";
import { getContent, siteUrl } from "@/lib/content";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

// Only /ar and /en exist; anything else (e.g. /favicon.ico) is a 404
export const dynamicParams = false;
// Every page renders session-aware navigation
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "ar") as Locale;
  const t = getDict(l);
  const title = l === "ar" ? "مصنع ضوء الشروق | تصنيع وطباعة العبوات الكرتونية حسب الطلب" : "Sunrise Light | Custom Cardboard Packaging Manufacturer";
  const description =
    l === "ar"
      ? "مصنع كرتون وعلب تغليف حسب الطلب: صمّم علبتك أونلاين، حدّد المقاسات والخامة، أضف شعارك، واطلب عرض سعر من المصنع."
      : "Custom packaging and printed cardboard boxes made to order. Design your box online, set dimensions and material, add your logo and request a factory quotation.";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${t.brand.name}` },
    description,
    keywords:
      l === "ar"
        ? ["مصنع كرتون", "مصنع علب كرتون", "تصنيع علب كرتونية", "طباعة كراتين", "علب تغليف حسب الطلب", "تصميم علب كرتون", "مصنع تغليف ورقي"]
        : ["Custom Packaging", "Cardboard Box Manufacturer", "Printed Packaging Boxes", "Custom Corrugated Boxes", "Packaging Design Online"],
    alternates: { canonical: `/${l}`, languages: { ar: "/ar", en: "/en", "x-default": "/ar" } },
    openGraph: { type: "website", siteName: t.brand.name, title, description, locale: l === "ar" ? "ar_SA" : "en_US", images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: t.brand.name }] },
    twitter: { card: "summary_large_image", title, description, images: ["/brand/og.png"] },
    icons: { icon: [{ url: "/brand/icon-48.png", sizes: "48x48", type: "image/png" }, { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/brand/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = { themeColor: "#100904", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [user, content] = await Promise.all([getCurrentUser(), getContent(locale)]);

  return (
    <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          <Header user={user ? { name: user.name, isStaff: userIsStaff(user) } : null} />
          <main id="main">{children}</main>
          <Footer locale={locale} contact={{ phone: content("contact.phone"), email: content("contact.email"), address: content("contact.address") }} />
        </I18nProvider>
      </body>
    </html>
  );
}
