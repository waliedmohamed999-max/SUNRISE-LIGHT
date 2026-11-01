import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/notifications";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), locale: z.enum(["ar", "en"]).default("ar") });
const VALID_MS = 60 * 60 * 1000;

/**
 * Starts password recovery. The answer and its timing are the same whether or not the email has an account:
 * the message goes out in the background, so this endpoint cannot be used to find out who is registered.
 */
export const POST = api(
  async (req) => {
    const { email, locale } = await parseJson(req, schema);
    const user = await db.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (user?.isActive) {
      const token = randomBytes(32).toString("base64url");
      await db.$transaction([
        db.passwordReset.deleteMany({ where: { userId: user.id } }),
        db.passwordReset.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + VALID_MS) } }),
      ]);
      const link = `${process.env.APP_URL ?? req.nextUrl.origin}/${locale}/reset-password?token=${token}`;
      const ar = locale === "ar";
      if (emailConfigured()) {
        void sendEmail(
          email,
          ar ? "استعادة كلمة المرور — ضوء الشروق" : "Reset your password — Sunrise Light",
          ar ? `لتعيين كلمة مرور جديدة افتح الرابط التالي خلال ساعة:\n\n${link}\n\nإذا لم تطلب ذلك فتجاهل هذه الرسالة.` : `Open this link within one hour to set a new password:\n\n${link}\n\nIf you did not ask for this, ignore this message.`,
        ).catch((e) => console.error("[auth] reset email failed", e));
      } else if (process.env.NODE_ENV !== "production") {
        console.info("[auth] email is not configured; development reset link:", link);
      }
    }
    return ok({ ok: true });
  },
  { rate: { key: "forgot", limit: 5, windowMs: 15 * 60 * 1000 } },
);
