"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Card, Field, inputClass } from "@/components/ui";

const ROLES: Role[] = ["SUPER_ADMIN", "FACTORY_MANAGER", "SALES", "TECH_REVIEWER"];

export function UsersManager({ users, currentUserId }: { users: { id: string; name: string; email: string; role: Role; isActive: boolean }[]; currentUserId: string }) {
  const { t } = useI18n();
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
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-paper text-xs text-ink-500">
            <tr>
              {[t.auth.name, t.auth.email, t.admin.role, t.admin.active].map((h) => (
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
