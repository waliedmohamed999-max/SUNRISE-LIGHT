"use client";

import Link from "next/link";
import { useState } from "react";
import { PASSWORD_MESSAGES } from "@/lib/password-policy";
import { Alert, Button, Field, inputClass, Spinner } from "@/components/ui";

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, error: ((await res.json().catch(() => ({}))) as { error?: string }).error };
}

const failure = (error: string | undefined, ar: boolean) =>
  error === "rate_limited" ? (ar ? "محاولات كثيرة، حاول لاحقاً." : "Too many attempts, try again later.") : ar ? "حدث خطأ، حاول مرة أخرى." : "Something went wrong, try again.";

export function ForgotForm({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (sent) return <Alert tone="ok">{ar ? "إذا كان البريد مسجلًا لدينا فستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة خلال دقائق." : "If this email is registered, a link to set a new password will arrive within minutes."}</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const r = await post("/api/auth/forgot", { email: new FormData(e.currentTarget).get("email"), locale }).catch(() => ({ ok: false, error: undefined }));
        setPending(false);
        if (r.ok) setSent(true);
        else setError(failure(r.error, ar));
      }}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label={ar ? "البريد الإلكتروني" : "Email"}>
        <input name="email" type="email" required dir="ltr" autoComplete="email" className={inputClass} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : ar ? "إرسال رابط الاستعادة" : "Send the link"}
      </Button>
    </form>
  );
}

export function ResetForm({ locale, token }: { locale: "ar" | "en"; token: string }) {
  const ar = locale === "ar";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (done)
    return (
      <div className="space-y-4">
        <Alert tone="ok">{ar ? "تم تغيير كلمة المرور. سجّل دخولك بالكلمة الجديدة." : "Your password was changed. Sign in with the new one."}</Alert>
        <Link href={`/${locale}/login`} className="block text-center text-sm font-semibold text-sun">
          {ar ? "تسجيل الدخول" : "Sign in"}
        </Link>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (fd.get("password") !== fd.get("again")) return setError(ar ? "كلمتا المرور غير متطابقتين." : "The passwords do not match.");
        setPending(true);
        setError(null);
        const r = await post("/api/auth/reset", { token, password: fd.get("password") }).catch(() => ({ ok: false, error: undefined }));
        setPending(false);
        if (r.ok) return setDone(true);
        setError(r.error && PASSWORD_MESSAGES[r.error] ? PASSWORD_MESSAGES[r.error][locale] : r.error === "invalid_token" ? (ar ? "الرابط غير صالح أو انتهت مدته. اطلب رابطًا جديدًا." : "This link is invalid or has expired. Ask for a new one.") : failure(r.error, ar));
      }}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label={ar ? "كلمة المرور الجديدة" : "New password"}>
        <input name="password" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label={ar ? "أعد كتابتها" : "Repeat it"}>
        <input name="again" type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={inputClass} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : ar ? "حفظ كلمة المرور" : "Save password"}
      </Button>
    </form>
  );
}
