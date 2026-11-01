import { createHash } from "node:crypto";
import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { hashPassword, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password-policy";
import { isStaff } from "@/lib/rbac";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(200) });

/** Sets a new password from a one-time link and signs out every session. Two-step verification stays as it was. */
export const POST = api(
  async (req) => {
    const { token, password } = await parseJson(req, schema);
    const row = await db.passwordReset.findUnique({
      where: { tokenHash: createHash("sha256").update(token).digest("hex") },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });
    if (!row || row.usedAt || row.expiresAt <= new Date() || !row.user.isActive) throw new HttpError(400, "invalid_token");
    const weak = passwordProblem(password, { email: row.user.email, minLength: isStaff(row.user.role) ? 10 : 8 });
    if (weak) throw new HttpError(422, weak);
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      // claimed atomically, so one link cannot be used twice even by two requests at once
      const claimed = await tx.passwordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!claimed.count) throw new HttpError(400, "invalid_token");
      await tx.user.update({ where: { id: row.user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: row.user.id } });
      await audit({ actorId: row.user.id, action: "auth.password_reset", entity: "user", entityId: row.user.id, ip: clientIp(req) }, tx);
    });
    return ok({ ok: true });
  },
  { rate: { key: "reset", limit: 10, windowMs: 15 * 60 * 1000 } },
);
