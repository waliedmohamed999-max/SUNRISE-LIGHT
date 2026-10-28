import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rfqWhere, RFQ_STATUSES } from "@/lib/admin-filters";
import { getCurrentUser } from "@/lib/auth";
import { can, STAFF_ROLES } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass, DownloadIcon, EmptyState, inputClass } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";

const STATUSES = RFQ_STATUSES;

export default async function AdminQuotes({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string; status?: string; assignee?: string; mine?: string; page?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "rfq.view")) notFound();
  const t = getDict(locale);

  const { where, status, q } = rfqWhere(sp, user.id);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const PAGE = 30;
  const [rows, total, staff] = await Promise.all([
    db.quotationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { assignedTo: { select: { name: true } }, items: { select: { quantity: true, specSnapshot: true } } },
    }),
    db.quotationRequest.count({ where }),
    db.user.findMany({ where: { role: { in: STAFF_ROLES }, isActive: true }, select: { id: true, name: true } }),
  ]);
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `?${u}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.admin.quotes}</h1>
          <p className="num mt-1 text-xs text-ink-500">
            {total} {locale === "ar" ? "طلب" : "requests"}
          </p>
        </div>
        <a href={`/api/admin/rfq/export?${new URLSearchParams(Object.entries({ q: sp.q, status: sp.status, assignee: sp.assignee, mine: sp.mine }).filter(([, v]) => v) as [string, string][])}`} className={buttonClass("outline", "sm")}>
          <DownloadIcon className="size-4" /> {locale === "ar" ? "تصدير CSV" : "Export CSV"}
        </a>
      </div>
      <form className="grid gap-2 rounded-[var(--radius-card)] border border-navy/8 bg-white p-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] md:items-center">
        <input name="q" defaultValue={q} placeholder={`${t.common.search}: RFQ, ${t.admin.customer}, email…`} className={inputClass} />
        <select name="status" defaultValue={status ?? ""} className={inputClass}>
          <option value="">{t.common.all}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.status[s]}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={sp.assignee ?? ""} className={inputClass}>
          <option value="">{t.admin.assignee}: {t.common.all}</option>
          <option value="none">{t.admin.unassigned}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className={buttonClass("primary", "md")}>{t.common.filter}</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={t.admin.noResults} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-navy/8 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-paper text-xs text-ink-500">
              <tr className="text-start">
                {[t.account.rfqNumber, t.admin.customer, t.quote.packagingType, t.studio.quantity, t.admin.assignee, t.account.submittedAt, t.account.status].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/8">
              {rows.map((r) => {
                const snap = r.items[0]?.specSnapshot as { template?: { nameAr: string; nameEn: string }; dimensionsMm?: { length: number; width: number; height: number } } | undefined;
                return (
                  <tr key={r.id} className="hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/admin/quotes/${r.id}`} className="num font-semibold text-navy hover:text-sun-600">
                        {r.rfqNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-navy">{r.companyName || r.contactName}</span>
                      <span className="block text-xs text-ink-500">{r.deliveryCity}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {snap?.template ? (locale === "ar" ? snap.template.nameAr : snap.template.nameEn) : "—"}
                      {snap?.dimensionsMm && <span className="num block text-xs">{`${snap.dimensionsMm.length}×${snap.dimensionsMm.width}×${snap.dimensionsMm.height}`}</span>}
                    </td>
                    <td className="num px-4 py-3">{r.items.reduce((n, i) => n + i.quantity, 0).toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-ink-500">{r.assignedTo?.name ?? t.admin.unassigned}</td>
                    <td className="num px-4 py-3 text-ink-500">{fmtDate(r.createdAt, locale)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} locale={locale} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {total > PAGE && (
        <div className="flex justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className={buttonClass("outline", "sm")}>{t.common.back}</Link> : <span />}
          <span className="num text-ink-500">
            {page} / {Math.ceil(total / PAGE)}
          </span>
          {page * PAGE < total ? <Link href={qs(page + 1)} className={buttonClass("outline", "sm")}>{t.common.next}</Link> : <span />}
        </div>
      )}
    </div>
  );
}
