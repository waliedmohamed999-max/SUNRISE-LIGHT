import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const schema = z.object({ body: z.string().trim().min(1).max(4000), internal: z.boolean() });

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requirePermission("rfq.update");
  const body = await parseJson(req, schema);
  const request = await db.quotationRequest.findUnique({ where: { id }, include: { customer: { select: { locale: true } } } });
  if (!request) throw new HttpError(404, "not_found");
  await db.quotationNote.create({ data: { requestId: id, authorId: user.id, body: body.body, internal: body.internal } });
  await audit({ actorId: user.id, action: body.internal ? "rfq.note_internal" : "rfq.feedback", entity: "quotation_request", entityId: id, ip: clientIp(req) });
  if (!body.internal) {
    const ar = request.customer.locale !== "en";
    await notify({
      type: "rfq.feedback",
      title: ar ? `ملاحظة فنية على طلب ${request.rfqNumber}` : `Technical feedback on ${request.rfqNumber}`,
      body: body.body.slice(0, 500),
      link: `/${ar ? "ar" : "en"}/account/quotes/${id}`,
      userIds: [request.customerId],
      emails: [request.email],
    });
  }
  return ok({ ok: true }, 201);
});
