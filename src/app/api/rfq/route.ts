import { z } from "zod";
import { Prisma } from "@prisma/client";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadDesignFor, validateDesignForOwner } from "@/lib/designs";
import { nextNumber, transition } from "@/lib/quotes";
import { STAFF_TRANSITIONS } from "@/lib/rbac";
import { getPricing, priceDesign } from "@/lib/pricing-store";
import { evaluateOption } from "@/lib/pricing";
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
  phone: z
    .string()
    .trim()
    .min(6)
    .max(30)
    .regex(/^[+\d\s()-]+$/),
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
    if (
      materialCode &&
      (!material || !material.isAvailable || !(await db.templateMaterialRule.findUnique({ where: { templateId_materialId: { templateId: template.id, materialId: material.id } } })))
    ) {
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
      interior: doc.interior ?? null,
      finishing: finishings.map((f) => ({ code: f.code, nameAr: f.nameAr, nameEn: f.nameEn })),
      surfaces: Object.fromEntries(
        SURFACE_KEYS.map((k) => [
          k,
          {
            background: doc.surfaces[k].background,
            elements: doc.surfaces[k].elements.length,
            images: doc.surfaces[k].elements.filter((e) => e.type === "image").length,
            finishes: [...new Set(doc.surfaces[k].elements.map((e) => e.finish ?? "none").filter((x) => x !== "none"))],
            coating: doc.surfaces[k].coating ?? "none",
          },
        ]),
      ),
    };

    // automatic pricing from the factory price list: computed here from server-validated data only
    const pricing = await getPricing();
    const quote = pricing.enabled
      ? await priceDesign(doc, template.engineKey, { materialCode: material?.code ?? null, finishingCodes: finishings.map((f) => f.code), quantity: body.quantity }, pricing)
      : null;
    const autoSend = !!quote?.ok && pricing.mode === "auto-send";

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
      if (quote?.ok) {
        const validUntil = new Date(Date.now() + pricing.validityDays * 864e5);
        const offer = await tx.quotationOffer.create({
          data: {
            requestId: request.id,
            source: "AUTO",
            createdById: null,
            currency: quote.currency,
            unitPrice: new Prisma.Decimal(quote.unitPrice),
            quantity: quote.quantity,
            subtotal: new Prisma.Decimal(quote.subtotal),
            taxPercent: new Prisma.Decimal(quote.taxPercent),
            total: new Prisma.Decimal(quote.total),
            validUntil: new Date(validUntil.toISOString().slice(0, 10)),
            leadTime: pricing.leadTime,
            terms: pricing.terms,
            breakdown: { lines: quote.lines, cost: quote.cost, margin: quote.margin, discountPercent: quote.discountPercent, discount: quote.discount, minOrderApplied: quote.minOrderApplied },
            // the same structure the quote builder produces, so staff can open and adjust it
            details: (() => {
              const build = {
                lines: quote.builder,
                marginPercent: pricing.marginPercent,
                options: [{ quantity: quote.quantity, discountPercent: quote.discountPercent, unitPriceOverride: null }],
                taxPercent: quote.taxPercent,
                minOrderTotal: pricing.minOrderTotal,
                depositPercent: pricing.depositPercent,
                paymentTerms: pricing.paymentTerms,
                customerNote: "",
                internalNote: "",
              };
              return { version: 1, areaM2: quote.areaM2, ...build, computed: build.options.map((o) => evaluateOption(build, o, quote.areaM2)) };
            })(),
            sentAt: autoSend ? new Date() : null,
          },
        });
        await transition(tx, { requestId: request.id, from: "NEW", to: "PRICING", allowed: STAFF_TRANSITIONS, actorId: null, note: "automatic pricing" });
        if (autoSend) {
          await tx.quotationDocument.create({ data: { requestId: request.id, offerId: offer.id, docNumber: await nextNumber(tx, "Q") } });
          await transition(tx, { requestId: request.id, from: "PRICING", to: "QUOTE_SENT", allowed: STAFF_TRANSITIONS, actorId: null, note: "automatic quotation sent" });
        }
        await audit(
          {
            actorId: null,
            action: autoSend ? "offer.auto_send" : "offer.auto_suggest",
            entity: "quotation_offer",
            entityId: offer.id,
            meta: { requestId: request.id, total: quote.total.toFixed(2) },
            ip: clientIp(req),
          },
          tx,
        );
      }
      await audit({ actorId: user.id, action: "rfq.create", entity: "quotation_request", entityId: request.id, meta: { rfqNumber }, ip: clientIp(req) }, tx);
      return request;
    });

    const isAr = body.locale === "ar";
    await notify({
      type: "rfq.created",
      title: isAr ? `تم استلام طلبك ${created.rfqNumber}` : `Request ${created.rfqNumber} received`,
      body: autoSend
        ? isAr
          ? "عرض السعر جاهز في حسابك ويمكنك اعتماده مباشرة."
          : "Your quotation is ready in your account and can be approved right away."
        : isAr
          ? "سيراجع فريق المصنع تصميمك فنياً ثم يرسل لك عرض السعر."
          : "The factory team will review your design and send you a quotation.",
      link: `/${body.locale}/account/quotes/${created.id}`,
      userIds: [user.id],
      emails: [body.email],
    });
    await notify({
      type: "rfq.new_for_staff",
      title: `New RFQ ${created.rfqNumber} / طلب جديد`,
      body: `${body.contactName}${body.companyName ? ` — ${body.companyName}` : ""} · ${template.nameEn} · qty ${body.quantity}${quote?.ok ? ` · ${autoSend ? "auto quote sent" : "suggested"} ${quote.total.toFixed(2)} ${quote.currency}` : ""}`,
      link: `/ar/admin/quotes/${created.id}`,
      userIds: await staffRecipients(["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"]),
      emails: process.env.SALES_TEAM_EMAIL ? [process.env.SALES_TEAM_EMAIL] : [],
    });

    return ok({ request: { id: created.id, rfqNumber: created.rfqNumber }, autoQuoted: autoSend }, 201);
  },
  { rate: { key: "rfq", limit: 20, windowMs: 60 * 60 * 1000 } },
);
