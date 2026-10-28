import "server-only";
import { db } from "./db";
import { ENGINES } from "@/packaging/engine";

/** Serializable template description sent to the studio. */
export interface CatalogTemplate {
  id: string;
  code: string;
  engineKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: { slug: string; nameAr: string; nameEn: string };
  version: {
    id: string;
    version: number;
    limits: { minLengthMm: number; maxLengthMm: number; minWidthMm: number; maxWidthMm: number; minHeightMm: number; maxHeightMm: number };
    defaults: { length: number; width: number; height: number };
    safeMarginMm: number;
    dielineValidated: boolean;
    printOptions: string[];
    panels: { key: string; nameAr: string; nameEn: string; printable: boolean }[];
  };
  materialCodes: string[];
}

export interface CatalogMaterial {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  kind: string;
  thickness: string;
  colorHex: string;
  limitationsAr: string;
  limitationsEn: string;
  factoryApproved: boolean;
  finishingCodes: string[];
}

export interface CatalogFinishing {
  code: string;
  nameAr: string;
  nameEn: string;
}

export async function loadCatalog(opts: { includeDisabled?: boolean } = {}) {
  const [templates, materials, finishings] = await Promise.all([
    db.packagingTemplate.findMany({
      where: opts.includeDisabled ? {} : { isEnabled: true, currentVersionId: { not: null } },
      include: {
        category: true,
        currentVersion: { include: { panels: true } },
        materialRules: { include: { material: { select: { code: true, isAvailable: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.materialType.findMany({ where: { isAvailable: true }, include: { finishings: { include: { finishing: true } } }, orderBy: { sortOrder: "asc" } }),
    db.finishingOption.findMany({ where: { isAvailable: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const catalogTemplates: CatalogTemplate[] = templates
    .filter((t) => t.currentVersion && ENGINES[t.engineKey])
    .map((t) => {
      const v = t.currentVersion!;
      return {
        id: t.id,
        code: t.code,
        engineKey: t.engineKey,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        descriptionAr: t.descriptionAr,
        descriptionEn: t.descriptionEn,
        category: { slug: t.category.slug, nameAr: t.category.nameAr, nameEn: t.category.nameEn },
        version: {
          id: v.id,
          version: v.version,
          limits: {
            minLengthMm: v.minLengthMm,
            maxLengthMm: v.maxLengthMm,
            minWidthMm: v.minWidthMm,
            maxWidthMm: v.maxWidthMm,
            minHeightMm: v.minHeightMm,
            maxHeightMm: v.maxHeightMm,
          },
          defaults: { length: v.defaultLengthMm, width: v.defaultWidthMm, height: v.defaultHeightMm },
          safeMarginMm: v.safeMarginMm,
          dielineValidated: v.dielineValidated,
          printOptions: Array.isArray(v.printOptions) ? (v.printOptions as string[]) : [],
          panels: v.panels.map((p) => ({ key: p.key, nameAr: p.nameAr, nameEn: p.nameEn, printable: p.printable })),
        },
        materialCodes: t.materialRules.filter((r) => r.material.isAvailable).map((r) => r.material.code),
      };
    });

  const catalogMaterials: CatalogMaterial[] = materials.map((m) => ({
    id: m.id,
    code: m.code,
    nameAr: m.nameAr,
    nameEn: m.nameEn,
    kind: m.kind,
    thickness: m.thickness,
    colorHex: m.colorHex,
    limitationsAr: m.limitationsAr,
    limitationsEn: m.limitationsEn,
    factoryApproved: m.factoryApproved,
    finishingCodes: m.finishings.filter((f) => f.finishing.isAvailable).map((f) => f.finishing.code),
  }));

  const catalogFinishings: CatalogFinishing[] = finishings.map((f) => ({ code: f.code, nameAr: f.nameAr, nameEn: f.nameEn }));

  return { templates: catalogTemplates, materials: catalogMaterials, finishings: catalogFinishings };
}

export type Catalog = Awaited<ReturnType<typeof loadCatalog>>;
