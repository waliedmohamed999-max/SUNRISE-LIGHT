import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Breadcrumbs, Card } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";

export default async function AdminCustomer({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "customer.view")) notFound();
  const t = getDict(locale);
  const c = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: {
      profile: { include: { company: true } },
      designs: { orderBy: { updatedAt: "desc" }, include: { template: { select: { nameAr: true, nameEn: true } } } },
      quotationRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t.admin.customers, href: `/${locale}/admin/customers` }, { label: c.name }]} />
      <h1 className="text-2xl font-bold text-navy">{c.name}</h1>
      <Card className="grid gap-4 p-6 text-sm sm:grid-cols-3">
        {[
          [t.auth.email, <span key="e" className="num">{c.email}</span>],
          [t.auth.phone, <span key="p" className="num" dir="ltr">{c.phone ?? "—"}</span>],
          [t.auth.company, c.profile?.company?.name ?? "—"],
          [t.account.crNumber, c.profile?.company?.crNumber ?? "—"],
          [t.account.vatNumber, c.profile?.company?.vatNumber ?? "—"],
          [t.account.city, c.profile?.city ?? "—"],
        ].map(([k, v], i) => (
          <div key={i}>
            <p className="text-xs text-ink-500">{k}</p>
            <p className="font-medium text-navy">{v}</p>
          </div>
        ))}
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{t.account.quotes}</h2>
          <ul className="divide-y divide-navy/8 text-sm">
            {c.quotationRequests.map((r) => (
              <li key={r.id}>
                <Link href={`/${locale}/admin/quotes/${r.id}`} className="flex items-center gap-3 py-3">
                  <span className="num flex-1 font-semibold text-navy">{r.rfqNumber}</span>
                  <span className="num text-xs text-ink-500">{fmtDate(r.createdAt, locale)}</span>
                  <StatusBadge status={r.status} locale={locale} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-navy">{t.admin.designs}</h2>
          <ul className="divide-y divide-navy/8 text-sm">
            {c.designs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                {d.thumbnailAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/assets/${d.thumbnailAssetId}`} alt="" className="size-12 rounded-lg bg-paper object-contain" />
                ) : (
                  <span className="size-12 rounded-lg bg-paper" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy">{d.name}</span>
                  <span className="block text-xs text-ink-500">{locale === "ar" ? d.template.nameAr : d.template.nameEn}</span>
                </span>
                <span className="text-xs text-ink-500">{d.deletedAt ? "deleted" : d.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
