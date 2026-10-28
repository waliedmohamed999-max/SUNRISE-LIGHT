import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Experience } from "@/components/experience/Experience";
import { ChooseBox } from "@/components/experience/ChooseBox";
import { FaqShowcase } from "@/components/experience/FaqShowcase";
import { cx } from "@/components/ui";

/*
 * Homepage — scroll-driven product film:
 * one fixed 3D scene in which a Sunrise carton is measured, unfolded into its real dieline,
 * resized, printed and joined by the product family, with chapter text scrubbed over it.
 * Regular content (categories, process, materials, FAQ) follows on a solid surface.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const ar = locale === "ar";

  const [categories, materials, finishings, faq] = await Promise.all([
    db.packagingCategory.findMany({ where: { status: { not: "HIDDEN" } }, orderBy: { sortOrder: "asc" } }),
    db.materialType.findMany({ where: { isAvailable: true }, orderBy: { sortOrder: "asc" } }),
    db.finishingOption.findMany({ where: { isAvailable: true, code: { not: "none" } }, orderBy: { sortOrder: "asc" } }),
    db.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
  ]);
  const templates = await db.packagingTemplate.findMany({
    where: { isEnabled: true, currentVersionId: { not: null } },
    orderBy: { createdAt: "asc" },
    include: { currentVersion: { include: { panels: true } }, materialRules: { include: { material: true } } },
  });
  const display = "font-medium leading-[0.9]";

  return (
    <div className="text-cream">
      <Experience
        categories={categories.map((c) => ({ slug: c.slug, name: ar ? c.nameAr : c.nameEn, description: ar ? c.descriptionAr : c.descriptionEn, active: c.status === "ACTIVE" }))}
      />

      <ChooseBox
        templates={templates
          .filter((tp) => tp.currentVersion && ["rsc", "mailer", "rte"].includes(tp.engineKey))
          .map((tp) => {
            const v = tp.currentVersion!;
            return {
              code: tp.code,
              engineKey: tp.engineKey as "rsc" | "mailer" | "rte",
              name: ar ? tp.nameAr : tp.nameEn,
              description: ar ? tp.descriptionAr : tp.descriptionEn,
              limits: { minL: v.minLengthMm, maxL: v.maxLengthMm, minW: v.minWidthMm, maxW: v.maxWidthMm, minH: v.minHeightMm, maxH: v.maxHeightMm },
              printableFaces: v.panels.filter((p) => p.printable).length,
              materials: tp.materialRules.filter((r) => r.material.isAvailable).map((r) => (ar ? r.material.nameAr : r.material.nameEn)),
              validated: v.dielineValidated,
            };
          })}
      />

      <div className="relative z-20 bg-walnut">
        {/* ── How it works ── */}
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

        {/* ── Materials & finishing ── */}
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

      </div>

      <FaqShowcase items={faq.map((f) => ({ id: f.id, q: ar ? f.questionAr : f.questionEn, a: ar ? f.answerAr : f.answerEn }))} />
    </div>
  );
}
