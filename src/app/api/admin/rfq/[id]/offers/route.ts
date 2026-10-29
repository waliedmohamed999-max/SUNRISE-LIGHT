import { z } from "zod";
import { Prisma } from "@prisma/client";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { can, STAFF_TRANSITIONS } from "@/lib/rbac";
import { nextNumber, notifyCustomerStatus, transition } from "@/lib/quotes";
import { audit } from "@/lib/audit";
import { evaluateOption, quoteBuildSchema } from "@/lib/pricing";
import { requestSheetArea } from "@/lib/pricing-store";

const common = {
  currency: z.string().regex(/^[A-Z]{3}$/).default("SAR"),
  validUntil: z.string().date().nullish(),
  leadTime: z.string().trim().max(200).default(""),
  terms: z.string().trim().max(4000).default(""),
  send: z.boolean().default(false),
};
/** simple offer: one unit price × quantity */
const simpleSchema = z.object({
  unitPrice: z.number().positive().max(1_000_000),
  quantity: z.number().int().positive().max(10_000_000),
  taxPercent: z.number().min(0).max(100),
  ...common,
});
/** quote builder: the server computes every figure from the lines and options */
const builderSchema = z.object({ build: quoteBuildSchema, ...common });
const schema = z.union([builderSchema, simpleSchema]);

/** Create a factory-approved quotation (simple or built line by line). Optionally send it to the customer. */
export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("rfq.price");
  const body = await parseJson(req, schema);
  if (body.send && !can(user.role, "rfq.send")) throw new HttpError(403, "forbidden");
  const request = await db.quotationRequest.findUnique({ where: { id }, include: { customer: { select: { locale: true } } } });
  if (!request) throw new HttpError(404, "not_found");
  if (!["PRICING", "REVISION_REQUESTED", "QUOTE_SENT"].includes(request.status)) throw new HttpError(409, "not_in_pricing");

  // primary figures (option 1 for a built quote) stay in the offer columns used everywhere else
  let figures: { unitPrice: Prisma.Decimal; quantity: number; subtotal: Prisma.Decimal; taxPercent: Prisma.Decimal; total: Prisma.Decimal };
  let details: Prisma.InputJsonValue | undefined;
  if ("build" in body) {
    const b = body.build;
    const ids = new Set(b.lines.map((l) => l.id));
    if (ids.size !== b.lines.length) throw new HttpError(400, "duplicate_line");
    const areaM2 = await requestSheetArea(id);
    if (areaM2 === null) throw new HttpError(422, "design_unavailable");
    const computed = b.options.map((o) => evaluateOption(b, o, areaM2));
    const p = computed[0];
    figures = { unitPrice: new Prisma.Decimal(p.unitPrice), quantity: p.quantity, subtotal: new Prisma.Decimal(p.subtotal), taxPercent: new Prisma.Decimal(b.taxPercent), total: new Prisma.Decimal(p.total) };
    details = { version: 1, areaM2, ...b, computed };
  } else {
    const unit = new Prisma.Decimal(body.unitPrice);
    const subtotal = unit.mul(body.quantity).toDecimalPlaces(2);
    const total = subtotal.mul(new Prisma.Decimal(1).add(new Prisma.Decimal(body.taxPercent).div(100))).toDecimalPlaces(2);
    figures = { unitPrice: unit, quantity: body.quantity, subtotal, taxPercent: new Prisma.Decimal(body.taxPercent), total };
  }

  const offer = await db.$transaction(async (tx) => {
    const o = await tx.quotationOffer.create({
      data: {
        requestId: id,
        currency: body.currency,
        ...figures,
        details,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        leadTime: body.leadTime,
        terms: body.terms,
        createdById: user.id,
        sentAt: body.send ? new Date() : null,
      },
    });
    if (body.send) {
      await tx.quotationDocument.create({ data: { requestId: id, offerId: o.id, docNumber: await nextNumber(tx, "Q") } });
      if (request.status !== "QUOTE_SENT") {
        // REVISION_REQUESTED → PRICING → QUOTE_SENT keeps the history explicit
        if (request.status === "REVISION_REQUESTED") {
          await transition(tx, { requestId: id, from: "REVISION_REQUESTED", to: "PRICING", allowed: STAFF_TRANSITIONS, actorId: user.id });
          await transition(tx, { requestId: id, from: "PRICING", to: "QUOTE_SENT", allowed: STAFF_TRANSITIONS, actorId: user.id });
        } else {
          await transition(tx, { requestId: id, from: request.status, to: "QUOTE_SENT", allowed: STAFF_TRANSITIONS, actorId: user.id });
        }
      } else {
        await tx.quotationStatusHistory.create({ data: { requestId: id, fromStatus: "QUOTE_SENT", toStatus: "QUOTE_SENT", changedById: user.id, note: "revised quotation sent" } });
      }
    }
    await audit({ actorId: user.id, action: body.send ? "offer.send" : "offer.create", entity: "quotation_offer", entityId: o.id, meta: { requestId: id, total: figures.total.toString(), builder: "build" in body }, ip: clientIp(req) }, tx);
    return o;
  });

  if (body.send) await notifyCustomerStatus(request, "QUOTE_SENT", request.customer.locale === "en" ? "en" : "ar");
  return ok({ offer: { id: offer.id } }, 201);
});
