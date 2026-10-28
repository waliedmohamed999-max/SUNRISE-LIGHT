import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { can, isStaff, type Permission } from "./rbac";

import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 14;
/** Staff sessions are short-lived: they can change prices, customer data and settings. */
const STAFF_SESSION_HOURS = 12;

export type SessionUser = Pick<User, "id" | "email" | "name" | "phone" | "role" | "locale"> & { mfaEnabled: boolean };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const token = randomBytes(32).toString("base64url");
  const { role } = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  const expiresAt = new Date(Date.now() + (isStaff(role) ? STAFF_SESSION_HOURS * 36e5 : SESSION_DAYS * 864e5));
  // housekeeping: drop this user's expired sessions
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, phone: true, role: true, locale: true, isActive: true, totpEnabledAt: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { isActive: _active, totpEnabledAt, ...user } = session.user;
  return { ...user, mfaEnabled: !!totpEnabledAt };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "unauthenticated");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new HttpError(403, "forbidden");
  return user;
}

export const userIsStaff = (u: { role: Role } | null) => !!u && isStaff(u.role);
