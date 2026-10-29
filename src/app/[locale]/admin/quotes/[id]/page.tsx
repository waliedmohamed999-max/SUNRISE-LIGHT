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
import { getPricing, priceListFor, requestSheetArea } from "@/lib/pricing-store";
import { quoteBuildSchema, type OptionResult, type QuoteLine } from "@/lib/pricing";
import { getEngine } from "@/packaging/engine";
import { QuoteBuilder } from "@/components/admin/QuoteBuilder";

/** Notes written by the system (automatic pricing) are stored as codes and shown in the reader's language. */
const SYSTEM_NOTES: Record<string, { ar: string; en: string }> = {
  "automatic pricing": { ar: "سُعّر تلقائيًا من قائمة الأسعار", en: "Priced automatically from the price list" },
  "automatic quotation sent": { ar: "أُرسل عرض السعر للعميل تلقائيًا", en: "Quotation sent to the customer automatically" },
};

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
      items: { include: { designVersion: true, designProject: { select: { id: true, name: true } }, material: { select: { colorHex: true, code: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      quoteNotes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
      offers: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } }, documents: true } },
    },
  });
  if (!r) notFound();
  const staff = await db.user.findMany({ where: { role: { in: STAFF_ROLES }, isActive: true }, select: { id: true, name: true } });

  // quote builder data: the real sheet area of the submitted design, price-list lines and the last built offer
  const canPrice = can(user.role, "rfq.price");
  const pricingOpen = ["PRICING", "REVISION_REQUESTED", "QUOTE_SENT"].includes(r.status);
  const pricing = await getPricing();
  const first = r.items[0];
  const firstDoc = first ? designDocumentSchema.safeParse(first.designVersion.document) : null;
  const engineKey = (first?.specSnapshot as { template?: { engineKey?: string } } | undefined)?.template?.engineKey;
  const builderData =
    canPrice && pricingOpen && first && firstDoc?.success && engineKey
      ? await (async () => {
          const dl = getEngine(engineKey).dieline(firstDoc.data.dimensions);
          const list = await priceListFor(
            firstDoc.data,
            engineKey,
            { materialCode: first.material?.code ?? null, finishingCodes: (first.finishingCodes as string[]) ?? [], quantity: first.quantity },
            pricing,
          );
          const last = r.offers.find((o) => o.details);
          const lastBuild = last ? quoteBuildSchema.safeParse(last.details) : null;
          return {
            areaM2: await requestSheetArea(r.id, pricing),
            sheetMm: { w: Math.round(dl.width), h: Math.round(dl.height) },
            priceList: list.lines.length && list.reasons.length === 0 ? list.lines : null,
            priceListReasons: list.reasons,
            previous: last && lastBuild?.success ? { build: lastBuild.data, leadTime: last.leadTime, terms: last.terms } : null,
          };
        })()
      : null;
  const money = (n: number, cur: string) => `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

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
                [
                  t.quote.phone,
                  <a key="p" className="num" dir="ltr" href={`tel:${r.phone}`}>
                    {r.phone}
                  </a>,
                ],
                [
                  t.quote.email,
                  <a key="e" className="num" dir="ltr" href={`mailto:${r.email}`}>
                    {r.email}
                  </a>,
                ],
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
                    {o.source === "AUTO" && <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-semibold text-sun-600">{locale === "ar" ? "تلقائي" : "Automatic"}</span>}
                    <span className="text-ink-500">
                      {o.createdBy?.name ?? (locale === "ar" ? "التسعير التلقائي" : "Automatic pricing")} · <span className="num">{fmtDate(o.createdAt, locale, true)}</span>
                    </span>
                    <span className="ms-auto text-xs">
                      {o.sentAt ? <span className="text-ok">{o.documents[0]?.docNumber ?? t.status.QUOTE_SENT}</span> : <span className="text-ink-500">Draft</span>}
                    </span>
                    <Link href={`/${locale}/quotation/${o.id}`} className={buttonClass("ghost", "sm")}>
                      {t.admin.printQuotation}
                    </Link>
                    {(o.details as { computed?: OptionResult[] } | null)?.computed && (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {(o.details as { computed: OptionResult[] }).computed.map((x, i) => (
                              <tr key={i} className={i === o.selectedOption ? "bg-ok/10 font-semibold" : ""}>
                                <td className="num py-1 ps-2">{x.quantity.toLocaleString("en")}</td>
                                <td className="num py-1">{x.unitPrice.toFixed(3)}</td>
                                <td className="num py-1">{money(x.total, o.currency)}</td>
                                <td className={x.profitPercent < 10 ? "num py-1 text-warn" : "num py-1 text-ok"}>{x.profitPercent}%</td>
                                <td className="py-1 pe-2 text-end">{i === o.selectedOption ? (locale === "ar" ? "✓ اختيار العميل" : "✓ chosen by the customer") : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(o.details as { internalNote?: string }).internalNote && (
                          <p className="mt-1 rounded-lg bg-paper px-2 py-1 text-xs text-ink-500">
                            {locale === "ar" ? "ملاحظة داخلية: " : "Internal: "}
                            {(o.details as { internalNote: string }).internalNote}
                          </p>
                        )}
                      </div>
                    )}
                    {o.breakdown && (
                      <details className="w-full">
                        <summary className="cursor-pointer text-xs font-semibold text-navy">{locale === "ar" ? "تفاصيل الحساب" : "Calculation details"}</summary>
                        <dl className="mt-2 grid gap-1 rounded-xl bg-paper p-3 text-xs sm:grid-cols-2">
                          {((o.breakdown as { lines?: QuoteLine[] }).lines ?? []).map((l) => (
                            <div key={l.key} className="flex justify-between gap-3">
                              <dt className="text-ink-500">{l.label[locale]}</dt>
                              <dd className="num text-navy">{money(l.amount, o.currency)}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {builderData && (
            <QuoteBuilder
              requestId={r.id}
              canSend={can(user.role, "rfq.send")}
              currency={pricing.currency}
              areaM2={builderData.areaM2}
              sheetMm={builderData.sheetMm}
              requestedQuantity={first!.quantity}
              defaults={{
                marginPercent: pricing.marginPercent,
                taxPercent: pricing.taxPercent,
                depositPercent: pricing.depositPercent,
                paymentTerms: pricing.paymentTerms,
                validityDays: pricing.validityDays,
                leadTime: pricing.leadTime,
                terms: pricing.terms,
                minOrderTotal: pricing.minOrderTotal,
              }}
              tiers={pricing.tiers}
              priceList={builderData.priceList}
              priceListReasons={builderData.priceListReasons}
              previous={builderData.previous}
            />
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
                    {h.changedBy?.name ?? (h.note?.startsWith("automatic") ? (locale === "ar" ? "التسعير التلقائي" : "Automatic pricing") : "—")} ·{" "}
                    <span className="num">{fmtDate(h.createdAt, locale, true)}</span>
                  </p>
                  {h.note && <p className="mt-1 text-xs text-ink-500">{SYSTEM_NOTES[h.note]?.[locale] ?? h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
