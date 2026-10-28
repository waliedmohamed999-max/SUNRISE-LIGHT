import Link from "next/link";
import type { QuotationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, FINAL_STATUSES } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Card, EmptyState } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";
import { DailyBars, RankBars, StatTile } from "@/components/admin/charts";

const DAY = 86_400_000;
const PIPELINE: QuotationStatus[] = ["NEW", "TECHNICAL_REVIEW", "PRICING", "REVISION_REQUESTED", "QUOTE_SENT", "APPROVED", "REJECTED", "CANCELLED"];

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

export default async function AdminOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const canQuotes = can(user.role, "rfq.view");
  const canCustomers = can(user.role, "customer.view");
  const b = `/${locale}/admin`;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const since30 = new Date(now.getTime() - 29 * DAY);
  since30.setHours(0, 0, 0, 0);
  const since90 = new Date(now.getTime() - 90 * DAY);

  const [grouped, recent, activity, mine, last30, thisMonth, prevMonth, customers, newCustomers, designs, designsMonth, unhandled, firstMoves, items, cities, stale, unassigned, waitingCustomer, notValidated] = await Promise.all([
    db.quotationRequest.groupBy({ by: ["status"], _count: true }),
    canQuotes ? db.quotationRequest.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, rfqNumber: true, contactName: true, companyName: true, status: true, createdAt: true } }) : [],
    can(user.role, "user.manage") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }) : [],
    db.quotationRequest.count({ where: { assignedToId: user.id, status: { notIn: FINAL_STATUSES } } }),
    db.quotationRequest.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
    db.quotationRequest.count({ where: { createdAt: { gte: monthStart } } }),
    db.quotationRequest.count({ where: { createdAt: { gte: prevMonthStart, lt: monthStart } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
    db.designProject.count({ where: { deletedAt: null } }),
    db.designProject.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    canCustomers ? db.contactMessage.count({ where: { handled: false } }) : 0,
    // first staff action on each request (response time)
    db.quotationStatusHistory.findMany({
      where: { fromStatus: { not: null }, request: { createdAt: { gte: since90 } } },
      orderBy: { createdAt: "asc" },
      select: { requestId: true, createdAt: true, request: { select: { createdAt: true } } },
    }),
    db.quotationItem.findMany({
      where: { request: { createdAt: { gte: since90 } } },
      take: 3000,
      select: { quantity: true, designProject: { select: { template: { select: { code: true, nameAr: true, nameEn: true } } } }, material: { select: { nameAr: true, nameEn: true } } },
    }),
    db.quotationRequest.groupBy({ by: ["deliveryCity"], _count: true, orderBy: { _count: { deliveryCity: "desc" } }, take: 6 }),
    db.quotationRequest.count({ where: { status: "NEW", createdAt: { lt: new Date(now.getTime() - DAY) } } }),
    db.quotationRequest.count({ where: { assignedToId: null, status: { notIn: FINAL_STATUSES } } }),
    db.quotationRequest.count({ where: { status: "QUOTE_SENT", updatedAt: { lt: new Date(now.getTime() - 7 * DAY) } } }),
    db.packagingTemplate.count({ where: { isEnabled: true, currentVersion: { dielineValidated: false } } }),
  ]);

  const count = (s: QuotationStatus) => grouped.find((g) => g.status === s)?._count ?? 0;
  const total = grouped.reduce((a, g) => a + g._count, 0);
  const open = total - FINAL_STATUSES.reduce((a, s) => a + count(s), 0);
  const decided = count("APPROVED") + count("REJECTED") + count("CANCELLED");
  const approvalRate = decided ? Math.round((count("APPROVED") / decided) * 100) : null;

  const days = Array.from({ length: 30 }, (_, i) => ({ day: new Date(since30.getTime() + i * DAY), n: 0 }));
  for (const r of last30) {
    const i = Math.floor((r.createdAt.getTime() - since30.getTime()) / DAY);
    if (days[i]) days[i].n++;
  }

  const firstByRequest = new Map<string, number>();
  for (const h of firstMoves) if (!firstByRequest.has(h.requestId)) firstByRequest.set(h.requestId, h.createdAt.getTime() - h.request.createdAt.getTime());
  const waits = [...firstByRequest.values()];
  const avgHours = waits.length ? waits.reduce((a, x) => a + x, 0) / waits.length / 3_600_000 : null;
  const avgLabel = avgHours == null ? "—" : avgHours < 1 ? `${Math.max(1, Math.round(avgHours * 60))} ${ar ? "د" : "min"}` : avgHours < 48 ? `${avgHours.toFixed(1)} ${ar ? "س" : "h"}` : `${(avgHours / 24).toFixed(1)} ${ar ? "يوم" : "d"}`;

  const tally = <K extends string>(keyOf: (i: (typeof items)[number]) => K | null, label: (k: K) => string) => {
    const m = new Map<K, number>();
    for (const i of items) {
      const k = keyOf(i);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => ({ label: label(k), n }));
  };
  const tplNames = new Map(items.map((i) => [i.designProject.template.code, ar ? i.designProject.template.nameAr : i.designProject.template.nameEn]));
  const topTemplates = tally((i) => i.designProject.template.code, (k) => tplNames.get(k) ?? k);
  const topMaterials = tally((i) => (i.material ? (ar ? i.material.nameAr : i.material.nameEn) : null), (k) => k);
  const units = items.reduce((a, i) => a + i.quantity, 0);

  const attention = [
    { n: stale, label: ar ? "طلبات جديدة مضى عليها أكثر من 24 ساعة" : "New requests older than 24 h", href: `${b}/quotes?status=NEW` },
    { n: unassigned, label: ar ? "طلبات مفتوحة غير مسندة لأحد" : "Open requests with no assignee", href: `${b}/quotes?assignee=none` },
    { n: waitingCustomer, label: ar ? "عروض مرسلة بانتظار رد العميل منذ أكثر من 7 أيام" : "Quotes awaiting the customer for 7+ days", href: `${b}/quotes?status=QUOTE_SENT` },
    { n: unhandled, label: ar ? "رسائل تواصل لم تُعالج" : "Unhandled contact messages", href: `${b}/messages` },
    { n: notValidated, label: ar ? "قوالب مفعّلة مخططها غير معتمد هندسيًا" : "Enabled templates with an unvalidated dieline", href: `${b}/templates?filter=unvalidated` },
  ].filter((a) => a.n > 0);

  const greeting = now.getHours() < 12 ? (ar ? "صباح الخير" : "Good morning") : ar ? "مساء الخير" : "Good evening";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">
            {greeting}، {user.name}
          </p>
          <h1 className="text-2xl font-bold text-navy">{t.admin.overview}</h1>
        </div>
        <p className="num text-xs text-ink-500">{fmtDate(now, locale, true)}</p>
      </div>

      {/* headline numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={ar ? "طلبات هذا الشهر" : "Requests this month"} value={thisMonth} delta={pct(thisMonth, prevMonth)} sub={ar ? `الشهر الماضي ${prevMonth}` : `last month ${prevMonth}`} href={`${b}/quotes`} />
        <StatTile label={ar ? "طلبات مفتوحة" : "Open requests"} value={open} sub={ar ? `مسندة إليّ: ${mine}` : `assigned to me: ${mine}`} href={`${b}/quotes?mine=1`} />
        <StatTile label={ar ? "متوسط أول استجابة" : "Avg. first response"} value={avgLabel} sub={ar ? "آخر 90 يومًا" : "last 90 days"} />
        <StatTile label={ar ? "نسبة الاعتماد" : "Approval rate"} value={approvalRate == null ? "—" : `${approvalRate}%`} sub={ar ? `${count("APPROVED")} من ${decided} طلبًا محسومًا` : `${count("APPROVED")} of ${decided} decided`} />
        <StatTile label={ar ? "العملاء" : "Customers"} value={customers} sub={ar ? `جدد هذا الشهر: ${newCustomers}` : `new this month: ${newCustomers}`} href={canCustomers ? `${b}/customers` : undefined} />
        <StatTile label={ar ? "تصاميم محفوظة" : "Saved designs"} value={designs} sub={ar ? `هذا الشهر: ${designsMonth}` : `this month: ${designsMonth}`} href={canCustomers ? `${b}/designs` : undefined} />
        <StatTile label={ar ? "كمية مطلوبة (90 يومًا)" : "Units requested (90 days)"} value={units.toLocaleString("en-US")} sub={ar ? `${items.length} بندًا` : `${items.length} items`} />
        <StatTile label={ar ? "رسائل لم تُعالج" : "Unhandled messages"} value={unhandled} tone={unhandled ? "warn" : undefined} href={canCustomers ? `${b}/messages` : undefined} />
      </div>

      {/* needs attention */}
      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-navy">{ar ? "يحتاج انتباهك" : "Needs attention"}</h2>
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ok">
            <span aria-hidden>✓</span> {ar ? "لا شيء متأخر الآن." : "Nothing overdue right now."}
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-warn/25 bg-warn/5 px-3 py-2.5 text-sm hover:border-warn/50">
                  <span className="num grid size-8 shrink-0 place-items-center rounded-lg bg-warn/15 font-bold text-warn">{a.n}</span>
                  <span className="flex-1 text-ink">{a.label}</span>
                  <span aria-hidden className="text-ink-500 rtl:rotate-180">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold text-navy">{ar ? "الطلبات اليومية — آخر 30 يومًا" : "Daily requests — last 30 days"}</h2>
            <span className="num text-xs text-ink-500">
              {ar ? "المجموع" : "Total"} {last30.length}
            </span>
          </div>
          <DailyBars data={days} locale={locale} label={ar ? "عدد الطلبات اليومية خلال آخر 30 يومًا" : "Daily request count, last 30 days"} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{ar ? "مسار الطلبات" : "Request pipeline"}</h2>
          <RankBars
            rows={PIPELINE.map((s) => ({ label: t.status[s], n: count(s), href: `${b}/quotes?status=${s}` }))}
            empty={t.admin.noResults}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{ar ? "أكثر المنتجات طلبًا (90 يومًا)" : "Most requested products (90 days)"}</h2>
          <RankBars rows={topTemplates} empty={ar ? "لا توجد بيانات بعد" : "No data yet"} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{ar ? "الخامات المطلوبة (90 يومًا)" : "Requested materials (90 days)"}</h2>
          <RankBars rows={topMaterials} empty={ar ? "لا توجد بيانات بعد" : "No data yet"} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{ar ? "مدن التسليم" : "Delivery cities"}</h2>
          <RankBars rows={cities.map((c) => ({ label: c.deliveryCity || "—", n: c._count }))} empty={ar ? "لا توجد بيانات بعد" : "No data yet"} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {canQuotes && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy">{ar ? "أحدث الطلبات" : "Latest requests"}</h2>
              <Link href={`${b}/quotes`} className="text-xs font-medium text-sun hover:underline">
                {ar ? "عرض الكل" : "View all"}
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState title={t.admin.noResults} />
            ) : (
              <ul className="divide-y divide-navy/8">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`${b}/quotes/${r.id}`} className="flex items-center gap-3 py-3 hover:text-sun-600">
                      <span className="num w-40 shrink-0 text-sm font-semibold text-navy">{r.rfqNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-500">{r.companyName || r.contactName}</span>
                      <span className="num hidden text-xs text-ink-500 sm:block">{fmtDate(r.createdAt, locale)}</span>
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-navy">{t.admin.recentActivity}</h2>
              <Link href={`${b}/audit`} className="text-xs font-medium text-sun hover:underline">
                {ar ? "السجل الكامل" : "Full log"}
              </Link>
            </div>
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
