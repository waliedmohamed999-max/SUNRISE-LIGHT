import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { FACTORY_SERVICES } from "@/lib/factory-services";
import { INDUSTRIES } from "@/packaging/industries";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass } from "@/components/ui";
import { AboutHero, ServicesIndex } from "@/components/experience/ServicesShowcase";
import { HowItWorks } from "@/components/experience/HomeSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.aboutTitle, alternates: { canonical: `/${locale}/about`, languages: { ar: "/ar/about", en: "/en/about" } } };
}

/* About — editorial story page: hero with the 3D bag, the company's own text, real numbers, pillars, services, process. */
export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";
  const [content, templates, materials] = await Promise.all([
    getContent(locale),
    db.packagingTemplate.count({ where: { isEnabled: true } }),
    db.materialType.count({ where: { isAvailable: true } }),
  ]);
  // the first paragraph is the company's own line (from the profile); the rest is the story
  const [lead = "", ...story] = content("about.body")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pillars = ar
    ? [
        ["تصميم بنفسك", "استوديو تصميم أونلاين بمقاسات دقيقة بالمليمتر، ومعاينة ثلاثية الأبعاد، ومخطط قص."],
        ["مراجعة فنية", "كل طلب يراجعه فريق المصنع قبل اعتماد المواصفات والسعر — لا أسعار آلية بلا مراجعة."],
        ["متابعة من حسابك", "تصاميمك وطلباتك وعروض الأسعار في مكان واحد، مع إشعار عند كل تحديث."],
      ]
    : [
        ["Design it yourself", "An online studio with exact millimetre sizing, a 3D preview and a dieline."],
        ["Technical review", "Every request is reviewed by the factory team before specs and price are confirmed — no unreviewed automatic prices."],
        ["Track it in your account", "Your designs, requests and quotations in one place, with a notification at every update."],
      ];

  const numbers = [
    { value: FACTORY_SERVICES.length, label: ar ? "خدمات" : "Services" },
    { value: templates, label: ar ? "قالب جاهز للتصميم" : "Ready templates" },
    { value: materials, label: ar ? "خامات" : "Materials" },
    { value: INDUSTRIES.length, label: ar ? "نشاط تجاري نخدمه" : "Industries served" },
  ];

  return (
    <div className="text-cream">
      <AboutHero title={t.pages.aboutTitle} lead={lead} />

      {/* story */}
      {story.length > 0 && (
        <section className="relative z-20 bg-walnut" aria-labelledby="story-title">
          <div className="rule mx-4 sm:mx-8" />
          <div className="grid gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_2.2fr]">
            <p id="story-title" className="eyebrow text-xs font-medium text-cream/60">
              {ar ? "قصتنا" : "Our story"}
            </p>
            <div className="space-y-8">
              {story.map((p, i) => (
                <p key={i} className={i === 0 ? "display text-[28px] leading-snug sm:text-[38px]" : "text-[18px] leading-relaxed text-cream/70"}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* numbers */}
      <section className="relative z-20 bg-walnut">
        <div className="rule mx-4 sm:mx-8" />
        <dl className="grid grid-cols-2 gap-y-10 px-4 py-16 sm:px-8 lg:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label} className="flex flex-col-reverse border-s border-dashed border-cream/20 ps-5">
              <dt className="eyebrow mt-3 text-[11px] font-medium text-cream/50">{n.label}</dt>
              <dd className="num display text-[56px] leading-none sm:text-[72px]">{n.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* pillars */}
      <section className="relative z-20 bg-walnut" aria-labelledby="pillars-title">
        <div className="rule mx-4 sm:mx-8" />
        <div className="px-4 py-24 sm:px-8">
          <h2 id="pillars-title" className="display max-w-3xl text-[41px] leading-[0.9] lg:text-[56px]">
            {ar ? "كيف نعمل معك" : "How we work with you"}
          </h2>
          <ol className="mt-14 grid gap-[18px] md:grid-cols-3">
            {pillars.map(([title, body], i) => (
              <li key={title} className="border-t border-dashed border-cream/35 pt-5">
                <span className="num text-xs font-medium text-cream/45">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-[22px] leading-tight font-medium">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cream/65">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ServicesIndex />

      <div className="relative z-20 bg-walnut">
        <HowItWorks locale={locale} />
      </div>

      {/* closing */}
      <section className="relative z-20 bg-walnut">
        <div className="rule mx-4 sm:mx-8" />
        <div className="grid gap-8 px-4 py-24 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <h2 className="display text-[41px] leading-[0.9] sm:text-[64px]">{ar ? "لنصنع عبوتك القادمة معًا." : "Let’s make your next box together."}</h2>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href={`/${locale}/studio`} className={buttonClass("primary", "md")}>
              {t.home.ctaDesign}
            </Link>
            <Link href={`/${locale}/contact`} className={buttonClass("outline", "md")}>
              {t.nav.contact}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
