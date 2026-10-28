import { z } from "zod";
import bcrypt from "bcryptjs";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession, HttpError, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/rbac";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

// Unknown emails still pay the bcrypt cost, so response timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("unused-dummy-password", 12);

export const POST = api(
  async (req) => {
    const { email, password } = await parseJson(req, schema);
    const user = await db.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid || !user.isActive) {
      await audit({ action: "auth.login_failed", entity: "user", entityId: user?.id, meta: { email }, ip: clientIp(req) });
      throw new HttpError(401, "invalid_credentials");
    }
    await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
    await audit({ actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, ip: clientIp(req) });
    return ok({ user: { id: user.id, name: user.name, isStaff: isStaff(user.role) } });
  },
  { rate: { key: "login", limit: 10, windowMs: 15 * 60 * 1000 } },
);
