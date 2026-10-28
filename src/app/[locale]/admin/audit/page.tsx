import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { fmtDate } from "@/components/site/StatusBadge";

export default async function AdminAudit({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "user.manage")) notFound();
  const t = getDict(locale);
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { actor: { select: { name: true, email: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t.admin.audit}</h1>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-navy/8 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-paper text-xs text-ink-500">
            <tr>
              {["Time", "Actor", "Action", "Entity", "IP", "Meta"].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/8" dir="ltr">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="num px-4 py-2 text-xs whitespace-nowrap text-ink-500">{fmtDate(l.createdAt, locale, true)}</td>
                <td className="px-4 py-2">{l.actor?.email ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-2 font-mono text-xs text-ink-500">
                  {l.entity}
                  {l.entityId ? `:${l.entityId.slice(-8)}` : ""}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-ink-500">{l.ip ?? ""}</td>
                <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-ink-500">{JSON.stringify(l.meta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
