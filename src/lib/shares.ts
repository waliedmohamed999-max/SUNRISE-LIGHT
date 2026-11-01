import "server-only";
import { db } from "./db";
import { storage } from "./storage";

/** How long a 3D link stays open; refreshing it from the studio starts the period again. */
export const SHARE_DAYS = 10;
export const shareExpiry = () => new Date(Date.now() + SHARE_DAYS * 24 * 60 * 60 * 1000);

/** A shared design's link, or null once it is revoked or expired, its design deleted, or the token malformed. */
export async function activeShare(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  return db.designShare.findFirst({ where: { token, revokedAt: null, expiresAt: { gt: new Date() }, project: { deletedAt: null } } });
}

/** True when this address was a real link whose 10 days are over (a stopped link stays simply "not found"). */
export async function isExpiredShare(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return false;
  return (await db.designShare.count({ where: { token, revokedAt: null, expiresAt: { lte: new Date() }, project: { deletedAt: null } } })) > 0;
}

/** Deletes the images of links whose time is over; the row stays so the address can still say it has expired. */
export async function purgeExpiredShares(batch = 100) {
  const rows = await db.designShare.findMany({ where: { expiresAt: { lte: new Date() }, NOT: { surfaces: { equals: {} } } }, take: batch, select: { id: true, surfaces: true } });
  for (const row of rows) {
    await Promise.all(Object.values(row.surfaces as Record<string, string>).map((key) => storage.remove(key).catch(() => undefined)));
    await db.designShare.update({ where: { id: row.id }, data: { surfaces: {} } });
  }
  return rows.length;
}

/** Spent and expired password links serve no purpose; their rows are removed with the same hourly sweep. */
export const purgeOldResets = () => db.passwordReset.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, { usedAt: { not: null } }] } });
