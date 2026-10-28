import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { EmptyState } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";
import { HandledToggle } from "@/components/admin/HandledToggle";

export default async function AdminMessages({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "customer.view")) notFound();
  const t = getDict(locale);
  const messages = await db.contactMessage.findMany({ orderBy: [{ handled: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t.admin.messages}</h1>
      {messages.length === 0 ? (
        <EmptyState title={t.admin.noResults} />
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-[var(--radius-card)] border bg-white p-5 ${m.handled ? "border-navy/8 opacity-70" : "border-sun/40"}`}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-navy">{m.name}</span>
                <a href={`mailto:${m.email}`} className="num text-ink-500">{m.email}</a>
                {m.phone && <a href={`tel:${m.phone}`} className="num text-ink-500" dir="ltr">{m.phone}</a>}
                <span className="num ms-auto text-xs text-ink-500">{fmtDate(m.createdAt, locale, true)}</span>
                <HandledToggle id={m.id} handled={m.handled} label={t.admin.handled} />
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-navy" dir="auto">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
