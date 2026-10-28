import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const mm = z.number().int().min(1).max(5000);
const schema = z.object({
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  descriptionAr: z.string().trim().max(1000),
  descriptionEn: z.string().trim().max(1000),
  isEnabled: z.boolean(),
  limits: z.object({ minLengthMm: mm, maxLengthMm: mm, minWidthMm: mm, maxWidthMm: mm, minHeightMm: mm, maxHeightMm: mm }),
  defaults: z.object({ length: mm, width: mm, height: mm }),
  safeMarginMm: z.number().int().min(0).max(50),
  dielineValidated: z.boolean(),
  printablePanels: z.array(z.string().max(20)),
  materialIds: z.array(z.string().max(40)),
});

/**
 * Update a template. Geometry-affecting fields (limits, defaults, margin, printable panels, validation)
 * create a NEW template version so existing designs keep the version they were made with.
 */
export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const canManage = can(user.role, "template.manage");
  if (!canManage && !can(user.role, "template.validate")) throw new HttpError(403, "forbidden");
  const b = await parseJson(req, schema);
  if (!canManage) {
    // Technical reviewers may only change the dieline validation flag
    const tplNow = await db.packagingTemplate.findUnique({ where: { id }, include: { currentVersion: { include: { panels: true } }, materialRules: true } });
    if (!tplNow?.currentVersion) throw new HttpError(404, "not_found");
    const v = tplNow.currentVersion;
    Object.assign(b, {
      nameAr: tplNow.nameAr,
      nameEn: tplNow.nameEn,
      descriptionAr: tplNow.descriptionAr,
      descriptionEn: tplNow.descriptionEn,
      isEnabled: tplNow.isEnabled,
      limits: { minLengthMm: v.minLengthMm, maxLengthMm: v.maxLengthMm, minWidthMm: v.minWidthMm, maxWidthMm: v.maxWidthMm, minHeightMm: v.minHeightMm, maxHeightMm: v.maxHeightMm },
      defaults: { length: v.defaultLengthMm, width: v.defaultWidthMm, height: v.defaultHeightMm },
      safeMarginMm: v.safeMarginMm,
      printablePanels: v.panels.filter((p) => p.printable).map((p) => p.key),
      materialIds: tplNow.materialRules.map((r) => r.materialId),
    });
  }
  const l = b.limits;
  if (l.minLengthMm > l.maxLengthMm || l.minWidthMm > l.maxWidthMm || l.minHeightMm > l.maxHeightMm) throw new HttpError(422, "limits_inverted");
  const d = b.defaults;
  if (d.length < l.minLengthMm || d.length > l.maxLengthMm || d.width < l.minWidthMm || d.width > l.maxWidthMm || d.height < l.minHeightMm || d.height > l.maxHeightMm) {
    throw new HttpError(422, "defaults_outside_limits");
  }

  const tpl = await db.packagingTemplate.findUnique({ where: { id }, include: { currentVersion: { include: { panels: true } }, versions: { select: { version: true } } } });
  if (!tpl || !tpl.currentVersion) throw new HttpError(404, "not_found");
  const cur = tpl.currentVersion;
  if (b.dielineValidated !== cur.dielineValidated && !can(user.role, "template.validate")) throw new HttpError(403, "forbidden");

  const geometryChanged =
    cur.minLengthMm !== l.minLengthMm ||
    cur.maxLengthMm !== l.maxLengthMm ||
    cur.minWidthMm !== l.minWidthMm ||
    cur.maxWidthMm !== l.maxWidthMm ||
    cur.minHeightMm !== l.minHeightMm ||
    cur.maxHeightMm !== l.maxHeightMm ||
    cur.defaultLengthMm !== d.length ||
    cur.defaultWidthMm !== d.width ||
    cur.defaultHeightMm !== d.height ||
    cur.safeMarginMm !== b.safeMarginMm ||
    cur.dielineValidated !== b.dielineValidated ||
    cur.panels.some((p) => p.printable !== b.printablePanels.includes(p.key));

  await db.$transaction(async (tx) => {
    let currentVersionId = cur.id;
    if (geometryChanged) {
      const v = await tx.templateVersion.create({
        data: {
          templateId: tpl.id,
          version: Math.max(...tpl.versions.map((x) => x.version)) + 1,
          ...l,
          defaultLengthMm: d.length,
          defaultWidthMm: d.width,
          defaultHeightMm: d.height,
          safeMarginMm: b.safeMarginMm,
          dielineValidated: b.dielineValidated,
          constraints: cur.constraints ?? {},
          printOptions: cur.printOptions ?? [],
          panels: { create: cur.panels.map((p) => ({ key: p.key, nameAr: p.nameAr, nameEn: p.nameEn, printable: b.printablePanels.includes(p.key) })) },
        },
      });
      currentVersionId = v.id;
    }
    await tx.packagingTemplate.update({
      where: { id: tpl.id },
      data: { nameAr: b.nameAr, nameEn: b.nameEn, descriptionAr: b.descriptionAr, descriptionEn: b.descriptionEn, isEnabled: b.isEnabled, currentVersionId },
    });
    await tx.templateMaterialRule.deleteMany({ where: { templateId: tpl.id } });
    if (b.materialIds.length) await tx.templateMaterialRule.createMany({ data: b.materialIds.map((materialId) => ({ templateId: tpl.id, materialId })) });
    await audit({ actorId: user.id, action: "template.update", entity: "packaging_template", entityId: tpl.id, meta: { newVersion: geometryChanged }, ip: clientIp(req) }, tx);
  });
  return ok({ ok: true, newVersion: geometryChanged });
});
