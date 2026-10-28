"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const ROLES: Role[] = ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES", "TECH_REVIEWER"];

export function UsersManager({ users, currentUserId }: { users: { id: string; name: string; email: string; role: Role; isActive: boolean; mfa: boolean }[]; currentUserId: string }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const [reset, setReset] = useState<{ id: string; name: string; password: string; done?: boolean } | null>(null);
  // 14 characters from an unambiguous alphabet, generated in the browser
  const generate = () => {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    return Array.from(crypto.getRandomValues(new Uint32Array(14)), (n) => abc[n % abc.length]).join("");
  };
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SALES" as Role });

  const call = async (method: string, body: unknown) => {
    setError(null);
    const res = await fetch("/api/admin/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setError(`${t.common.error} (${j.error ?? res.status})`);
    else router.refresh();
    return res.ok;
  };

  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}
      {reset && (
        <Card className="border-sun/40 p-5">
          <p className="text-sm font-semibold text-navy">
            {ar ? "كلمة مرور جديدة لـ" : "New password for"} {reset.name}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code dir="ltr" className="rounded-lg bg-paper px-3 py-2 text-base font-semibold tracking-wider text-navy select-all">
              {reset.password}
            </code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(reset.password)}>
              {ar ? "نسخ" : "Copy"}
            </Button>
            {!reset.done && (
              <>
                <Button size="sm" onClick={async () => (await call("PATCH", { id: reset.id, password: reset.password })) && setReset({ ...reset, done: true })}>
                  {ar ? "تأكيد التعيين" : "Confirm reset"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReset(null)}>
                  {t.common.cancel}
                </Button>
              </>
            )}
          </div>
          <p className={`mt-2 text-xs ${reset.done ? "text-ok" : "text-ink-500"}`}>
            {reset.done
              ? ar ? "تم التعيين وسُجّل خروج المستخدم من كل الأجهزة. سلّمه كلمة المرور بطريقة آمنة واطلب منه تغييرها من صفحة حسابه." : "Done — the user was signed out everywhere. Share the password securely and ask them to change it from their profile."
              : ar ? "لن تظهر كلمة المرور مرة أخرى بعد إغلاق هذه النافذة." : "The password is not shown again after this panel is closed."}
          </p>
          {reset.done && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setReset(null)}>
              {ar ? "تم" : "Done"}
            </Button>
          )}
        </Card>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-paper text-xs text-ink-500">
            <tr>
              {[t.auth.name, t.auth.email, t.admin.role, t.admin.active, ar ? "التحقق بخطوتين" : "Two-step", ar ? "كلمة المرور" : "Password"].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/8">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-navy">{u.name}</td>
                <td className="num px-4 py-3 text-ink-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select className={`${inputClass} py-1.5`} value={u.role} disabled={u.id === currentUserId} onChange={(e) => call("PATCH", { id: u.id, role: e.target.value })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t.roles[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={t.admin.active} checked={u.isActive} disabled={u.id === currentUserId} onChange={() => call("PATCH", { id: u.id, isActive: !u.isActive })} />
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.mfa ? (
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-ok">{ar ? "مفعّل" : "On"}</span>
                      {u.id !== currentUserId && (
                        <button type="button" onClick={() => window.confirm(ar ? `إعادة ضبط التحقق بخطوتين لـ ${u.name}؟ سيُسجّل خروجه ويحتاج لإعداده من جديد.` : `Reset two-step verification for ${u.name}? They will be signed out and must set it up again.`) && call("PATCH", { id: u.id, resetMfa: true })} className="text-navy underline-offset-4 hover:underline">
                          {ar ? "إعادة ضبط" : "Reset"}
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="font-semibold text-warn">{ar ? "غير مفعّل" : "Off"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.id === currentUserId ? (
                    <a href={`/${locale}/account/profile`} className="text-xs font-medium text-sun hover:underline">
                      {ar ? "من صفحة حسابي" : "From my profile"}
                    </a>
                  ) : (
                    <button type="button" onClick={() => setReset({ id: u.id, name: u.name, password: generate() })} className="text-xs font-medium text-navy underline-offset-4 hover:underline">
                      {ar ? "إعادة تعيين" : "Reset"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-semibold text-navy">{t.admin.addUser}</h2>
        <form
          className="grid gap-3 sm:grid-cols-5 sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("POST", form)) setForm({ name: "", email: "", password: "", role: "SALES" });
          }}
        >
          <Field label={t.auth.name}>
            <input required minLength={2} className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t.auth.email}>
            <input required type="email" dir="ltr" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t.auth.password}>
            <input required minLength={10} type="password" dir="ltr" autoComplete="new-password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label={t.admin.role}>
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit">{t.admin.addUser}</Button>
        </form>
      </Card>
    </div>
  );
}
