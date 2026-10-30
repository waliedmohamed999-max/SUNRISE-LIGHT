"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Card, cx, Field, inputClass, Spinner, TrashIcon } from "@/components/ui";
import { UnitInput } from "@/components/admin/UnitInput";
import { evaluateOption, LINE_BASES, type BuilderLine, type LineBasis, type QuoteBuild, type QuoteOption } from "@/lib/pricing";

type Props = {
  requestId: string;
  canSend: boolean;
  currency: string;
  /** cutting-sheet area of one unit (m², incl. waste), computed on the server from the submitted design */
  areaM2: number | null;
  sheetMm: { w: number; h: number } | null;
  requestedQuantity: number;
  defaults: { marginPercent: number; taxPercent: number; depositPercent: number; paymentTerms: string; validityDays: number; leadTime: string; terms: string; minOrderTotal: number };
  tiers: { minQty: number; discountPercent: number }[];
  /** lines from the factory price list for this request (null when the list does not cover it) */
  priceList: BuilderLine[] | null;
  priceListReasons: { code: string; ar: string; en: string }[];
  /** the latest built offer on this request, to continue from */
  previous: { build: QuoteBuild; leadTime: string; terms: string } | null;
};

const BASIS_LABEL: Record<LineBasis, { ar: string; en: string }> = {
  unit: { ar: "للقطعة", en: "per piece" },
  m2: { ar: "لكل م² فرخ", en: "per sheet m²" },
  fixed: { ar: "مبلغ ثابت", en: "fixed" },
};

/** Ready-made lines the factory adds most often. */
const PRESETS: { label: { ar: string; en: string }; basis: LineBasis; markup: boolean; show: boolean }[] = [
  { label: { ar: "سعر المنتج", en: "Product price" }, basis: "unit", markup: true, show: false },
  { label: { ar: "شحن وتوصيل", en: "Shipping & delivery" }, basis: "fixed", markup: false, show: true },
  { label: { ar: "تصميم جرافيك", en: "Graphic design" }, basis: "fixed", markup: true, show: true },
  { label: { ar: "عينة / بروفة مطبوعة", en: "Printed sample / proof" }, basis: "fixed", markup: true, show: true },
  { label: { ar: "بليتات طباعة", en: "Printing plates" }, basis: "fixed", markup: true, show: false },
  { label: { ar: "فورمة قص", en: "Cutting die" }, basis: "fixed", markup: true, show: false },
  { label: { ar: "تغليف وتجميع", en: "Packing & assembly" }, basis: "unit", markup: true, show: false },
  { label: { ar: "بند مخصص", en: "Custom line" }, basis: "unit", markup: true, show: false },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number, d = 2) => n.toLocaleString("en", { minimumFractionDigits: d, maximumFractionDigits: d });

export function QuoteBuilder(p: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const router = useRouter();
  const cur = ar && p.currency === "SAR" ? "ر.س" : p.currency;
  const area = p.areaM2 ?? 0;
  const perPc = ar ? `${cur}/قطعة` : `${cur}/pc`;
  const unitOf = (b: LineBasis) => (b === "unit" ? perPc : b === "m2" ? `${cur}/م²` : cur);
  /** how a line's cost is obtained, written out: rate × sheet m² × pieces */
  const formula = (l: BuilderLine, qty: number) =>
    l.basis === "unit"
      ? `${fmt(l.rate, 3)} × ${qty.toLocaleString("en")} ${ar ? "قطعة" : "pcs"}`
      : l.basis === "m2"
        ? `${fmt(l.rate, 3)} × ${fmt(area, 3)} م² × ${qty.toLocaleString("en")}`
        : ar
          ? "مبلغ ثابت للطلب"
          : "fixed per order";
  const tierFor = (q: number) =>
    [...p.tiers]
      .sort((a, b) => a.minQty - b.minQty)
      .filter((t) => q >= t.minQty)
      .at(-1)?.discountPercent ?? 0;

  const blank = (): QuoteBuild => ({
    lines: [{ id: uid(), label: PRESETS[0].label, basis: "unit", rate: 0, markup: true, show: false }],
    marginPercent: p.defaults.marginPercent,
    options: [{ quantity: p.requestedQuantity, discountPercent: tierFor(p.requestedQuantity), unitPriceOverride: null }],
    taxPercent: p.defaults.taxPercent,
    minOrderTotal: p.defaults.minOrderTotal,
    depositPercent: p.defaults.depositPercent,
    paymentTerms: p.defaults.paymentTerms,
    customerNote: "",
    internalNote: "",
  });
  const fromPriceList = (): QuoteBuild => ({ ...blank(), lines: p.priceList!.map((l) => ({ ...l, id: `${l.id}-${uid()}` })) });

  const [build, setBuild] = useState<QuoteBuild>(() => (p.previous ? p.previous.build : p.priceList ? fromPriceList() : blank()));
  const [meta, setMeta] = useState({
    validUntil: new Date(Date.now() + p.defaults.validityDays * 864e5).toISOString().slice(0, 10),
    leadTime: p.previous?.leadTime ?? p.defaults.leadTime,
    terms: p.previous?.terms ?? p.defaults.terms,
  });
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [state, setState] = useState<{ busy?: "save" | "send"; ok?: string; error?: string }>({});

  const results = useMemo(() => build.options.map((o) => evaluateOption(build, o, area)), [build, area]);
  const r = results[Math.min(active, results.length - 1)];
  const setLine = (i: number, patch: Partial<BuilderLine>) => setBuild((b) => ({ ...b, lines: b.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const setOption = (i: number, patch: Partial<QuoteOption>) => setBuild((b) => ({ ...b, options: b.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  const issues = [
    ...build.lines.filter((l) => !l.label[locale].trim() && !l.label.ar.trim()).map(() => (ar ? "يوجد بند بدون اسم" : "A line has no name")),
    ...(results.some((x) => x.subtotal <= 0) ? [ar ? "السعر صفر — أدخل أسعار البنود" : "The price is zero — enter line rates"] : []),
    ...(build.lines.some((l) => l.basis === "m2") && !p.areaM2 ? [ar ? "تعذّر حساب مساحة الفرخ لهذا التصميم" : "The sheet area of this design is unavailable"] : []),
  ];

  /** Solve the margin that gives the target unit price on the active option. */
  function applyTarget() {
    if (!target) return;
    const o = build.options[active];
    const n = o.quantity;
    const costs = build.lines.map((l) => (l.basis === "unit" ? l.rate * n : l.basis === "m2" ? l.rate * area * n : l.rate));
    const markup = build.lines.reduce((s, l, i) => (!l.show && l.markup ? s + costs[i] : s), 0);
    const fixed = build.lines.reduce((s, l, i) => (!l.show && !l.markup ? s + costs[i] : s), 0);
    if (markup <= 0) return;
    const m = ((target * n - fixed) / markup - 1) * 100;
    setBuild((b) => ({ ...b, marginPercent: Math.max(0, Math.round(m * 100) / 100), options: b.options.map((x, j) => (j === active ? { ...x, unitPriceOverride: null } : x)) }));
  }

  async function submit(send: boolean) {
    if (issues.length) return;
    if (send && !window.confirm(ar ? "إرسال عرض السعر للعميل الآن؟" : "Send the quotation to the customer now?")) return;
    setState({ busy: send ? "send" : "save" });
    const clean: QuoteBuild = { ...build, lines: build.lines.map((l) => ({ ...l, label: { ar: l.label.ar.trim() || l.label.en.trim(), en: l.label.en.trim() || l.label.ar.trim() } })) };
    const res = await fetch(`/api/admin/rfq/${p.requestId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ build: clean, currency: p.currency, validUntil: meta.validUntil || null, leadTime: meta.leadTime, terms: meta.terms, send }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ error: `${ar ? "تعذّر الحفظ" : "Could not save"} (${j.error ?? res.status})` });
    setState({ ok: send ? (ar ? "تم إرسال عرض السعر للعميل" : "Quotation sent to the customer") : ar ? "تم حفظ العرض كمسودة" : "Saved as a draft" });
    router.refresh();
  }

  const health = r.profitPercent < 0 ? "loss" : r.profitPercent < 10 ? "low" : r.profitPercent < 20 ? "ok" : "good";
  const healthStyle = { loss: "bg-danger", low: "bg-warn", ok: "bg-sun", good: "bg-ok" }[health];
  const healthLabel = {
    loss: ar ? "خسارة — السعر أقل من التكلفة" : "Loss — price below cost",
    low: ar ? "ربح منخفض" : "Low profit",
    ok: ar ? "ربح مقبول" : "Fair profit",
    good: ar ? "ربح جيد" : "Healthy profit",
  }[health];

  return (
    <Card id="quote-builder" className="scroll-mt-24 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/8 px-6 py-4">
        <div>
          <h2 className="font-semibold text-navy">{ar ? "منشئ عرض السعر" : "Quote builder"}</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {ar ? "تحكم في كل بند؛ يُحسب السعر من البنود ويُعاد حسابه على الخادم عند الحفظ." : "Control every line; the price is built from the lines and recomputed on the server when saved."}
            {p.sheetMm && (
              <span className="num ms-2">
                {ar ? "فرخ القص" : "Sheet"} {p.sheetMm.w}×{p.sheetMm.h} mm · {fmt(area, 3)} m²
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.priceList && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.confirm(ar ? "استبدال البنود الحالية ببنود قائمة الأسعار؟" : "Replace the lines with the price-list lines?") && setBuild(fromPriceList())}
            >
              {ar ? "تعبئة من قائمة الأسعار" : "Fill from price list"}
            </Button>
          )}
          {p.previous && (
            <Button size="sm" variant="ghost" onClick={() => setBuild(p.previous!.build)}>
              {ar ? "استعادة آخر عرض" : "Restore last offer"}
            </Button>
          )}
        </div>
      </div>
      {!p.priceList && p.priceListReasons.length > 0 && (
        <p className="border-b border-navy/8 bg-paper px-6 py-2 text-xs text-ink-500">
          {ar ? "قائمة الأسعار لا تغطي هذا الطلب: " : "The price list does not cover this request: "}
          {p.priceListReasons.map((x) => x[locale]).join(" · ")}
        </p>
      )}

      <div className="grid xl:grid-cols-[1fr_340px]">
        <div className="space-y-8 p-6">
          {/* lines */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-navy">{ar ? "بنود التكلفة" : "Cost lines"}</h3>
              <select
                aria-label={ar ? "إضافة بند" : "Add a line"}
                className={cx(inputClass, "w-auto py-1.5 text-sm")}
                value=""
                onChange={(e) => {
                  const pr = PRESETS[Number(e.target.value)];
                  if (pr) setBuild((b) => ({ ...b, lines: [...b.lines, { id: uid(), label: { ...pr.label }, basis: pr.basis, rate: 0, markup: pr.markup, show: pr.show }].slice(0, 40) }));
                }}
              >
                <option value="">+ {ar ? "إضافة بند" : "Add a line"}</option>
                {PRESETS.map((pr, i) => (
                  <option key={i} value={i}>
                    {pr.label[locale]}
                  </option>
                ))}
              </select>
            </div>
            {p.sheetMm && (
              <p className="mb-3 rounded-xl bg-paper px-3 py-2 text-xs text-ink-500">
                {ar ? "مساحة فرخ القص للقطعة الواحدة: " : "Cutting sheet per piece: "}
                <span className="num font-semibold text-navy">
                  {p.sheetMm.w} × {p.sheetMm.h} mm = {fmt((p.sheetMm.w * p.sheetMm.h) / 1e6, 3)} م²
                </span>
                {area > (p.sheetMm.w * p.sheetMm.h) / 1e6 + 1e-6 && (
                  <>
                    {ar ? " + الهالك = " : " + waste = "}
                    <span className="num font-semibold text-navy">{fmt(area, 3)} م²</span>
                  </>
                )}
                {ar ? " — تُضرب فيها البنود المحسوبة «للمتر² من الفرخ»." : " — lines priced per sheet m² are multiplied by it."}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-[11px] text-ink-500">
                    <th className="pb-2 text-start font-medium">{ar ? "البند" : "Line"}</th>
                    <th className="pb-2 text-start font-medium">{ar ? "طريقة الحساب" : "Basis"}</th>
                    <th className="pb-2 text-start font-medium">{ar ? "سعر الوحدة" : "Unit rate"}</th>
                    <th className="pb-2 text-end font-medium">
                      {ar ? "التكلفة = السعر × الكمية" : "Cost = rate × quantity"}{" "}
                      <span className="num">
                        ({r.quantity.toLocaleString("en")} {ar ? "قطعة" : "pcs"})
                      </span>
                    </th>
                    <th className="pb-2 text-center font-medium" title={ar ? "يُضاف عليه هامش الربح" : "Margin is added"}>
                      {ar ? "ربح" : "Margin"}
                    </th>
                    <th className="pb-2 text-center font-medium" title={ar ? "يظهر للعميل كبند منفصل" : "Shown to the customer as a separate charge"}>
                      {ar ? "يظهر للعميل" : "Shown"}
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {build.lines.map((l, i) => {
                    const cost = r.lineCosts[i]?.amount ?? 0;
                    return (
                      <tr key={l.id} className="border-t border-dashed border-navy/10 align-middle">
                        <td className="py-1.5 pe-2">
                          <input
                            className={cx(inputClass, "py-1.5 text-sm")}
                            maxLength={120}
                            value={l.label[locale]}
                            onChange={(e) => setLine(i, { label: { ...l.label, [locale]: e.target.value } })}
                            aria-label={ar ? "اسم البند" : "Line name"}
                          />
                        </td>
                        <td className="w-36 py-1.5 pe-2">
                          <select
                            className={cx(inputClass, "py-1.5 text-sm")}
                            value={l.basis}
                            onChange={(e) => setLine(i, { basis: e.target.value as LineBasis })}
                            aria-label={ar ? "طريقة الحساب" : "Basis"}
                          >
                            {LINE_BASES.map((b) => (
                              <option key={b} value={b}>
                                {BASIS_LABEL[b][locale]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-40 py-1.5 pe-2">
                          <UnitInput label={ar ? "سعر الوحدة" : "Unit rate"} unit={unitOf(l.basis)} value={l.rate} onChange={(v) => setLine(i, { rate: v ?? 0 })} />
                        </td>
                        <td className="py-1.5 pe-2 text-end">
                          <span className="num block font-semibold text-navy">
                            {fmt(cost)} <span className="text-[11px] font-normal text-ink-500">{cur}</span>
                          </span>
                          <span className="num block text-[10px] text-ink-500">{formula(l, r.quantity)}</span>
                        </td>
                        <td className="py-1.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--color-navy)]"
                            checked={l.markup}
                            onChange={(e) => setLine(i, { markup: e.target.checked })}
                            aria-label={ar ? "يُضاف عليه الربح" : "Add margin"}
                          />
                        </td>
                        <td className="py-1.5 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--color-sun)]"
                            checked={l.show}
                            onChange={(e) => setLine(i, { show: e.target.checked })}
                            aria-label={ar ? "يظهر للعميل" : "Shown to customer"}
                          />
                        </td>
                        <td className="py-1.5 text-end">
                          <button
                            type="button"
                            disabled={build.lines.length === 1}
                            aria-label={ar ? "حذف البند" : "Remove line"}
                            className="rounded-lg p-1.5 text-ink-500 hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                            onClick={() => setBuild((b) => ({ ...b, lines: b.lines.filter((_, j) => j !== i) }))}
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy/15 font-semibold">
                    <td className="pt-2 text-navy" colSpan={3}>
                      {ar ? "إجمالي التكلفة" : "Total cost"}
                    </td>
                    <td className="num pt-2 text-end text-navy">
                      {fmt(r.cost)} <span className="text-[11px] font-normal text-ink-500">{cur}</span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              {ar
                ? "البنود غير الظاهرة تُدمج في سعر القطعة. البنود الظاهرة (مثل الشحن والتصميم) تُعرض للعميل كرسوم منفصلة."
                : "Hidden lines are folded into the unit price; shown lines (shipping, design…) appear to the customer as separate charges."}
            </p>
          </section>

          {/* margin */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-navy">{ar ? "هامش الربح" : "Profit margin"}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <UnitInput
                  label={ar ? "هامش الربح" : "Margin"}
                  unit="%"
                  className="w-24"
                  value={build.marginPercent}
                  onChange={(v) => setBuild((b) => ({ ...b, marginPercent: Math.min(1000, v ?? 0) }))}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.min(100, build.marginPercent)}
                onChange={(e) => setBuild((b) => ({ ...b, marginPercent: Number(e.target.value) }))}
                className="w-48 accent-[var(--color-sun)]"
                aria-label={ar ? "هامش الربح" : "Margin"}
              />
              {[15, 20, 25, 30, 40].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBuild((b) => ({ ...b, marginPercent: m }))}
                  className={cx("num rounded-full border px-2.5 py-1 text-xs", build.marginPercent === m ? "border-navy bg-navy text-white" : "border-navy/15 text-ink-500 hover:border-navy/40")}
                >
                  {m}%
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-paper p-3 text-sm">
              <span className="text-ink-500">{ar ? "احسب الهامش من سعر قطعة مستهدف:" : "Solve the margin for a target unit price:"}</span>
              <UnitInput label={ar ? "سعر القطعة المستهدف" : "Target unit price"} unit={perPc} className="w-40" value={target} onChange={setTarget} placeholder={fmt(r.unitPrice, 3)} />
              <Button size="sm" variant="outline" disabled={!target} onClick={applyTarget}>
                {ar ? "تطبيق" : "Apply"}
              </Button>
            </div>
          </section>

          {/* quantity options */}
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-navy">{ar ? "خيارات الكميات" : "Quantity options"}</h3>
                <p className="text-[11px] text-ink-500">
                  {ar ? "حتى 4 خيارات في العرض نفسه؛ العميل يختار واحدًا عند الاعتماد." : "Up to 4 options in one quotation; the customer picks one when approving."}
                </p>
              </div>
              {build.options.length < 4 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setBuild((b) => {
                      const q = Math.round((b.options.at(-1)!.quantity * 2) / 100) * 100 || b.options.at(-1)!.quantity * 2;
                      return { ...b, options: [...b.options, { quantity: q, discountPercent: tierFor(q), unitPriceOverride: null }] };
                    })
                  }
                >
                  + {ar ? "خيار كمية" : "Option"}
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {build.options.map((o, i) => {
                const x = results[i];
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActive(i)}
                    onKeyDown={(e) => e.key === "Enter" && setActive(i)}
                    className={cx("cursor-pointer rounded-2xl border p-3 transition", i === active ? "border-sun bg-sun-100/40 shadow-sm" : "border-navy/12 hover:border-navy/30")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">
                        {ar ? "خيار" : "Option"} <span className="num">{i + 1}</span>
                        {i === 0 && <span className="ms-1 text-[10px] font-medium text-ink-500">({ar ? "الأساسي" : "primary"})</span>}
                      </span>
                      {i > 0 && (
                        <button
                          type="button"
                          aria-label={ar ? "حذف الخيار" : "Remove option"}
                          className="rounded p-1 text-ink-500 hover:text-danger"
                          onClick={(e) => (e.stopPropagation(), setActive(0), setBuild((b) => ({ ...b, options: b.options.filter((_, j) => j !== i) })))}
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-[1.4fr_1fr] gap-2" onClick={(e) => e.stopPropagation()}>
                      <Field label={ar ? "الكمية" : "Quantity"}>
                        <UnitInput
                          label={ar ? "الكمية" : "Quantity"}
                          unit={ar ? "قطعة" : "pcs"}
                          integer
                          value={o.quantity}
                          onChange={(v) => setOption(i, { quantity: Math.max(1, Math.round(v ?? 1)) })}
                        />
                      </Field>
                      <Field label={ar ? "الخصم" : "Discount"}>
                        <UnitInput label={ar ? "الخصم" : "Discount"} unit="%" value={o.discountPercent} onChange={(v) => setOption(i, { discountPercent: Math.min(100, v ?? 0) })} />
                      </Field>
                    </div>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <Field label={ar ? "تثبيت سعر القطعة (اختياري)" : "Fix unit price (optional)"}>
                        <UnitInput
                          unit={perPc}
                          label="unit price override"
                          value={o.unitPriceOverride}
                          placeholder={ar ? "تلقائي" : "auto"}
                          onChange={(v) => setOption(i, { unitPriceOverride: v && v > 0 ? v : null })}
                        />
                      </Field>
                    </div>
                    <dl className="mt-3 space-y-0.5 border-t border-dashed border-navy/12 pt-2 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{ar ? "سعر القطعة" : "Unit price"}</dt>
                        <dd className="num font-semibold text-navy">
                          {fmt(x.unitPrice, 3)} <span className="text-[10px] font-normal text-ink-500">{perPc}</span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{ar ? "الإجمالي" : "Total"}</dt>
                        <dd className="num font-semibold text-navy">
                          {fmt(x.total)} <span className="text-[10px] font-normal text-ink-500">{cur}</span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-500">{ar ? "الربح" : "Profit"}</dt>
                        <dd className={cx("num font-semibold", x.profitPercent < 0 ? "text-danger" : x.profitPercent < 10 ? "text-warn" : "text-ok")}>{x.profitPercent}%</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>

          {/* commercial terms */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-navy">{ar ? "الشروط التجارية" : "Commercial terms"}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={ar ? "ضريبة القيمة المضافة" : "VAT"}>
                <UnitInput label={ar ? "الضريبة" : "VAT"} unit="%" value={build.taxPercent} onChange={(v) => setBuild((b) => ({ ...b, taxPercent: Math.min(100, v ?? 0) }))} />
              </Field>
              <Field label={ar ? "الدفعة المقدمة" : "Advance payment"}>
                <UnitInput label={ar ? "الدفعة المقدمة" : "Advance"} unit="%" value={build.depositPercent} onChange={(v) => setBuild((b) => ({ ...b, depositPercent: Math.min(100, v ?? 0) }))} />
              </Field>
              <Field label={ar ? "الحد الأدنى لقيمة الطلب" : "Minimum order value"}>
                <UnitInput label={ar ? "الحد الأدنى" : "Minimum order"} unit={cur} value={build.minOrderTotal} onChange={(v) => setBuild((b) => ({ ...b, minOrderTotal: v ?? 0 }))} />
              </Field>
              <Field label={ar ? "صالح حتى" : "Valid until"}>
                <input type="date" className={cx(inputClass, "py-1.5 text-sm")} value={meta.validUntil} onChange={(e) => setMeta({ ...meta, validUntil: e.target.value })} />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Field label={ar ? "مدة التنفيذ" : "Lead time"}>
                <input className={inputClass} maxLength={200} value={meta.leadTime} onChange={(e) => setMeta({ ...meta, leadTime: e.target.value })} />
              </Field>
              <Field label={ar ? "شروط الدفع" : "Payment terms"}>
                <input className={inputClass} maxLength={500} value={build.paymentTerms} onChange={(e) => setBuild((b) => ({ ...b, paymentTerms: e.target.value }))} />
              </Field>
              <Field label={ar ? "رسالة للعميل (تظهر في العرض)" : "Note to the customer (on the quotation)"}>
                <textarea rows={2} className={inputClass} maxLength={2000} value={build.customerNote} onChange={(e) => setBuild((b) => ({ ...b, customerNote: e.target.value }))} />
              </Field>
              <Field label={ar ? "ملاحظة داخلية (لا تظهر للعميل)" : "Internal note (never shown to the customer)"}>
                <textarea rows={2} className={cx(inputClass, "bg-paper")} maxLength={2000} value={build.internalNote} onChange={(e) => setBuild((b) => ({ ...b, internalNote: e.target.value }))} />
              </Field>
            </div>
            <Field label={ar ? "الشروط والأحكام" : "Terms & conditions"} className="mt-3">
              <textarea rows={2} className={inputClass} maxLength={4000} value={meta.terms} onChange={(e) => setMeta({ ...meta, terms: e.target.value })} />
            </Field>
          </section>
        </div>

        {/* the price panel: always in view while pricing */}
        <aside className="border-t border-navy/8 bg-navy p-6 text-white xl:border-t-0 xl:border-s">
          <div className="xl:sticky xl:top-24">
            {build.options.length > 1 && (
              <div className="mb-4 flex gap-1 rounded-full bg-white/10 p-1" role="tablist">
                {build.options.map((o, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === active}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cx("num flex-1 rounded-full px-2 py-1 text-xs", i === active ? "bg-white text-navy" : "text-white/70 hover:text-white")}
                  >
                    {o.quantity.toLocaleString("en")}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-white/60">{ar ? "الإجمالي شامل الضريبة" : "Total incl. VAT"}</p>
            <p className="num mt-1 text-4xl leading-none font-bold">
              {fmt(r.total)} <span className="text-base font-medium text-white/70">{cur}</span>
            </p>
            <p className="num mt-2 text-sm text-white/80">
              {fmt(r.unitPrice, 3)} {cur} × {r.quantity.toLocaleString("en")}
              {r.effectiveUnitPrice !== r.unitPrice && (
                <span className="block text-xs text-white/60">
                  {ar ? `صافي سعر القطعة بعد الخصم والرسوم: ${fmt(r.effectiveUnitPrice, 3)}` : `Net per piece after discount & charges: ${fmt(r.effectiveUnitPrice, 3)}`}
                </span>
              )}
            </p>

            <dl className="mt-5 space-y-1.5 border-t border-white/15 pt-4 text-sm">
              <Row unit={cur} k={ar ? "قيمة المنتج" : "Product"} v={fmt(r.productTotal)} />
              {r.charges.map((c) => (
                <Row key={c.id} unit={cur} k={c.label[locale] || c.label.ar} v={fmt(c.amount)} />
              ))}
              {r.discount > 0 && <Row unit={cur} k={`${ar ? "خصم" : "Discount"} ${r.discountPercent}%`} v={`−${fmt(r.discount)}`} tone="text-emerald-300" />}
              {r.minimumAdjustment > 0 && <Row unit={cur} k={ar ? "رفع للحد الأدنى" : "Minimum order"} v={`+${fmt(r.minimumAdjustment)}`} tone="text-amber-300" />}
              <Row unit={cur} k={ar ? "قبل الضريبة" : "Subtotal"} v={fmt(r.subtotal)} strong />
              <Row unit={cur} k={`${ar ? "الضريبة" : "VAT"} ${build.taxPercent}%`} v={fmt(r.tax)} />
              {build.depositPercent > 0 && <Row unit={cur} k={`${ar ? "الدفعة المقدمة" : "Advance"} ${build.depositPercent}%`} v={fmt(r.deposit)} />}
            </dl>

            {/* profitability: staff only */}
            <div className="mt-5 rounded-2xl bg-white/8 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">{ar ? "الربحية" : "Profitability"}</span>
                <span className="font-semibold">{healthLabel}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div className={cx("h-full rounded-full transition-all", healthStyle)} style={{ width: `${Math.max(3, Math.min(100, r.profitPercent * 2))}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <dt className="text-white/60">{ar ? "التكلفة" : "Cost"}</dt>
                  <dd className="num mt-0.5 font-semibold">{fmt(r.cost, 0)}</dd>
                </div>
                <div>
                  <dt className="text-white/60">{ar ? "الربح" : "Profit"}</dt>
                  <dd className={cx("num mt-0.5 font-semibold", r.profit < 0 && "text-red-300")}>{fmt(r.profit, 0)}</dd>
                </div>
                <div>
                  <dt className="text-white/60">{ar ? "نسبة الربح" : "Margin"}</dt>
                  <dd className="num mt-0.5 font-semibold">{r.profitPercent}%</dd>
                </div>
              </dl>
            </div>

            {issues.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-amber-200">
                {issues.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            )}
            {state.error && (
              <Alert tone="danger" className="mt-4">
                {state.error}
              </Alert>
            )}
            {state.ok && (
              <Alert tone="ok" className="mt-4">
                {state.ok}
              </Alert>
            )}

            <div className="mt-5 grid gap-2">
              {p.canSend && (
                <Button variant="accent" disabled={!!state.busy || issues.length > 0} onClick={() => submit(true)}>
                  {state.busy === "send" && <Spinner />}
                  {ar ? "إرسال العرض للعميل" : "Send to customer"}
                </Button>
              )}
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" disabled={!!state.busy || issues.length > 0} onClick={() => submit(false)}>
                {state.busy === "save" && <Spinner />}
                {ar ? "حفظ كمسودة" : "Save draft"}
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-white/50">
              {ar ? "تُعاد كل الحسابات على الخادم عند الحفظ؛ لا يُعتمد أي رقم من المتصفح." : "Every figure is recomputed on the server; nothing is trusted from the browser."}
            </p>
          </div>
        </aside>
      </div>
    </Card>
  );
}

function Row({ k, v, strong, tone, unit }: { k: string; v: string; strong?: boolean; tone?: string; unit: string }) {
  return (
    <div className={cx("flex justify-between gap-3", strong && "border-t border-white/15 pt-1.5 font-semibold")}>
      <dt className="text-white/70">{k}</dt>
      <dd className={cx("num", tone)}>
        {v} <span className="text-[10px] font-normal text-white/50">{unit}</span>
      </dd>
    </div>
  );
}
