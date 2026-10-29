import type { Locale } from "@/i18n/config";
import type { CustomerQuoteView } from "@/lib/pricing";
import { cx } from "@/components/ui";
import { fmtMoney } from "@/components/site/StatusBadge";

/**
 * Customer-facing figures of a built quotation: one option as a priced statement, several as a comparison.
 * Takes the customer-safe view only (no rates, costs, margin or internal note).
 */
export function OfferDetails({ view, currency, locale, selected, print }: { view: CustomerQuoteView; currency: string; locale: Locale; selected?: number | null; print?: boolean }) {
  const ar = locale === "ar";
  const m = (v: number) => fmtMoney(v, currency, locale);
  const best = view.options.length > 1 ? view.options.reduce((b, o, i) => (o.effectiveUnitPrice < view.options[b].effectiveUnitPrice ? i : b), 0) : -1;

  return (
    <div className="space-y-5">
      {view.options.length > 1 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className={cx("text-xs", print ? "text-ink-500" : "text-ink-500")}>
                <th className="pb-2 text-start font-medium">{ar ? "الكمية" : "Quantity"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "سعر القطعة" : "Unit price"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "قبل الضريبة" : "Subtotal"}</th>
                <th className="pb-2 text-end font-medium">{ar ? "الإجمالي شامل الضريبة" : "Total incl. VAT"}</th>
              </tr>
            </thead>
            <tbody>
              {view.options.map((o, i) => (
                <tr key={i} className={cx("border-t border-navy/10", selected === i && "bg-ok/10")}>
                  <td className="num py-2.5 font-semibold text-navy">
                    {o.quantity.toLocaleString("en")}
                    {i === best && <span className="ms-2 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-semibold text-sun-600">{ar ? "أوفر سعر للقطعة" : "Best unit price"}</span>}
                    {selected === i && <span className="ms-2 text-[11px] text-ok">✓ {ar ? "الخيار المعتمد" : "Approved option"}</span>}
                  </td>
                  <td className="num py-2.5 text-navy">
                    {m(o.effectiveUnitPrice)}
                    {o.discountPercent > 0 && <span className="ms-1 text-[11px] text-ok">−{o.discountPercent}%</span>}
                  </td>
                  <td className="num py-2.5 text-navy">{m(o.subtotal)}</td>
                  <td className="num py-2.5 text-end font-bold text-navy">{m(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.options[0].charges.length > 0 && (
            <p className="mt-2 text-xs text-ink-500">
              {ar ? "تشمل الأسعار: " : "Prices include: "}
              {view.options[0].charges.map((c) => c.label[locale] || c.label.ar).join("، ")}
            </p>
          )}
        </div>
      ) : (
        <Statement o={view.options[0]} m={m} locale={locale} />
      )}

      {(view.depositPercent > 0 || view.paymentTerms) && (
        <div className="rounded-xl bg-paper px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-ink-500">{ar ? "الدفع" : "Payment"}</p>
          {view.depositPercent > 0 && (
            <p className="mt-1 text-navy">
              {ar ? "دفعة مقدمة" : "Advance payment"} <span className="num font-semibold">{view.depositPercent}%</span>
              {view.options.length === 1 && <span className="num"> — {m(view.options[0].deposit)}</span>}
            </p>
          )}
          {view.paymentTerms && <p className="mt-1 text-navy">{view.paymentTerms}</p>}
        </div>
      )}
      {view.customerNote && <p className="rounded-xl border border-sun/40 bg-sun-100/40 px-4 py-3 text-sm whitespace-pre-line text-navy">{view.customerNote}</p>}
    </div>
  );
}

function Statement({ o, m, locale }: { o: CustomerQuoteView["options"][number]; m: (v: number) => string; locale: Locale }) {
  const ar = locale === "ar";
  const rows: [string, string, string?][] = [
    [`${ar ? "المنتج" : "Product"} (${o.quantity.toLocaleString("en")} × ${m(o.unitPrice)})`, m(o.productTotal)],
    ...o.charges.map((c) => [c.label[locale] || c.label.ar, m(c.amount)] as [string, string]),
    ...(o.discount > 0 ? [[`${ar ? "خصم" : "Discount"} ${o.discountPercent}%`, `−${m(o.discount)}`, "text-ok"] as [string, string, string]] : []),
    ...(o.minimumAdjustment > 0 ? [[ar ? "الحد الأدنى لقيمة الطلب" : "Minimum order value", `+${m(o.minimumAdjustment)}`] as [string, string]] : []),
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v, tone]) => (
          <tr key={k} className="border-b border-navy/8">
            <td className="py-2 text-ink-500">{k}</td>
            <td className={cx("num py-2 text-end font-medium text-navy", tone)}>{v}</td>
          </tr>
        ))}
        <tr className="border-b border-navy/8">
          <td className="py-2 font-semibold text-navy">{ar ? "المجموع قبل الضريبة" : "Subtotal"}</td>
          <td className="num py-2 text-end font-semibold text-navy">{m(o.subtotal)}</td>
        </tr>
        <tr className="border-b border-navy/8">
          <td className="py-2 text-ink-500">{ar ? "ضريبة القيمة المضافة" : "VAT"}</td>
          <td className="num py-2 text-end text-navy">{m(o.tax)}</td>
        </tr>
        <tr>
          <td className="py-3 font-bold text-navy">{ar ? "الإجمالي" : "Total"}</td>
          <td className="num py-3 text-end text-lg font-bold text-navy">{m(o.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
