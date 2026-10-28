"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { INDUSTRIES } from "@/packaging/industries";
import { TemplateGlyph } from "@/components/studio/TemplateGlyph";

export interface IndustryTemplate {
  code: string;
  engineKey: string;
  name: string;
  industries: string[];
}

/** "By your business": one card per industry with its templates, opening the studio pre-filtered. */
export function IndustryGrid({ templates }: { templates: IndustryTemplate[] }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const groups = INDUSTRIES.map((i) => ({ ...i, items: templates.filter((t) => t.industries.includes(i.key)) })).filter((g) => g.items.length);
  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="industries-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="px-4 py-24 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow text-xs font-medium text-cream/60">{ar ? "حسب نشاطك" : "By your business"}</p>
            <h2 id="industries-title" className="display mt-4 text-[41px] leading-[0.9] sm:text-[64px]">
              {ar ? "عبوة لكل نشاط" : "A box for every business"}
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-cream/65 lg:justify-self-end">
            {ar
              ? `${templates.length} قالباً جاهزاً للتصميم، مرتبة حسب مجال عملك: من علب البرجر والبيتزا إلى علب العطور الفاخرة بالأدراج.`
              : `${templates.length} templates ready to design, organised by industry — from burger and pizza boxes to luxury perfume drawer boxes.`}
          </p>
        </div>
        <ul className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((g, gi) => (
            <li key={g.key}>
              <Link
                href={`/${locale}/studio?industry=${g.key}`}
                className="group flex h-full flex-col rounded-[12px] border border-cream/10 bg-bark/35 p-5 transition hover:border-cream/35 hover:bg-bark/60"
              >
                <div className="flex items-start justify-between">
                  <span className="serif num text-sm text-cream/45">{String(gi + 1).padStart(2, "0")}</span>
                  <span className="num rounded-full bg-cream/10 px-2.5 py-0.5 text-[11px] font-medium text-cream/80">{g.items.length}</span>
                </div>
                <h3 className="display mt-5 text-[24px] leading-tight text-cream">{ar ? g.ar : g.en}</h3>
                <div className="mt-4 flex -space-x-2 rtl:space-x-reverse">
                  {g.items.slice(0, 5).map((t) => (
                    <TemplateGlyph key={t.code} engineKey={t.engineKey} className="size-10 border border-walnut bg-cream/90" />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-cream/60">
                  {g.items
                    .slice(0, 4)
                    .map((t) => t.name)
                    .join(ar ? "، " : ", ")}
                  {g.items.length > 4 ? (ar ? "…" : "…") : ""}
                </p>
                <span className="eyebrow mt-auto pt-5 text-[11px] font-medium text-ember transition group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                  {ar ? "صمّم الآن ←" : "Design now →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
