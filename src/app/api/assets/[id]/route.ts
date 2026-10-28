import { api } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { storage } from "@/lib/storage";

/** Private asset delivery: owner, or staff with quotation access. Never public. */
export const GET = api<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const asset = await db.uploadedAsset.findUnique({ where: { id } });
  if (!asset || (asset.ownerId !== user.id && !can(user.role, "rfq.view"))) throw new HttpError(404, "not_found");
  const data = await storage.get(asset.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(data.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
      "Content-Disposition": `inline; filename="${asset.id}"`,
    },
  });
});
