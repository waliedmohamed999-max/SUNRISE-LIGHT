import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { CUSTOMER_TRANSITIONS } from "@/lib/rbac";
import { transition } from "@/lib/quotes";
import { audit } from "@/lib/audit";
import { notify, staffRecipients } from "@/lib/notifications";

const schema = z.object({
  action: z.enum(["approve", "revision", "cancel"]),
  message: z.string().trim().max(2000).optional(),
  /** quantity option chosen on a multi-option quotation */
  option: z.number().int().min(0).max(3).optional(),
});

const TARGET = { approve: "APPROVED", revision: "REVISION_REQUESTED", cancel: "CANCELLED" } as const;

/** Customer actions on their own quotation request. */
export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const body = await parseJson(req, schema);
  const request = await db.quotationRequest.findFirst({ where: { id, customerId: user.id } });
  if (!request) throw new HttpError(404, "not_found");
  if (body.action === "revision" && !body.message) throw new HttpError(400, "message_required");
  const to = TARGET[body.action];
  let approved: { offerId: string; option: number; quantity: number | null } | null = null;
  if (body.action === "approve") {
    // only the latest quotation actually sent can be approved, and only while it is valid
    const offer = await db.quotationOffer.findFirst({ where: { requestId: id, sentAt: { not: null } }, orderBy: { sentAt: "desc" }, select: { id: true, validUntil: true, details: true } });
    if (!offer) throw new HttpError(409, "no_offer");
    const endOfValidity = offer.validUntil ? new Date(offer.validUntil.getTime() + 864e5) : null;
    if (endOfValidity && endOfValidity < new Date()) throw new HttpError(409, "offer_expired");
    const options = (offer.details as { computed?: unknown[] } | null)?.computed?.length ?? 1;
    if ((body.option ?? 0) >= options) throw new HttpError(400, "invalid_option");
    approved = { offerId: offer.id, option: body.option ?? 0, quantity: (offer.details as { computed?: { quantity: number }[] } | null)?.computed?.[body.option ?? 0]?.quantity ?? null };
  }

  await db.$transaction(async (tx) => {
    await transition(tx, { requestId: id, from: request.status, to, allowed: CUSTOMER_TRANSITIONS, actorId: user.id, note: body.message });
    if (approved) await tx.quotationOffer.update({ where: { id: approved.offerId }, data: { selectedOption: approved.option } });
    if (body.message) await tx.quotationNote.create({ data: { requestId: id, authorId: user.id, body: body.message, internal: false } });
    await audit(
      {
        actorId: user.id,
        action: `rfq.customer_${body.action}`,
        entity: "quotation_request",
        entityId: id,
        meta: approved ? { option: approved.option, quantity: approved.quantity } : undefined,
        ip: clientIp(req),
      },
      tx,
    );
  });

  await notify({
    type: "rfq.customer_action",
    title: `${request.rfqNumber}: ${to}`,
    body: approved?.quantity ? `${body.message ?? ""}${body.message ? " · " : ""}qty ${approved.quantity.toLocaleString("en")}` : (body.message ?? ""),
    link: `/ar/admin/quotes/${id}`,
    userIds: [...new Set([...(request.assignedToId ? [request.assignedToId] : []), ...(await staffRecipients(["FACTORY_MANAGER", "SALES"]))])],
  });
  return ok({ ok: true, status: to });
});
