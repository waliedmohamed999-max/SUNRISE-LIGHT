import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { FACTORY_SERVICES } from "@/lib/factory-services";

/** How an order moves through the platform (describes the actual studio → RFQ workflow). */
export function ProcessSteps({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const steps = ar
    ? [
        ["اختر نوع العبوة", "من قوالب الكراتين والعلب والأكياس حسب نشاطك."],
        ["حدّد المقاسات والخامة", "بالمليمتر، مع الخامات والتشطيبات المتاحة."],
        ["صمّم وأضف شعارك", "ألوان كل وجه، النصوص، الشعار، البصمة والكفراج — مع معاينة ثلاثية الأبعاد."],
        ["اطلب عرض السعر", "أرسل التصميم والكمية ومدينة التسليم من حسابك."],
        ["مراجعة فنية وعرض معتمد", "يراجع فريق المصنع الطلب ويرسل عرض السعر إلى حسابك."],
      ]
    : [
        ["Choose a packaging type", "Cartons, boxes and bags organised by industry."],
        ["Set dimensions and material", "In millimetres, with the available materials and finishes."],
        ["Design and add your logo", "Per-face colours, text, logo, foil and embossing — with a 3D preview."],
        ["Request a quotation", "Send the design, quantity and delivery city from your account."],
        ["Technical review and approved quote", "The factory team reviews the request and sends the quotation to your account."],
      ];
  return (
    <section className="mt-14">
      <h2 className="text-xl font-bold text-navy">{ar ? "كيف يتم الطلب" : "How ordering works"}</h2>
      <ol className="mt-6 space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-sun text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold text-navy">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The factory's service lines from the company profile, each linked to the studio or to the contact page. */
export function ServicesShowcase({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const ar = locale === "ar";
  const items = compact ? FACTORY_SERVICES.slice(0, 6) : FACTORY_SERVICES;
  return (
    <section className="mt-14">
      <h2 className="text-xl font-bold text-navy">{ar ? "خدماتنا" : "Our services"}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((s) => (
          <li key={s.slug} className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
            <div className="relative aspect-[2/1] bg-white">
              <Image src={s.image} alt={s.name[locale]} fill sizes="(min-width: 640px) 384px, 100vw" className="object-contain" />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-navy/8 px-4 py-3">
              <p className="font-semibold text-navy">{s.name[locale]}</p>
              <Link href={s.studioCategory ? `/${locale}/products/${s.studioCategory}` : `/${locale}/contact`} className="shrink-0 text-xs font-semibold text-sun hover:underline">
                {s.studioCategory ? (ar ? "صمّمها الآن" : "Design it") : ar ? "اطلب عرض سعر" : "Request a quote"}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">
        {compact ? (
          <Link href={`/${locale}/services`} className="font-semibold text-sun hover:underline">
            {ar ? "كل الخدمات" : "All services"}
          </Link>
        ) : ar ? (
          "الصور نماذج توضيحية من ملف تعريف الشركة."
        ) : (
          "Images are illustrative examples from the company profile."
        )}
      </p>
    </section>
  );
}
