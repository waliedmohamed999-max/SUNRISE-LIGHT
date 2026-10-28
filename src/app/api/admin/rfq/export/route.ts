import { api, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rfqWhere, toCsv } from "@/lib/admin-filters";

const MAX_ROWS = 5000;

/** Quotation requests as CSV, honouring the same filters as the admin list. */
export const GET = api(async (req) => {
  const user = await requirePermission("rfq.view");
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { where } = rfqWhere(sp, user.id);
  const rows = await db.quotationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: {
      assignedTo: { select: { name: true } },
      items: { select: { quantity: true, specSnapshot: true, material: { select: { nameEn: true } } } },
      offers: { where: { sentAt: { not: null } }, orderBy: { sentAt: "desc" }, take: 1, select: { total: true, currency: true } },
    },
  });
  const csv = toCsv([
    ["RFQ", "Created", "Status", "Contact", "Company", "Email", "Phone", "City", "Product", "Dimensions (mm)", "Material", "Quantity", "Assignee", "Last offer total", "Currency"],
    ...rows.map((r) => {
      const snap = r.items[0]?.specSnapshot as { template?: { nameEn: string }; dimensionsMm?: { length: number; width: number; height: number } } | undefined;
      const d = snap?.dimensionsMm;
      return [
        r.rfqNumber,
        r.createdAt.toISOString().slice(0, 16).replace("T", " "),
        r.status,
        r.contactName,
        r.companyName,
        r.email,
        r.phone,
        r.deliveryCity,
        snap?.template?.nameEn,
        d ? `${d.length}x${d.width}x${d.height}` : "",
        r.items[0]?.material?.nameEn,
        r.items.reduce((n, i) => n + i.quantity, 0),
        r.assignedTo?.name,
        r.offers[0]?.total?.toString(),
        r.offers[0]?.currency,
      ];
    }),
  ]);
  await audit({ actorId: user.id, action: "rfq.export", entity: "quotation_request", meta: { rows: rows.length }, ip: clientIp(req) });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sunrise-rfq-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
