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
  if (body.action === "approve") {
    // only the latest quotation actually sent can be approved, and only while it is valid
    const offer = await db.quotationOffer.findFirst({ where: { requestId: id, sentAt: { not: null } }, orderBy: { sentAt: "desc" }, select: { validUntil: true } });
    if (!offer) throw new HttpError(409, "no_offer");
    const endOfValidity = offer.validUntil ? new Date(offer.validUntil.getTime() + 864e5) : null;
    if (endOfValidity && endOfValidity < new Date()) throw new HttpError(409, "offer_expired");
  }

  await db.$transaction(async (tx) => {
    await transition(tx, { requestId: id, from: request.status, to, allowed: CUSTOMER_TRANSITIONS, actorId: user.id, note: body.message });
    if (body.message) await tx.quotationNote.create({ data: { requestId: id, authorId: user.id, body: body.message, internal: false } });
    await audit({ actorId: user.id, action: `rfq.customer_${body.action}`, entity: "quotation_request", entityId: id, ip: clientIp(req) }, tx);
  });

  await notify({
    type: "rfq.customer_action",
    title: `${request.rfqNumber}: ${to}`,
    body: body.message ?? "",
    link: `/ar/admin/quotes/${id}`,
    userIds: [...new Set([...(request.assignedToId ? [request.assignedToId] : []), ...(await staffRecipients(["FACTORY_MANAGER", "SALES"]))])],
  });
  return ok({ ok: true, status: to });
});
