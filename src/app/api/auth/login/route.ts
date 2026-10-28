import { z } from "zod";
import bcrypt from "bcryptjs";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession, HttpError, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { openSecret, verifyTotp } from "@/lib/totp";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  /** 6-digit code from the authenticator app, when two-step verification is enabled */
  code: z.string().trim().max(10).optional(),
});

// Unknown emails still pay the bcrypt cost, so response timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("unused-dummy-password", 12);

export const POST = api(
  async (req) => {
    const { email, password, code } = await parseJson(req, schema);
    // per-account limit on top of the per-IP limit: slows distributed guessing against one account
    if (!rateLimit(`login-account:${email}`, 20, 15 * 60 * 1000)) throw new HttpError(429, "rate_limited");
    const user = await db.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid || !user.isActive) {
      await audit({ action: "auth.login_failed", entity: "user", entityId: user?.id, meta: { email }, ip: clientIp(req) });
      throw new HttpError(401, "invalid_credentials");
    }

    // two-step verification: only asked for after the password is proven, so it reveals nothing to guessers
    if (user.totpEnabledAt && user.totpSecret) {
      if (!code) throw new HttpError(401, "mfa_required");
      let step: number | null = null;
      try {
        step = verifyTotp(openSecret(user.totpSecret), code, user.totpLastStep);
      } catch {
        throw new HttpError(503, "mfa_unavailable");
      }
      if (step === null) {
        await audit({ actorId: user.id, action: "auth.mfa_failed", entity: "user", entityId: user.id, ip: clientIp(req) });
        throw new HttpError(401, "mfa_invalid");
      }
      // consume the step atomically so the same code cannot be used twice
      const used = await db.user.updateMany({ where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] }, data: { totpLastStep: step } });
      if (used.count !== 1) throw new HttpError(401, "mfa_invalid");
    }

    await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
    await audit({ actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, meta: { mfa: !!user.totpEnabledAt }, ip: clientIp(req) });
    return ok({ user: { id: user.id, name: user.name, isStaff: isStaff(user.role) } });
  },
  { rate: { key: "login", limit: 10, windowMs: 15 * 60 * 1000 } },
);
