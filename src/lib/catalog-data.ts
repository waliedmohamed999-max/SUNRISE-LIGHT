import "server-only";
import { db } from "./db";
import type { Locale } from "@/i18n/config";
import { getEngine } from "@/packaging/engine";

export interface CatalogProduct {
  code: string;
  engineKey: string;
  boxStyle: string;
  name: string;
  description: string;
  category: string;
  industries: string[];
  defaults: { length: number; width: number; height: number };
  limits: { minL: number; maxL: number; minW: number; maxW: number; minH: number; maxH: number };
  printableFaces: number;
  materials: { name: string; color: string }[];
  /** board colour used for the catalogue image: one of the available materials, varied within a category */
  displayColor: string;
  validated: boolean;
}

export interface CatalogCategory {
  slug: string;
  name: string;
  description: string;
  active: boolean;
}

/** Public catalogue for the products pages: visible categories and their enabled templates (factory data only). */
export async function loadCatalog(locale: Locale) {
  const ar = locale === "ar";
  const categories = await db.packagingCategory.findMany({
    where: { status: { not: "HIDDEN" } },
    orderBy: { sortOrder: "asc" },
    include: {
      templates: {
        where: { isEnabled: true, currentVersionId: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { currentVersion: { include: { panels: true } }, materialRules: { include: { material: true } } },
      },
    },
  });
  const products: CatalogProduct[] = categories.flatMap((c) =>
    c.status !== "ACTIVE"
      ? []
      : c.templates.map((tp, i) => {
          const v = tp.currentVersion!;
          const mats = tp.materialRules.filter((r) => r.material.isAvailable);
          return {
            code: tp.code,
            engineKey: tp.engineKey,
            boxStyle: getEngine(tp.engineKey).boxStyle,
            name: ar ? tp.nameAr : tp.nameEn,
            description: ar ? tp.descriptionAr : tp.descriptionEn,
            category: c.slug,
            industries: tp.industries,
            defaults: { length: v.defaultLengthMm, width: v.defaultWidthMm, height: v.defaultHeightMm },
            limits: { minL: v.minLengthMm, maxL: v.maxLengthMm, minW: v.minWidthMm, maxW: v.maxWidthMm, minH: v.minHeightMm, maxH: v.maxHeightMm },
            printableFaces: v.panels.filter((p) => p.printable).length,
            materials: mats.map((r) => ({ name: ar ? r.material.nameAr : r.material.nameEn, color: r.material.colorHex })),
            displayColor: mats.length ? mats[i % mats.length].material.colorHex : "#C9A06B",
            validated: v.dielineValidated,
          };
        }),
  );
  const cats: CatalogCategory[] = categories.map((c) => ({
    slug: c.slug,
    name: ar ? c.nameAr : c.nameEn,
    description: ar ? c.descriptionAr : c.descriptionEn,
    active: c.status === "ACTIVE" && c.templates.length > 0,
  }));
  const materialCount = await db.materialType.count({ where: { isAvailable: true } });
  return { categories: cats, products, materialCount };
}
