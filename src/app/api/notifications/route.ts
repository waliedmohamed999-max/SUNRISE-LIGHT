import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Mark all of the current user's in-app notifications as read. */
export const POST = api(async () => {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return ok({ ok: true });
});
