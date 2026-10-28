import { z } from "zod";
import { Prisma } from "@prisma/client";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { can, STAFF_TRANSITIONS } from "@/lib/rbac";
import { nextNumber, notifyCustomerStatus, transition } from "@/lib/quotes";
import { audit } from "@/lib/audit";

const schema = z.object({
  unitPrice: z.number().positive().max(1_000_000),
  quantity: z.number().int().positive().max(10_000_000),
  taxPercent: z.number().min(0).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/).default("SAR"),
  validUntil: z.string().date().nullish(),
  leadTime: z.string().trim().max(200).default(""),
  terms: z.string().trim().max(4000).default(""),
  send: z.boolean().default(false),
});

/** Create a manual, factory-approved quotation. Optionally send it to the customer. */
export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("rfq.price");
  const body = await parseJson(req, schema);
  if (body.send && !can(user.role, "rfq.send")) throw new HttpError(403, "forbidden");
  const request = await db.quotationRequest.findUnique({ where: { id }, include: { customer: { select: { locale: true } } } });
  if (!request) throw new HttpError(404, "not_found");
  if (!["PRICING", "REVISION_REQUESTED", "QUOTE_SENT"].includes(request.status)) throw new HttpError(409, "not_in_pricing");

  const unit = new Prisma.Decimal(body.unitPrice);
  const subtotal = unit.mul(body.quantity).toDecimalPlaces(2);
  const total = subtotal.mul(new Prisma.Decimal(1).add(new Prisma.Decimal(body.taxPercent).div(100))).toDecimalPlaces(2);

  const offer = await db.$transaction(async (tx) => {
    const o = await tx.quotationOffer.create({
      data: {
        requestId: id,
        currency: body.currency,
        unitPrice: unit,
        quantity: body.quantity,
        subtotal,
        taxPercent: new Prisma.Decimal(body.taxPercent),
        total,
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
    await audit({ actorId: user.id, action: body.send ? "offer.send" : "offer.create", entity: "quotation_offer", entityId: o.id, meta: { requestId: id, total: total.toString() }, ip: clientIp(req) }, tx);
    return o;
  });

  if (body.send) await notifyCustomerStatus(request, "QUOTE_SENT", request.customer.locale === "en" ? "en" : "ar");
  return ok({ offer: { id: offer.id } }, 201);
});
