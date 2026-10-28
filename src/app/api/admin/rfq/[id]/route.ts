import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { can, isStaff, STAFF_TRANSITIONS } from "@/lib/rbac";
import { notifyCustomerStatus, transition } from "@/lib/quotes";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["NEW", "TECHNICAL_REVIEW", "PRICING", "QUOTE_SENT", "REVISION_REQUESTED", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  note: z.string().trim().max(2000).optional(),
  /** null = unassign */
  assignedToId: z.string().max(40).nullable().optional(),
});

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("rfq.update");
  const body = await parseJson(req, schema);
  const request = await db.quotationRequest.findUnique({ where: { id }, include: { customer: { select: { locale: true } } } });
  if (!request) throw new HttpError(404, "not_found");

  if (body.assignedToId !== undefined) {
    if (!can(user.role, "rfq.assign")) throw new HttpError(403, "forbidden");
    if (body.assignedToId) {
      const assignee = await db.user.findUnique({ where: { id: body.assignedToId } });
      if (!assignee || !assignee.isActive || !isStaff(assignee.role)) throw new HttpError(422, "assignee_invalid");
    }
  }
  if (body.status === "QUOTE_SENT") throw new HttpError(409, "use_offer_endpoint");

  await db.$transaction(async (tx) => {
    if (body.status && body.status !== request.status) {
      await transition(tx, { requestId: id, from: request.status, to: body.status, allowed: STAFF_TRANSITIONS, actorId: user.id, note: body.note });
    }
    if (body.assignedToId !== undefined) {
      await tx.quotationRequest.update({ where: { id }, data: { assignedToId: body.assignedToId } });
    }
    await audit({ actorId: user.id, action: "rfq.update", entity: "quotation_request", entityId: id, meta: { status: body.status ?? null, assignedToId: body.assignedToId ?? null }, ip: clientIp(req) }, tx);
  });

  if (body.status && body.status !== request.status) {
    await notifyCustomerStatus(request, body.status, request.customer.locale === "en" ? "en" : "ar");
  }
  if (body.assignedToId && body.assignedToId !== user.id) {
    await notify({ type: "rfq.assigned", title: `${request.rfqNumber}`, body: "Assigned to you / أُسند إليك", link: `/ar/admin/quotes/${id}`, userIds: [body.assignedToId] });
  }
  return ok({ ok: true });
});
