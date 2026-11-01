import "server-only";
import { db } from "./db";

/** How long a 3D link stays open; refreshing it from the studio starts the period again. */
export const SHARE_DAYS = 10;
export const shareExpiry = () => new Date(Date.now() + SHARE_DAYS * 24 * 60 * 60 * 1000);

/** A shared design's link, or null once it is revoked or expired, its design deleted, or the token malformed. */
export async function activeShare(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  return db.designShare.findFirst({ where: { token, revokedAt: null, expiresAt: { gt: new Date() }, project: { deletedAt: null } } });
}
