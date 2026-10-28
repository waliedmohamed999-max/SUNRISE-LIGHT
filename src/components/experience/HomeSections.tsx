import type { FinishingOption, MaterialType } from "@prisma/client";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { cx } from "@/components/ui";

const display = "font-medium leading-[0.9]";

/** "How it works": four steps and the order process strip (homepage + services). */
export function HowItWorks({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <section>
      <div className="rule mx-4 sm:mx-8" />
      <div className="px-4 py-24 sm:px-8">
        <h2 className={cx(display, "max-w-3xl text-[41px] lg:text-[51px]")}>{t.home.howTitle}</h2>
        <ol className="mt-14 grid gap-[18px] md:grid-cols-4">
          {t.home.how.map((s, i) => (
            <li key={i} className="border-t border-dashed border-cream/35 pt-5">
              <span className="num text-xs font-medium text-cream/45">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-[18px] leading-tight font-medium">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/65">{s.d}</p>
            </li>
          ))}
        </ol>
        <ol className="mt-16 flex flex-wrap gap-x-8 gap-y-3">
          {t.home.process.map((p, i) => (
            <li key={p} className="eyebrow flex items-center gap-3 text-xs font-medium text-cream/60">
              <span className="num text-cream/35">{String(i + 1).padStart(2, "0")}</span>
              {p}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Materials list and finishing options from the catalogue (homepage + services). */
export function MaterialsFinishing({ locale, materials, finishings }: { locale: Locale; materials: MaterialType[]; finishings: FinishingOption[] }) {
  const t = getDict(locale);
  const ar = locale === "ar";
  return (
    <section>
      <div className="rule mx-4 sm:mx-8" />
      <div className="grid gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className={cx(display, "text-[41px] lg:text-[51px]")}>{t.home.materialsTitle}</h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-cream/60">{t.home.materialsBody}</p>
        </div>
        <div>
          <ul>
            {materials.map((m) => (
              <li key={m.id} className="flex items-center gap-4 border-t border-dashed border-cork py-4">
                <span className="size-8 shrink-0 rounded-full border border-cream/15" style={{ background: m.colorHex }} />
                <span className="flex-1 text-[18px] font-medium">{ar ? m.nameAr : m.nameEn}</span>
                <span className="eyebrow text-[10px] font-medium text-cream/45">{m.factoryApproved ? m.thickness : ar ? "للتأكيد" : "TBC"}</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-12 mb-4 text-xs font-medium text-cream/50">{t.home.finishingTitle}</p>
          <ul className="flex flex-wrap gap-2">
            {finishings.map((f) => (
              <li key={f.id} className="rounded-[22.5px] border border-cream/30 px-4 py-2 text-xs font-medium text-cream/80">
                {ar ? f.nameAr : f.nameEn}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
