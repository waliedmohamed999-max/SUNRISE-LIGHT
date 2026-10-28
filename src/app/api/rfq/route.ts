import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadDesignFor, validateDesignForOwner } from "@/lib/designs";
import { nextNumber } from "@/lib/quotes";
import { notify, staffRecipients } from "@/lib/notifications";
import { SURFACE_KEYS } from "@/packaging/types";

const schema = z.object({
  designId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(10_000_000),
  printingRequirements: z.string().trim().max(1000).default(""),
  materialCode: z.string().max(60).nullable(),
  finishingCodes: z.array(z.string().max(60)).max(20).default([]),
  deliveryCity: z.string().trim().min(2).max(120),
  deliveryLocation: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(2000).optional(),
  contactName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(6).max(30).regex(/^[+\d\s()-]+$/),
  email: z.string().trim().toLowerCase().email().max(200),
  previewAssetId: z.string().max(40).nullish(),
  locale: z.enum(["ar", "en"]).default("ar"),
});

export const GET = api(async () => {
  const user = await requireUser();
  const requests = await db.quotationRequest.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, rfqNumber: true, status: true, createdAt: true, updatedAt: true },
  });
  return ok({ requests });
});

export const POST = api(
  async (req) => {
    const user = await requireUser();
    const body = await parseJson(req, schema);
    const design = await loadDesignFor(user, body.designId, "write");
    const { doc, template, version } = await validateDesignForOwner(design.document, user.id, { requireEnabled: true });

    const materialCode = body.materialCode ?? doc.materialCode;
    const material = materialCode ? await db.materialType.findUnique({ where: { code: materialCode } }) : null;
    if (materialCode && (!material || !material.isAvailable || !(await db.templateMaterialRule.findUnique({ where: { templateId_materialId: { templateId: template.id, materialId: material.id } } })))) {
      throw new HttpError(422, "material_incompatible");
    }
    const finishings = await db.finishingOption.findMany({ where: { code: { in: body.finishingCodes }, isAvailable: true } });
    if (finishings.length !== new Set(body.finishingCodes).size) throw new HttpError(422, "finishing_invalid");
    if (body.previewAssetId && !(await db.uploadedAsset.findFirst({ where: { id: body.previewAssetId, ownerId: user.id, kind: "PREVIEW" } }))) {
      throw new HttpError(422, "preview_invalid");
    }

    const specSnapshot = {
      template: { code: template.code, nameAr: template.nameAr, nameEn: template.nameEn, version: version.version, dielineValidated: version.dielineValidated, engineKey: template.engineKey },
      dimensionsMm: doc.dimensions,
      material: material ? { code: material.code, nameAr: material.nameAr, nameEn: material.nameEn, thickness: material.thickness, factoryApproved: material.factoryApproved } : null,
      printOption: doc.printOption,
      finishing: finishings.map((f) => ({ code: f.code, nameAr: f.nameAr, nameEn: f.nameEn })),
      surfaces: Object.fromEntries(
        SURFACE_KEYS.map((k) => [k, { background: doc.surfaces[k].background, elements: doc.surfaces[k].elements.length, images: doc.surfaces[k].elements.filter((e) => e.type === "image").length }]),
      ),
    };

    const created = await db.$transaction(async (tx) => {
      const last = await tx.designVersion.findFirst({ where: { projectId: design.id }, orderBy: { versionNo: "desc" }, select: { versionNo: true } });
      const snapshot = await tx.designVersion.create({ data: { projectId: design.id, versionNo: (last?.versionNo ?? 0) + 1, document: doc, note: "rfq submission" } });
      const rfqNumber = await nextNumber(tx, "RFQ");
      const request = await tx.quotationRequest.create({
        data: {
          rfqNumber,
          customerId: user.id,
          contactName: body.contactName,
          companyName: body.companyName || null,
          phone: body.phone,
          email: body.email,
          deliveryCity: body.deliveryCity,
          deliveryLocation: body.deliveryLocation,
          notes: body.notes || null,
          previewAssetId: body.previewAssetId ?? null,
          items: {
            create: {
              designProjectId: design.id,
              designVersionId: snapshot.id,
              materialId: material?.id ?? null,
              quantity: body.quantity,
              printingRequirements: body.printingRequirements,
              finishingCodes: finishings.map((f) => f.code),
              specSnapshot,
            },
          },
          statusHistory: { create: { toStatus: "NEW", changedById: user.id } },
        },
      });
      await tx.designProject.update({ where: { id: design.id }, data: { status: "SUBMITTED" } });
      await audit({ actorId: user.id, action: "rfq.create", entity: "quotation_request", entityId: request.id, meta: { rfqNumber }, ip: clientIp(req) }, tx);
      return request;
    });

    const isAr = body.locale === "ar";
    await notify({
      type: "rfq.created",
      title: isAr ? `تم استلام طلبك ${created.rfqNumber}` : `Request ${created.rfqNumber} received`,
      body: isAr ? "سيراجع فريق المصنع تصميمك فنياً ثم يرسل لك عرض السعر." : "The factory team will review your design and send you a quotation.",
      link: `/${body.locale}/account/quotes/${created.id}`,
      userIds: [user.id],
      emails: [body.email],
    });
    await notify({
      type: "rfq.new_for_staff",
      title: `New RFQ ${created.rfqNumber} / طلب جديد`,
      body: `${body.contactName}${body.companyName ? ` — ${body.companyName}` : ""} · ${template.nameEn} · qty ${body.quantity}`,
      link: `/ar/admin/quotes/${created.id}`,
      userIds: await staffRecipients(["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"]),
      emails: process.env.SALES_TEAM_EMAIL ? [process.env.SALES_TEAM_EMAIL] : [],
    });

    return ok({ request: { id: created.id, rfqNumber: created.rfqNumber } }, 201);
  },
  { rate: { key: "rfq", limit: 20, windowMs: 60 * 60 * 1000 } },
);
