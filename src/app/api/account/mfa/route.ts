import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession, HttpError, requireUser, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateTotpSecret, mfaAvailable, openSecret, otpauthUri, sealSecret, verifyTotp } from "@/lib/totp";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("enable"), code: z.string().trim().max(10) }),
  z.object({ action: z.literal("disable"), password: z.string().min(1).max(200), code: z.string().trim().max(10) }),
]);

/** Two-step verification for the signed-in user: setup → enable (confirm a code) → disable (password + code). */
export const POST = api(
  async (req) => {
    const user = await requireUser();
    const body = await parseJson(req, schema);
    if (!mfaAvailable()) throw new HttpError(503, "mfa_not_configured");
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, passwordHash: true, totpSecret: true, totpEnabledAt: true, totpLastStep: true } });

    if (body.action === "setup") {
      if (row.totpEnabledAt) throw new HttpError(409, "mfa_already_enabled");
      const secret = generateTotpSecret();
      await db.user.update({ where: { id: user.id }, data: { totpSecret: sealSecret(secret), totpLastStep: null } });
      return ok({ secret, uri: otpauthUri(secret, row.email) });
    }

    if (!row.totpSecret) throw new HttpError(409, "mfa_not_set_up");
    const step = verifyTotp(openSecret(row.totpSecret), body.code, row.totpLastStep);

    if (body.action === "enable") {
      if (row.totpEnabledAt) throw new HttpError(409, "mfa_already_enabled");
      if (step === null) throw new HttpError(400, "mfa_invalid");
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date(), totpLastStep: step } });
        // a newly protected account starts clean: every other session is signed out
        await tx.session.deleteMany({ where: { userId: user.id } });
        await audit({ actorId: user.id, action: "auth.mfa_enabled", entity: "user", entityId: user.id, ip: clientIp(req) }, tx);
      });
      await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
      return ok({ ok: true });
    }

    // disable
    if (!row.totpEnabledAt) throw new HttpError(409, "mfa_not_enabled");
    if (!(await verifyPassword(body.password, row.passwordHash))) throw new HttpError(400, "wrong_password");
    if (step === null) throw new HttpError(400, "mfa_invalid");
    await db.user.update({ where: { id: user.id }, data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null } });
    await audit({ actorId: user.id, action: "auth.mfa_disabled", entity: "user", entityId: user.id, ip: clientIp(req) });
    return ok({ ok: true });
  },
  { rate: { key: "mfa", limit: 20, windowMs: 15 * 60 * 1000 } },
);
