import "server-only";
import { db } from "./db";
import type { Locale } from "@/i18n/config";
import type { ChooseTemplate } from "@/components/experience/ChooseBox";

const CHOOSE_ENGINES = ["rsc", "mailer", "rte", "pizza", "bag", "tray"] as const;

/** Catalogue data shared by the homepage and the services page. */
export async function loadShowcase(locale: Locale) {
  const ar = locale === "ar";
  const [materials, finishings, faq, templates] = await Promise.all([
    db.materialType.findMany({ where: { isAvailable: true }, orderBy: { sortOrder: "asc" } }),
    db.finishingOption.findMany({ where: { isAvailable: true, code: { not: "none" } }, orderBy: { sortOrder: "asc" } }),
    db.faqItem.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    db.packagingTemplate.findMany({
      where: { isEnabled: true, currentVersionId: { not: null } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { currentVersion: { include: { panels: true } }, materialRules: { include: { material: true } } },
    }),
  ]);
  // the comparison shows one representative per structure
  const seenEngines = new Set<string>();
  const representatives = templates.filter((tp) => (seenEngines.has(tp.engineKey) ? false : (seenEngines.add(tp.engineKey), true)));
  const choose: ChooseTemplate[] = representatives
    .filter((tp) => tp.currentVersion && (CHOOSE_ENGINES as readonly string[]).includes(tp.engineKey))
    .map((tp) => {
      const v = tp.currentVersion!;
      return {
        code: tp.code,
        engineKey: tp.engineKey as ChooseTemplate["engineKey"],
        name: ar ? tp.nameAr : tp.nameEn,
        description: ar ? tp.descriptionAr : tp.descriptionEn,
        limits: { minL: v.minLengthMm, maxL: v.maxLengthMm, minW: v.minWidthMm, maxW: v.maxWidthMm, minH: v.minHeightMm, maxH: v.maxHeightMm },
        printableFaces: v.panels.filter((p) => p.printable).length,
        materials: tp.materialRules.filter((r) => r.material.isAvailable).map((r) => (ar ? r.material.nameAr : r.material.nameEn)),
        validated: v.dielineValidated,
      };
    });
  return {
    materials,
    finishings,
    faq: faq.map((f) => ({ id: f.id, q: ar ? f.questionAr : f.questionEn, a: ar ? f.answerAr : f.answerEn })),
    templates,
    choose,
  };
}
