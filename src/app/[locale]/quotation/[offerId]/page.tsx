import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getSiteInfo } from "@/lib/content";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Logo } from "@/components/site/Logo";
import { fmtDate, fmtMoney } from "@/components/site/StatusBadge";
import { SpecList } from "@/components/site/SpecList";
import { PrintButton } from "@/components/site/PrintButton";

export const metadata = { robots: { index: false } };

/**
 * Quotation document. Rendered as HTML so Arabic text is shaped correctly by the browser;
 * "Print / Save as PDF" produces the PDF. Server-side PDF rendering (headless Chromium)
 * is described in docs/DEPLOYMENT.md.
 */
export default async function QuotationDocumentPage({ params }: { params: Promise<{ locale: Locale; offerId: string }> }) {
  const { locale, offerId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const t = getDict(locale);
  const offer = await db.quotationOffer.findUnique({
    where: { id: offerId },
    include: { documents: true, request: { include: { items: true } }, createdBy: { select: { name: true } } },
  });
  const staff = can(user.role, "rfq.view");
  if (!offer || (!staff && (offer.request.customerId !== user.id || !offer.sentAt))) notFound();
  const info = await getSiteInfo(locale);
  const r = offer.request;
  const doc = offer.documents[0];
  const ar = locale === "ar";

  return (
    <div className="theme-paper bg-paper-200 py-10 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4 no-print">
        <PrintButton label={ar ? "طباعة / حفظ PDF" : "Print / Save as PDF"} />
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[14mm] text-sm shadow-[var(--shadow-lift)] print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-sun pb-6">
          <Logo locale={locale} variant="light" className="h-16" />
          <div className="text-end">
            <p className="text-lg font-bold text-navy">{ar ? "عرض سعر" : "Quotation"}</p>
            <p className="num text-ink-500">{doc?.docNumber ?? (ar ? "مسودة — لم يُرسل" : "Draft — not sent")}</p>
            <p className="num text-ink-500">{fmtDate(offer.sentAt ?? offer.createdAt, locale)}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-ink-500 uppercase">{t.admin.customer}</p>
            <p className="mt-1 font-semibold text-navy">{r.contactName}</p>
            {r.companyName && <p>{r.companyName}</p>}
            <p className="num" dir="ltr">{r.phone}</p>
            <p className="num" dir="ltr">{r.email}</p>
            <p>
              {r.deliveryCity} — {r.deliveryLocation}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs font-bold text-ink-500 uppercase">{t.account.rfqNumber}</p>
            <p className="num mt-1 font-semibold text-navy">{r.rfqNumber}</p>
            {offer.validUntil && (
              <p className="mt-2">
                {t.account.validUntil}: <span className="num">{fmtDate(offer.validUntil, locale)}</span>
              </p>
            )}
            {offer.leadTime && (
              <p>
                {t.account.leadTime}: {offer.leadTime}
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <p className="mb-2 text-xs font-bold text-ink-500 uppercase">{t.admin.specs}</p>
          {r.items.map((i) => (
            <SpecList key={i.id} item={i} locale={locale} />
          ))}
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                [t.account.unitPrice, fmtMoney(offer.unitPrice, offer.currency, locale)],
                [t.studio.quantity, offer.quantity.toLocaleString("en")],
                [ar ? "المجموع قبل الضريبة" : "Subtotal", fmtMoney(offer.subtotal, offer.currency, locale)],
                [`${t.account.tax} (${offer.taxPercent.toString()}%)`, fmtMoney(Number(offer.total) - Number(offer.subtotal), offer.currency, locale)],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-navy/8">
                  <td className="py-2 text-ink-500">{k}</td>
                  <td className="num py-2 text-end font-medium text-navy">{v}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 font-bold text-navy">{t.account.total}</td>
                <td className="num py-3 text-end text-lg font-bold text-navy">{fmtMoney(offer.total, offer.currency, locale)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {offer.terms && (
          <section className="mt-6">
            <p className="text-xs font-bold text-ink-500 uppercase">{t.account.terms}</p>
            <p className="mt-1 whitespace-pre-line">{offer.terms}</p>
          </section>
        )}

        <footer className="mt-10 border-t border-navy/10 pt-4 text-xs text-ink-500">
          <p>{[t.brand.name, info.phone, info.phone2, info.email2 || info.email, info.address].filter(Boolean).join(" · ")}</p>
          {(info.cr || info.vat) && (
            <p className="num mt-1">
              {[info.cr && `${locale === "ar" ? "س.ت" : "CR"} ${info.cr}`, info.vat && `${locale === "ar" ? "الرقم الضريبي" : "VAT"} ${info.vat}`].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1">{t.studio.colorNote}</p>
        </footer>
      </article>
    </div>
  );
}
