import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { buttonClass, EmptyState, inputClass } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";

export default async function AdminCustomers({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  const { q: rawQ } = await searchParams;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "customer.view")) notFound();
  const t = getDict(locale);
  const q = rawQ?.trim().slice(0, 100);
  const customers = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { profile: { company: { name: { contains: q, mode: "insensitive" } } } }] }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      profile: { include: { company: true } },
      _count: { select: { designs: { where: { deletedAt: null } }, quotationRequests: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t.admin.customers}</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={t.common.search} className={`${inputClass} max-w-md`} />
        <button className={buttonClass("primary", "md")}>{t.common.search}</button>
      </form>
      {customers.length === 0 ? (
        <EmptyState title={t.admin.noResults} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-navy/8 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-paper text-xs text-ink-500">
              <tr>
                {[t.auth.name, t.auth.company, t.auth.email, t.admin.designs, t.account.quotes, t.account.submittedAt].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/8">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/admin/customers/${c.id}`} className="font-semibold text-navy hover:text-sun-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{c.profile?.company?.name ?? "—"}</td>
                  <td className="num px-4 py-3 text-ink-500">{c.email}</td>
                  <td className="num px-4 py-3">{c._count.designs}</td>
                  <td className="num px-4 py-3">{c._count.quotationRequests}</td>
                  <td className="num px-4 py-3 text-ink-500">{fmtDate(c.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
