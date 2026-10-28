import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession, hashPassword, HttpError, requireUser, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { passwordProblem } from "@/lib/password-policy";
import { isStaff } from "@/lib/rbac";

const schema = z.object({ current: z.string().min(1).max(200), next: z.string().min(8).max(200) });

/** Change own password. Every other session is signed out; this browser gets a fresh session. */
export const POST = api(
  async (req) => {
    const user = await requireUser();
    const { current, next } = await parseJson(req, schema);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(current, row.passwordHash))) throw new HttpError(400, "wrong_password");
    if (current === next) throw new HttpError(400, "same_password");
    const weak = passwordProblem(next, { email: user.email, minLength: isStaff(user.role) ? 10 : 8 });
    if (weak) throw new HttpError(422, weak);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await audit({ actorId: user.id, action: "auth.password_change", entity: "user", entityId: user.id, ip: clientIp(req) }, tx);
    });
    await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
    return ok({ ok: true });
  },
  { rate: { key: "password", limit: 10, windowMs: 15 * 60 * 1000 } },
);
