import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, STAFF_ROLES, STAFF_TRANSITIONS } from "@/lib/rbac";
import { designDocumentSchema } from "@/design/document";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Breadcrumbs, buttonClass, Card } from "@/components/ui";
import { fmtDate, fmtMoney, StatusBadge } from "@/components/site/StatusBadge";
import { SpecList } from "@/components/site/SpecList";
import { AdminQuotePanel, AdminDesignViewer, JsonDownload } from "@/components/admin/AdminQuotePanel";

export default async function AdminQuoteDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "rfq.view")) notFound();
  const t = getDict(locale);

  const r = await db.quotationRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
      items: { include: { designVersion: true, designProject: { select: { id: true, name: true } }, material: { select: { colorHex: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      quoteNotes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
      offers: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } }, documents: true } },
    },
  });
  if (!r) notFound();
  const staff = await db.user.findMany({ where: { role: { in: STAFF_ROLES }, isActive: true }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: t.admin.quotes, href: `/${locale}/admin/quotes` }, { label: r.rfqNumber }]} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="num text-2xl font-bold text-navy">{r.rfqNumber}</h1>
        <StatusBadge status={r.status} locale={locale} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {r.items.map((item) => {
            const doc = designDocumentSchema.safeParse(item.designVersion.document);
            const snap = item.specSnapshot as { template: { engineKey?: string; code?: string } };
            return (
              <Card key={item.id} className="p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    {doc.success ? (
                      <AdminDesignViewer doc={doc.data} engineKey={snap.template.engineKey ?? "rsc"} materialColor={item.material?.colorHex ?? "#C9A06B"} previewAssetId={r.previewAssetId} />
                    ) : (
                      <p className="text-sm text-danger">{t.common.error}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/designs/${item.designProjectId}/dieline.svg?version=${item.designVersionId}&locale=${locale}`} className={buttonClass("outline", "sm")}>
                        {t.admin.downloadSvg}
                      </a>
                      {doc.success && <JsonDownload doc={doc.data} name={`${r.rfqNumber}-${item.designProject.name}`} label={t.admin.downloadJson} />}
                      {r.previewAssetId && (
                        <a href={`/api/assets/${r.previewAssetId}`} download={`${r.rfqNumber}-preview.png`} className={buttonClass("outline", "sm")}>
                          {t.admin.preview} PNG
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="mb-2 font-semibold text-navy">{t.admin.specs}</h2>
                    <SpecList item={item} locale={locale} />
                    <p className="mt-3 text-xs text-ink-500">
                      {item.designProject.name} · v<span className="num">{item.designVersion.versionNo}</span>
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy">{t.admin.customer}</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                [t.quote.fullName, r.contactName],
                [t.quote.company, r.companyName || "—"],
                [t.quote.phone, <a key="p" className="num" dir="ltr" href={`tel:${r.phone}`}>{r.phone}</a>],
                [t.quote.email, <a key="e" className="num" dir="ltr" href={`mailto:${r.email}`}>{r.email}</a>],
                [t.quote.city, r.deliveryCity],
                [t.quote.location, r.deliveryLocation],
              ].map(([k, v], i) => (
                <div key={i}>
                  <dt className="text-xs text-ink-500">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
            {r.notes && <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm whitespace-pre-line text-navy">{r.notes}</p>}
            {can(user.role, "customer.view") && (
              <Link href={`/${locale}/admin/customers/${r.customer.id}`} className="mt-4 inline-block text-sm font-semibold text-navy underline-offset-4 hover:underline">
                {r.customer.name} →
              </Link>
            )}
          </Card>

          {r.offers.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-navy">{t.admin.offers}</h2>
              <ul className="divide-y divide-navy/8 text-sm">
                {r.offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="num font-semibold text-navy">{fmtMoney(o.total, o.currency, locale)}</span>
                    <span className="text-ink-500">
                      {o.createdBy.name} · <span className="num">{fmtDate(o.createdAt, locale, true)}</span>
                    </span>
                    <span className="ms-auto text-xs">{o.sentAt ? <span className="text-ok">{o.documents[0]?.docNumber ?? t.status.QUOTE_SENT}</span> : <span className="text-ink-500">Draft</span>}</span>
                    <Link href={`/${locale}/quotation/${o.id}`} className={buttonClass("ghost", "sm")}>
                      {t.admin.printQuotation}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <AdminQuotePanel
            id={r.id}
            status={r.status}
            transitions={STAFF_TRANSITIONS[r.status].filter((s) => s !== "QUOTE_SENT")}
            assignedToId={r.assignedTo?.id ?? null}
            staff={staff}
            canAssign={can(user.role, "rfq.assign")}
            canPrice={can(user.role, "rfq.price")}
            canSend={can(user.role, "rfq.send")}
            defaultQuantity={r.items[0]?.quantity ?? 1}
          />

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy">{t.admin.note}</h2>
            {r.quoteNotes.length === 0 ? (
              <p className="text-sm text-ink-500">{t.common.empty}</p>
            ) : (
              <ul className="space-y-3">
                {r.quoteNotes.map((n) => (
                  <li key={n.id} className={n.internal ? "rounded-xl bg-paper px-4 py-3" : "rounded-xl border border-sun/40 bg-sun-100/40 px-4 py-3"}>
                    <p className="text-xs text-ink-500">
                      {n.author.name} · {n.internal ? t.admin.internalNote : t.admin.customerFeedback} · <span className="num">{fmtDate(n.createdAt, locale, true)}</span>
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-line text-navy">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-navy">{t.admin.statusHistory}</h2>
            <ol className="space-y-3 border-s border-navy/10 ps-4 text-sm">
              {r.statusHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -start-[21px] size-2.5 rounded-full bg-sun" />
                  <p className="font-medium text-navy">{t.status[h.toStatus]}</p>
                  <p className="text-xs text-ink-500">
                    {h.changedBy?.name ?? "—"} · <span className="num">{fmtDate(h.createdAt, locale, true)}</span>
                  </p>
                  {h.note && <p className="mt-1 text-xs text-ink-500">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
