import { api, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/admin-filters";

/** Customer list as CSV (contact details, company, activity counts). */
export const GET = api(async (req) => {
  const user = await requirePermission("customer.view");
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const rows = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { profile: { company: { name: { contains: q, mode: "insensitive" } } } }] }),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { profile: { include: { company: true } }, _count: { select: { designs: { where: { deletedAt: null } }, quotationRequests: true } } },
  });
  const csv = toCsv([
    ["Name", "Email", "Phone", "Company", "VAT number", "City", "Registered", "Active", "Designs", "Quotation requests"],
    ...rows.map((u) => [
      u.name,
      u.email,
      u.phone,
      u.profile?.company?.name,
      u.profile?.company?.vatNumber,
      u.profile?.city,
      u.createdAt.toISOString().slice(0, 10),
      u.isActive ? "yes" : "no",
      u._count.designs,
      u._count.quotationRequests,
    ]),
  ]);
  await audit({ actorId: user.id, action: "customer.export", entity: "user", meta: { rows: rows.length }, ip: clientIp(req) });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sunrise-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
