"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Field, inputClass, Spinner } from "@/components/ui";

/** Change own password (current + new, confirmed). */
export function PasswordForm() {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; error?: string }>({ busy: false });
  const mismatch = f.confirm.length > 0 && f.next !== f.confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setState({ busy: true });
    const res = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: f.current, next: f.next }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        j.error === "wrong_password"
          ? ar ? "كلمة المرور الحالية غير صحيحة" : "The current password is incorrect"
          : j.error === "same_password"
            ? ar ? "اختر كلمة مرور مختلفة عن الحالية" : "Choose a password different from the current one"
            : j.error === "rate_limited"
              ? ar ? "محاولات كثيرة، حاول لاحقًا." : "Too many attempts, try again later."
              : t.common.error;
      return setState({ busy: false, error: msg });
    }
    setF({ current: "", next: "", confirm: "" });
    setState({ busy: false, ok: true });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3 sm:items-start">
      <Field label={ar ? "كلمة المرور الحالية" : "Current password"}>
        <input type="password" required dir="ltr" autoComplete="current-password" className={inputClass} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
      </Field>
      <Field label={ar ? "كلمة المرور الجديدة" : "New password"} hint={t.auth.passwordHint}>
        <input type="password" required minLength={8} dir="ltr" autoComplete="new-password" className={inputClass} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
      </Field>
      <Field label={ar ? "تأكيد كلمة المرور" : "Confirm password"} hint={mismatch ? (ar ? "غير متطابقة" : "Does not match") : undefined}>
        <input type="password" required minLength={8} dir="ltr" autoComplete="new-password" aria-invalid={mismatch} className={inputClass} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={state.busy || mismatch}>
          {state.busy && <Spinner />}
          {ar ? "تغيير كلمة المرور" : "Change password"}
        </Button>
        {state.ok && <span className="text-sm text-ok">{ar ? "تم التغيير. سُجّل الخروج من الأجهزة الأخرى." : "Changed. Other devices were signed out."}</span>}
        {state.error && <Alert tone="danger">{state.error}</Alert>}
      </div>
    </form>
  );
}
