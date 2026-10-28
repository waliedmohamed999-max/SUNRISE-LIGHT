"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useI18n } from "@/i18n/client";

const ProductStage = dynamic(() => import("@/components/three/ProductStage"), { ssr: false });

/** FAQ in an editorial three-column layout with a floating product in the middle. */
export function FaqShowcase({ items }: { items: { id: string; q: string; a: string }[] }) {
  const { t, locale } = useI18n();
  if (!items.length) return null;
  const half = Math.ceil(items.length / 2);
  const cols = [items.slice(0, half), items.slice(half)];
  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="faq-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="grid gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1fr_1fr]">
        <div>
          <p className="eyebrow text-xs font-medium text-cream/60">{t.story.faqEyebrow}</p>
          <h2 id="faq-title" className="display mt-4 text-[41px] leading-[0.9] lg:text-[51px]">
            {t.story.faqTitle}
          </h2>
          <dl className="mt-10">
            {cols[0].map((f) => (
              <div key={f.id} className="border-t border-dashed border-cork py-5">
                <dt className="display text-[18px] leading-snug text-cream">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-cream/60">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ProductStage kind="rte" className="relative h-[60vh] min-h-[360px] lg:sticky lg:top-[20vh]" />
        <div className="lg:pt-24">
          <dl>
            {cols[1].map((f) => (
              <div key={f.id} className="border-t border-dashed border-cork py-5">
                <dt className="display text-[18px] leading-snug text-cream">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-cream/60">{f.a}</dd>
              </div>
            ))}
          </dl>
          <Link href={`/${locale}/faq`} className="eyebrow mt-6 inline-block border-b border-dashed border-cream pb-0.5 text-xs font-medium">
            {t.nav.faq}
          </Link>
        </div>
      </div>
    </section>
  );
}
