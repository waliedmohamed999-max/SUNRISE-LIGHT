import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Alert, Breadcrumbs, buttonClass, Card } from "@/components/ui";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/site/StatusBadge";
import { QuoteCustomerActions } from "@/components/site/AccountActions";
import { SpecList } from "@/components/site/SpecList";

export default async function QuoteDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const r = await db.quotationRequest.findFirst({
    where: { id, customerId: user.id },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      quoteNotes: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
      offers: { where: { sentAt: { not: null } }, orderBy: { sentAt: "desc" }, include: { documents: true } },
    },
  });
  if (!r) notFound();
  const offer = r.offers[0];

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: t.account.quotes, href: `/${locale}/account/quotes` }, { label: r.rfqNumber }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="num text-2xl font-bold text-navy">{r.rfqNumber}</h1>
        <StatusBadge status={r.status} locale={locale} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {offer && (
            <Card className="border-ok/30 p-6">
              <h2 className="font-semibold text-navy">{t.account.offer}</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-500">{t.account.unitPrice}</dt>
                  <dd className="num font-semibold text-navy">{fmtMoney(offer.unitPrice, offer.currency, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">{t.studio.quantity}</dt>
                  <dd className="num font-semibold text-navy">{offer.quantity.toLocaleString("en")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">
                    {t.account.total} ({t.account.tax} <span className="num">{offer.taxPercent.toString()}%</span>)
                  </dt>
                  <dd className="num text-lg font-bold text-navy">{fmtMoney(offer.total, offer.currency, locale)}</dd>
                </div>
                {offer.validUntil && (
                  <div>
                    <dt className="text-xs text-ink-500">{t.account.validUntil}</dt>
                    <dd className="num text-sm text-navy">{fmtDate(offer.validUntil, locale)}</dd>
                  </div>
                )}
                {offer.leadTime && (
                  <div>
                    <dt className="text-xs text-ink-500">{t.account.leadTime}</dt>
                    <dd className="text-sm text-navy">{offer.leadTime}</dd>
                  </div>
                )}
              </dl>
              {offer.terms && <p className="mt-4 text-sm whitespace-pre-line text-ink-500">{offer.terms}</p>}
              {offer.documents[0] && (
                <Link href={`/${locale}/quotation/${offer.id}`} className={buttonClass("outline", "sm", "mt-5")}>
                  {t.account.printDoc}
                </Link>
              )}
            </Card>
          )}

          <Card className="p-6">
            <QuoteCustomerActions id={r.id} status={r.status} />
            {r.status === "REVISION_REQUESTED" && <Alert tone="warn" className="mt-3">{t.status.REVISION_REQUESTED}</Alert>}
          </Card>

          {r.items.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
                {r.previewAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/assets/${r.previewAssetId}`} alt="" className="aspect-[4/3] w-full rounded-xl bg-paper object-contain" />
                ) : (
                  <div className="aspect-[4/3] rounded-xl bg-paper" />
                )}
                <SpecList item={item} locale={locale} />
              </div>
            </Card>
          ))}

          {r.quoteNotes.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-navy">{t.account.feedback}</h2>
              <ul className="mt-4 space-y-3">
                {r.quoteNotes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-paper px-4 py-3">
                    <p className="text-xs text-ink-500">
                      {n.author.name} · <span className="num">{fmtDate(n.createdAt, locale, true)}</span>
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-line text-navy">{n.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="h-fit p-6">
          <h2 className="font-semibold text-navy">{t.account.history}</h2>
          <ol className="mt-4 space-y-4 border-s border-navy/10 ps-4">
            {r.statusHistory.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1.5 -start-[21px] size-2.5 rounded-full bg-sun" />
                <p className="text-sm font-medium text-navy">{t.status[h.toStatus]}</p>
                <p className="num text-xs text-ink-500">{fmtDate(h.createdAt, locale, true)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </section>
  );
}
