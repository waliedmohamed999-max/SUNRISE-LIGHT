import Link from "next/link";
import type { QuotationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Card, EmptyState } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";

export default async function AdminOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const canQuotes = can(user.role, "rfq.view");

  const [grouped, recent, activity, mine] = await Promise.all([
    db.quotationRequest.groupBy({ by: ["status"], _count: true }),
    canQuotes ? db.quotationRequest.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, rfqNumber: true, contactName: true, companyName: true, status: true, createdAt: true } }) : [],
    can(user.role, "user.manage") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } }) : [],
    db.quotationRequest.count({ where: { assignedToId: user.id, status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] } } }),
  ]);
  const count = (s: QuotationStatus) => grouped.find((g) => g.status === s)?._count ?? 0;
  const tiles: [string, number, QuotationStatus | null][] = [
    [t.admin.newRequests, count("NEW"), "NEW"],
    [t.admin.pendingReview, count("TECHNICAL_REVIEW"), "TECHNICAL_REVIEW"],
    [t.admin.inPricing, count("PRICING") + count("REVISION_REQUESTED"), "PRICING"],
    [t.admin.sent, count("QUOTE_SENT"), "QUOTE_SENT"],
    [t.admin.approved, count("APPROVED"), "APPROVED"],
    [locale === "ar" ? "مسندة إليّ" : "Assigned to me", mine, null],
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-navy">{t.admin.overview}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {tiles.map(([label, n, status]) => (
          <Link
            key={label}
            href={`/${locale}/admin/quotes${status ? `?status=${status}` : "?mine=1"}`}
            className="rounded-[var(--radius-card)] border border-navy/8 bg-white p-5 transition hover:shadow-[var(--shadow-card)]"
          >
            <p className="text-xs font-medium text-ink-500">{label}</p>
            <p className="num mt-2 text-3xl font-bold text-navy">{n}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {canQuotes && (
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy">{t.admin.quotes}</h2>
            {recent.length === 0 ? (
              <EmptyState title={t.admin.noResults} />
            ) : (
              <ul className="divide-y divide-navy/8">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/${locale}/admin/quotes/${r.id}`} className="flex items-center gap-3 py-3 hover:text-sun-600">
                      <span className="num w-40 shrink-0 text-sm font-semibold text-navy">{r.rfqNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-500">{r.companyName || r.contactName}</span>
                      <StatusBadge status={r.status} locale={locale} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {activity.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy">{t.admin.recentActivity}</h2>
            <ul className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-4">
                  <span>
                    <span className="font-medium text-navy">{a.actor?.name ?? "—"}</span> <code className="text-xs text-ink-500">{a.action}</code>
                  </span>
                  <span className="num shrink-0 text-xs text-ink-500">{fmtDate(a.createdAt, locale, true)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
