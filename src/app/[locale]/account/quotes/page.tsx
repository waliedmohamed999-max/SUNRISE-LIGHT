import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { EmptyState, LinkButton } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";

export default async function MyQuotes({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const requests = await db.quotationRequest.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { designProject: { select: { name: true } } } } },
  });

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-navy">{t.account.quotes}</h1>
      {requests.length === 0 ? (
        <EmptyState title={t.account.noQuotes} action={<LinkButton href={`/${locale}/quote`}>{t.nav.quote}</LinkButton>} />
      ) : (
        <ul className="divide-y divide-navy/8 rounded-[var(--radius-card)] border border-navy/8 bg-white">
          {requests.map((r) => (
            <li key={r.id}>
              <Link href={`/${locale}/account/quotes/${r.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-paper/60">
                {r.previewAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/assets/${r.previewAssetId}`} alt="" className="size-14 rounded-lg bg-paper object-contain" />
                ) : (
                  <span className="size-14 rounded-lg bg-paper" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="num block font-semibold text-navy">{r.rfqNumber}</span>
                  <span className="block truncate text-sm text-ink-500">{r.items.map((i) => i.designProject.name).join("، ")}</span>
                </span>
                <span className="num text-xs text-ink-500">{fmtDate(r.createdAt, locale)}</span>
                <StatusBadge status={r.status} locale={locale} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
