"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Badge, Button, Card, cx, Field, inputClass, Spinner, TrashIcon } from "@/components/ui";
import { UnitInput } from "@/components/admin/UnitInput";
import { COATING_KEYS, ELEMENT_FINISH_KEYS, ELEMENT_FINISH_LABELS, PRINT_KEYS, type PricingConfig, type PrintKey, type QuoteResult } from "@/lib/pricing";
import { COATING_LABELS } from "@/design/document";
import { PRINT_LABELS } from "@/components/studio/panels";

type Named = { code: string; nameAr: string; nameEn: string };
type Props = {
  initial: PricingConfig;
  materials: (Named & { kind: string; isAvailable: boolean })[];
  finishings: (Named & { isAvailable: boolean })[];
  templates: (Named & { engineKey: string; materials: string[] })[];
};

/** Packaging engines as the factory names them (converting cost is set per engine). */
const ENGINE_LABELS: Record<string, { ar: string; en: string }> = {
  rsc: { ar: "كرتون شحن (RSC)", en: "Shipping carton (RSC)" },
  mailer: { ar: "علبة بريدية", en: "Mailer box" },
  ste: { ar: "علبة كرتونية بطرفين", en: "Straight tuck end" },
  rte: { ar: "علبة كرتونية بطرف عكسي", en: "Reverse tuck end" },
  tray: { ar: "صينية / علبة مفتوحة", en: "Tray" },
  drawer: { ar: "علبة درج", en: "Drawer box" },
  telescope: { ar: "علبة غطاء وقاعدة", en: "Lid & base box" },
  pizza: { ar: "علبة بيتزا", en: "Pizza box" },
  clamshell: { ar: "علبة طعام (كلامشيل)", en: "Clamshell" },
  bag: { ar: "أكياس ورقية", en: "Paper bags" },
  cup: { ar: "أكواب ورقية", en: "Paper cups" },
  sheet: { ar: "ملصقات وأوراق مسطحة", en: "Labels & flat sheets" },
  round: { ar: "استيكر دائري", en: "Round stickers" },
};

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={cx("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", on ? "bg-ok" : "bg-navy/20")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "start-[22px]" : "start-0.5")} />
      </button>
      <span>
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
    </label>
  );
}

function Section({ title, hint, aside, children }: { title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">{title}</h2>
          {hint && <p className="mt-1 max-w-2xl text-xs text-ink-500">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

const money = (n: number, cur: string, ar: boolean) => `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ar && cur === "SAR" ? "ر.س" : cur}`;

export function PricingEditor({ initial, materials, finishings, templates }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const L = (x: { nameAr: string; nameEn: string }) => (ar ? x.nameAr : x.nameEn);
  const router = useRouter();
  const [cfg, setCfg] = useState<PricingConfig>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({});
  const dirty = JSON.stringify(cfg) !== saved;
  const set = <K extends keyof PricingConfig>(k: K, v: PricingConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const engineKeys = useMemo(() => [...new Set(templates.map((t) => t.engineKey))], [templates]);
  const cur = ar && cfg.currency === "SAR" ? "ر.س" : cfg.currency;
  const U = {
    pc: ar ? `${cur}/قطعة` : `${cur}/pc`,
    m2: ar ? `${cur}/م²` : `${cur}/m²`,
    order: ar ? `${cur}/طلب` : `${cur}/order`,
    pcFace: ar ? `${cur}/قطعة/وجه` : `${cur}/pc/face`,
    face: ar ? `${cur}/وجه` : `${cur}/face`,
    pcs: ar ? "قطعة" : "pcs",
    days: ar ? "يوم" : "days",
    cur,
  };

  // optional price maps: an empty field removes the entry, so it counts as "not priced" (manual pricing)
  const setMapEntry = <K extends "materials" | "finishings" | "engines">(k: K, code: string, v: PricingConfig[K][string] | null) =>
    setCfg((c) => {
      const next = { ...c[k] } as Record<string, unknown>;
      if (v === null) delete next[code];
      else next[code] = v;
      return { ...c, [k]: next };
    });

  const coverage = {
    materials: materials.filter((m) => m.isAvailable && cfg.materials[m.code]).length,
    materialsAll: materials.filter((m) => m.isAvailable).length,
    engines: engineKeys.filter((k) => cfg.engines[k]).length,
    finishings: finishings.filter((f) => f.isAvailable && cfg.finishings[f.code]).length,
    finishingsAll: finishings.filter((f) => f.isAvailable).length,
  };

  async function save() {
    setState({ busy: true });
    const res = await fetch("/api/admin/pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok)
      return setState({
        error:
          j.error === "invalid_quantity_range"
            ? ar
              ? "الحد الأدنى للكمية أكبر من الحد الأقصى."
              : "Minimum quantity exceeds the maximum."
            : j.error === "duplicate_tier"
              ? ar
                ? "يوجد خصمان لنفس الكمية."
                : "Two discounts share the same quantity."
              : `${ar ? "تعذّر الحفظ" : "Could not save"} (${j.error ?? res.status})`,
      });
    setSaved(JSON.stringify(cfg));
    setState({ ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-24">
      {/* status */}
      <Card className={cx("p-6", cfg.enabled ? "border-ok/30" : "")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <Toggle
              on={cfg.enabled}
              onChange={(v) => set("enabled", v)}
              label={ar ? "تفعيل التسعير التلقائي" : "Enable automatic pricing"}
              hint={ar ? "عند الإيقاف تُسعَّر كل الطلبات يدويًا من فريق المبيعات كما هو الآن." : "When off, every request is priced manually by sales, as today."}
            />
            <Toggle
              on={cfg.showEstimate}
              onChange={(v) => set("showEstimate", v)}
              label={ar ? "إظهار السعر التقديري للعميل أثناء الطلب" : "Show the customer a live estimate while ordering"}
              hint={ar ? "يتغير السعر أمام العميل مباشرة عند تغيير الكمية أو الخامة أو التشطيبات." : "The price updates as the customer changes quantity, material or finishing."}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-navy">{ar ? "عند استلام طلب يمكن تسعيره" : "When a request can be priced"}</legend>
            <div className="grid gap-2">
              {(
                [
                  [
                    "auto-send",
                    ar ? "إرسال عرض السعر للعميل فورًا" : "Send the quotation to the customer instantly",
                    ar ? "يصل العرض للعميل خلال ثوانٍ ويمكنه اعتماده مباشرة." : "The customer receives it within seconds and can approve it.",
                  ],
                  [
                    "review",
                    ar ? "تجهيز سعر مقترح للمراجعة" : "Prepare a suggested price for review",
                    ar ? "يظهر السعر المقترح للمبيعات في الطلب، ويُرسل بضغطة بعد المراجعة." : "Sales see the suggested price on the request and send it after review.",
                  ],
                ] as const
              ).map(([k, title, hint]) => (
                <label key={k} className={cx("cursor-pointer rounded-xl border p-3", cfg.mode === k ? "border-navy bg-navy/5" : "border-navy/12")}>
                  <input type="radio" className="sr-only" checked={cfg.mode === k} onChange={() => set("mode", k)} />
                  <span className="block text-sm font-semibold text-navy">{title}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-dashed border-navy/12 pt-4 text-xs">
          <Badge tone={coverage.materials ? "ok" : "warn"}>
            {ar ? "الخامات المسعّرة" : "Priced materials"}{" "}
            <span className="num">
              {coverage.materials}/{coverage.materialsAll}
            </span>
          </Badge>
          <Badge tone={coverage.engines === engineKeys.length ? "ok" : "warn"}>
            {ar ? "أنواع التصنيع" : "Converting types"}{" "}
            <span className="num">
              {coverage.engines}/{engineKeys.length}
            </span>
          </Badge>
          <Badge tone="neutral">
            {ar ? "التشطيبات" : "Finishings"}{" "}
            <span className="num">
              {coverage.finishings}/{coverage.finishingsAll}
            </span>
          </Badge>
        </div>
        {cfg.enabled && (coverage.materials === 0 || coverage.engines === 0) && (
          <Alert tone="warn" className="mt-4">
            {ar ? "التسعير مفعّل لكن لا توجد أسعار كافية بعد؛ الطلبات غير المغطاة ستُسعَّر يدويًا." : "Pricing is on but prices are missing; uncovered requests fall back to manual pricing."}
          </Alert>
        )}
      </Card>

      {/* general */}
      <Section title={ar ? "الإعدادات العامة" : "General"} hint={ar ? "تُطبَّق على كل العروض التلقائية." : "Applied to every automatic quotation."}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={ar ? "هامش الربح %" : "Profit margin %"}>
            <UnitInput unit="%" label="margin" value={cfg.marginPercent} onChange={(v) => set("marginPercent", v ?? 0)} />
          </Field>
          <Field label={ar ? "ضريبة القيمة المضافة %" : "VAT %"}>
            <UnitInput unit="%" label="tax" value={cfg.taxPercent} onChange={(v) => set("taxPercent", Math.min(100, v ?? 0))} />
          </Field>
          <Field label={ar ? "نسبة الهالك في الفرخ %" : "Sheet waste %"} hint={ar ? "تُضاف لمساحة فرخ القص" : "Added to the cutting-sheet area"}>
            <UnitInput unit="%" label="waste" value={cfg.wastePercent} onChange={(v) => set("wastePercent", Math.min(100, v ?? 0))} />
          </Field>
          <Field label={ar ? "العملة" : "Currency"}>
            <input
              dir="ltr"
              maxLength={3}
              className={cx(inputClass, "num px-2 py-1.5 text-sm uppercase")}
              value={cfg.currency}
              onChange={(e) => set("currency", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            />
          </Field>
          <Field label={ar ? "الحد الأدنى لقيمة الطلب" : "Minimum order value"} hint={ar ? "قبل الضريبة" : "Before tax"}>
            <UnitInput unit={U.cur} label="min order" value={cfg.minOrderTotal} onChange={(v) => set("minOrderTotal", v ?? 0)} />
          </Field>
          <Field label={ar ? "أقل كمية للتسعير التلقائي" : "Minimum automatic quantity"}>
            <UnitInput unit={U.pcs} integer label="min qty" value={cfg.minQuantity} onChange={(v) => set("minQuantity", Math.max(1, Math.round(v ?? 1)))} />
          </Field>
          <Field label={ar ? "أكبر كمية للتسعير التلقائي" : "Maximum automatic quantity"} hint={ar ? "الأكبر منها يُسعَّر يدويًا" : "Larger orders are priced manually"}>
            <UnitInput unit={U.pcs} integer label="max qty" value={cfg.maxAutoQuantity} onChange={(v) => set("maxAutoQuantity", Math.max(1, Math.round(v ?? 1)))} />
          </Field>
          <Field label={ar ? "صلاحية العرض (أيام)" : "Offer validity (days)"}>
            <UnitInput unit={U.days} integer label="validity" value={cfg.validityDays} onChange={(v) => set("validityDays", Math.min(365, Math.max(1, Math.round(v ?? 14))))} />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_3fr]">
          <Field label={ar ? "الدفعة المقدمة %" : "Advance payment %"}>
            <UnitInput unit="%" label="deposit" value={cfg.depositPercent} onChange={(v) => set("depositPercent", Math.min(100, v ?? 0))} />
          </Field>
          <Field label={ar ? "شروط الدفع" : "Payment terms"}>
            <input
              className={inputClass}
              maxLength={500}
              placeholder={ar ? "مثال: 50% مقدمًا والباقي قبل التسليم" : "e.g. 50% in advance, balance before delivery"}
              value={cfg.paymentTerms}
              onChange={(e) => set("paymentTerms", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Field label={ar ? "مدة التنفيذ" : "Lead time"}>
            <input
              className={inputClass}
              maxLength={200}
              placeholder={ar ? "مثال: 10–14 يوم عمل بعد اعتماد التصميم" : "e.g. 10–14 working days after artwork approval"}
              value={cfg.leadTime}
              onChange={(e) => set("leadTime", e.target.value)}
            />
          </Field>
          <Field label={ar ? "الشروط والأحكام في العرض" : "Terms shown on the quotation"}>
            <textarea rows={2} className={inputClass} maxLength={4000} value={cfg.terms} onChange={(e) => set("terms", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* materials */}
      <Section
        title={ar ? "أسعار الخامات" : "Material prices"}
        hint={ar ? "السعر لكل متر مربع من فرخ القص. اترك الحقل فارغًا إن لم تُرِد تسعير الخامة تلقائيًا." : "Price per m² of cutting sheet. Leave empty to keep a material on manual pricing."}
      >
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {materials.map((m) => (
            <div key={m.code} className={cx("flex items-center justify-between gap-3 border-b border-dashed border-navy/10 py-2", !m.isAvailable && "opacity-50")}>
              <span className="min-w-0 text-sm text-navy">
                {L(m)}
                {!m.isAvailable && <span className="ms-2 text-xs text-ink-500">({ar ? "غير متاحة" : "unavailable"})</span>}
              </span>
              <span className="flex items-center gap-2">
                <UnitInput unit={U.m2} label={`${m.code} per m2`} className="w-36" value={cfg.materials[m.code]} onChange={(v) => setMapEntry("materials", m.code, v)} />
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* printing and coating */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={ar ? "الطباعة" : "Printing"} hint={ar ? "سعر المتر المربع المطبوع + تكلفة تجهيز البليتات لكل طلب." : "Per printed m² plus plate / make-ready setup per order."}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-500">
                <th className="pb-2 text-start font-medium">{ar ? "النوع" : "Option"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "سعر المتر²" : "Per m²"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "تجهيز للطلب" : "Setup / order"}</th>
              </tr>
            </thead>
            <tbody>
              {PRINT_KEYS.filter((k) => k !== "none").map((k) => (
                <tr key={k} className="border-t border-dashed border-navy/10">
                  <td className="py-2 text-navy">{PRINT_LABELS[k][locale]}</td>
                  <td className="py-2 pe-2">
                    <UnitInput unit={U.m2} label={`${k} per m2`} value={cfg.printing[k].perM2} onChange={(v) => set("printing", { ...cfg.printing, [k]: { ...cfg.printing[k], perM2: v ?? 0 } })} />
                  </td>
                  <td className="py-2">
                    <UnitInput unit={U.order} label={`${k} setup`} value={cfg.printing[k].setup} onChange={(v) => set("printing", { ...cfg.printing, [k]: { ...cfg.printing[k], setup: v ?? 0 } })} />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-dashed border-navy/10">
                <td className="py-2 text-navy">{ar ? "طباعة لون داخلي" : "Inside colour print"}</td>
                <td className="py-2 pe-2">
                  <UnitInput unit={U.m2} label="inside per m2" value={cfg.insidePerM2} onChange={(v) => set("insidePerM2", v ?? 0)} />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-500">
            {ar
              ? "إن لم يحدد العميل نوع الطباعة وكان في تصميمه رسم أو ألوان تُحتسب «طباعة كاملة الألوان»."
              : "If the customer chose no print option but the design has artwork or colours, full colour is used."}
          </p>
        </Section>

        <Section
          title={ar ? "السلوفان والورنيش والتشطيبات على الرسم" : "Coating & artwork finishes"}
          hint={ar ? "السلوفان لكل م². البصمة والكفراج واليو في: لكل قطعة لكل وجه + تجهيز الكليشيه لكل وجه." : "Coating per m². Foil, emboss and spot UV: per unit per face + block setup per face."}
        >
          <div className="grid grid-cols-3 gap-2">
            {COATING_KEYS.map((k) => (
              <Field key={k} label={COATING_LABELS[k][locale]}>
                <UnitInput unit={U.m2} label={`${k} coating`} value={cfg.coatings[k]} onChange={(v) => set("coatings", { ...cfg.coatings, [k]: v ?? 0 })} />
              </Field>
            ))}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-500">
                <th className="pb-2 text-start font-medium">{ar ? "التشطيب" : "Finish"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "لكل قطعة/وجه" : "Per unit/face"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "تجهيز/وجه" : "Setup/face"}</th>
              </tr>
            </thead>
            <tbody>
              {ELEMENT_FINISH_KEYS.map((k) => (
                <tr key={k} className="border-t border-dashed border-navy/10">
                  <td className="py-2 text-navy">{ELEMENT_FINISH_LABELS[k][locale]}</td>
                  <td className="py-2 pe-2">
                    <UnitInput
                      unit={U.pcFace}
                      label={`${k} per face`}
                      value={cfg.elementFinishes[k].perFace}
                      onChange={(v) => set("elementFinishes", { ...cfg.elementFinishes, [k]: { ...cfg.elementFinishes[k], perFace: v ?? 0 } })}
                    />
                  </td>
                  <td className="py-2">
                    <UnitInput
                      unit={U.face}
                      label={`${k} setup`}
                      value={cfg.elementFinishes[k].setup}
                      onChange={(v) => set("elementFinishes", { ...cfg.elementFinishes, [k]: { ...cfg.elementFinishes[k], setup: v ?? 0 } })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {/* finishing options */}
      <Section
        title={ar ? "خيارات التشطيب الإضافية" : "Finishing options"}
        hint={
          ar
            ? "لكل خيار: سعر للقطعة و/أو للمتر المربع + تجهيز للطلب. الخيار بدون أي سعر يجعل الطلب يُسعَّر يدويًا إن اختاره العميل."
            : "Per unit and/or per m² plus setup per order. An option with no price sends requests that use it to manual pricing."
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-xs text-ink-500">
                <th className="pb-2 text-start font-medium">{ar ? "الخيار" : "Option"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "لكل قطعة" : "Per unit"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "سعر المتر²" : "Per m²"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "تجهيز للطلب" : "Setup / order"}</th>
              </tr>
            </thead>
            <tbody>
              {finishings.map((f) => {
                const p = cfg.finishings[f.code];
                const upd = (k: "perUnit" | "perM2" | "setup", v: number | null) => {
                  const next = { perUnit: p?.perUnit ?? 0, perM2: p?.perM2 ?? 0, setup: p?.setup ?? 0, [k]: v ?? 0 };
                  setMapEntry("finishings", f.code, next.perUnit || next.perM2 || next.setup ? next : null);
                };
                return (
                  <tr key={f.code} className={cx("border-t border-dashed border-navy/10", !f.isAvailable && "opacity-50")}>
                    <td className="py-2 text-navy">
                      {L(f)} {!p && <span className="ms-1 text-xs text-ink-500">({ar ? "يدوي" : "manual"})</span>}
                    </td>
                    {(["perUnit", "perM2", "setup"] as const).map((k) => (
                      <td key={k} className="py-2 pe-2">
                        <UnitInput unit={k === "perUnit" ? U.pc : k === "perM2" ? U.m2 : U.order} label={`${f.code} ${k}`} value={p ? p[k] || null : null} onChange={(v) => upd(k, v)} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* converting + tiers */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section
          title={ar ? "التصنيع (القص والتكسير واللصق)" : "Converting (cutting, creasing, gluing)"}
          hint={
            ar
              ? "لكل نوع عبوة: تكلفة للقطعة + تجهيز فورمة القص للطلب. النوع بدون سعر يُسعَّر يدويًا."
              : "Per packaging type: per unit + cutting-die setup per order. Types without a price stay manual."
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-500">
                <th className="pb-2 text-start font-medium">{ar ? "النوع" : "Type"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "لكل قطعة" : "Per unit"}</th>
                <th className="pb-2 text-start font-medium">{ar ? "تجهيز الفورمة" : "Die setup"}</th>
              </tr>
            </thead>
            <tbody>
              {engineKeys.map((k) => {
                const p = cfg.engines[k];
                const examples = templates
                  .filter((t) => t.engineKey === k)
                  .slice(0, 2)
                  .map(L)
                  .join("، ");
                const upd = (field: "perUnit" | "setup", v: number | null) => {
                  const next = { perUnit: p?.perUnit ?? 0, setup: p?.setup ?? 0, [field]: v ?? 0 };
                  setMapEntry("engines", k, v === null && !(field === "perUnit" ? next.setup : next.perUnit) ? null : next);
                };
                return (
                  <tr key={k} className="border-t border-dashed border-navy/10">
                    <td className="py-2">
                      <span className="block text-navy">{ENGINE_LABELS[k]?.[locale] ?? k}</span>
                      <span className="block text-[11px] text-ink-500">{examples}</span>
                    </td>
                    <td className="py-2 pe-2">
                      <UnitInput unit={U.pc} label={`${k} per unit`} value={p?.perUnit ?? null} onChange={(v) => upd("perUnit", v)} />
                    </td>
                    <td className="py-2">
                      <UnitInput unit={U.order} label={`${k} setup`} value={p?.setup ?? null} onChange={(v) => upd("setup", v)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section
          title={ar ? "خصومات الكميات" : "Quantity discounts"}
          hint={ar ? "يُطبَّق أعلى خصم تبلغه الكمية على السعر قبل الضريبة." : "The highest tier the quantity reaches applies to the price before tax."}
          aside={
            cfg.tiers.length < 12 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => set("tiers", [...cfg.tiers, { minQty: (cfg.tiers.at(-1)?.minQty ?? 500) * 2, discountPercent: (cfg.tiers.at(-1)?.discountPercent ?? 0) + 5 }])}
              >
                + {ar ? "شريحة" : "Tier"}
              </Button>
            )
          }
        >
          {cfg.tiers.length === 0 ? (
            <p className="text-sm text-ink-500">{ar ? "لا توجد خصومات." : "No discounts."}</p>
          ) : (
            <ul className="space-y-2">
              {cfg.tiers.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-ink-500">{ar ? "من" : "From"}</span>
                  <UnitInput
                    unit={U.pcs}
                    integer
                    label="tier quantity"
                    className="w-32"
                    value={t.minQty}
                    onChange={(v) =>
                      set(
                        "tiers",
                        cfg.tiers.map((x, j) => (j === i ? { ...x, minQty: Math.max(1, Math.round(v ?? 1)) } : x)),
                      )
                    }
                  />
                  <span className="text-ink-500">{ar ? "← خصم" : "→ discount"}</span>
                  <UnitInput
                    unit="%"
                    label="tier discount"
                    className="w-20"
                    value={t.discountPercent}
                    onChange={(v) =>
                      set(
                        "tiers",
                        cfg.tiers.map((x, j) => (j === i ? { ...x, discountPercent: Math.min(100, v ?? 0) } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={ar ? "حذف" : "Remove"}
                    className="ms-auto rounded-lg p-1.5 text-ink-500 hover:bg-danger/10 hover:text-danger"
                    onClick={() =>
                      set(
                        "tiers",
                        cfg.tiers.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Simulator cfg={cfg} templates={templates} materials={materials} finishings={finishings} />

      {/* save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-navy/10 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button variant="accent" disabled={!dirty || state.busy} onClick={save}>
          {state.busy && <Spinner />}
          {ar ? "حفظ قائمة الأسعار" : "Save price list"}
        </Button>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={() => setCfg(JSON.parse(saved))}>
            {ar ? "تراجع عن التعديلات" : "Discard changes"}
          </Button>
        )}
        <span className="text-sm text-ink-500" role="status">
          {state.error ? (
            <span className="text-danger">{state.error}</span>
          ) : dirty ? (
            ar ? (
              "تعديلات غير محفوظة"
            ) : (
              "Unsaved changes"
            )
          ) : state.ok ? (
            ar ? (
              "تم الحفظ — تسري على الطلبات الجديدة"
            ) : (
              "Saved — applies to new requests"
            )
          ) : (
            ""
          )}
        </span>
      </div>
    </div>
  );
}

/** Try the on-screen (unsaved) price list on any template. */
function Simulator({ cfg, templates, materials, finishings }: { cfg: PricingConfig; templates: Props["templates"]; materials: Props["materials"]; finishings: Props["finishings"] }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const L = (x: { nameAr: string; nameEn: string }) => (ar ? x.nameAr : x.nameEn);
  const [s, setS] = useState({
    templateCode: templates[0]?.code ?? "",
    materialCode: templates[0]?.materials[0] ?? "",
    printOption: "4c" as PrintKey,
    quantity: 1000,
    coating: null as (typeof COATING_KEYS)[number] | null,
    insidePrint: false,
    elementFinishes: [] as string[],
    finishingCodes: [] as string[],
  });
  const [res, setRes] = useState<{ result: QuoteResult; sheetMm: { w: number; h: number } } | null>(null);
  const [busy, setBusy] = useState(false);
  const tpl = templates.find((t) => t.code === s.templateCode);

  useEffect(() => {
    if (!s.templateCode || !s.quantity) return;
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/admin/pricing/simulate", {
          method: "POST",
          signal: ctl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: cfg, ...s, materialCode: s.materialCode || null }),
        });
        if (r.ok) setRes(await r.json());
      } catch {
        /* superseded */
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [cfg, s]);

  const chip = (on: boolean) => cx("cursor-pointer rounded-full border px-3 py-1 text-xs", on ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-ink-500");
  const r = res?.result;
  return (
    <Section
      title={ar ? "جرّب السعر" : "Try a price"}
      hint={ar ? "يحسب بالأسعار المعروضة على الشاشة حتى قبل الحفظ، بالمقاس الافتراضي للقالب." : "Uses the prices on screen, even before saving, at the template's default size."}
      aside={busy ? <Spinner /> : null}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={ar ? "المنتج" : "Product"}>
              <select
                className={inputClass}
                value={s.templateCode}
                onChange={(e) => setS({ ...s, templateCode: e.target.value, materialCode: templates.find((t) => t.code === e.target.value)?.materials[0] ?? "" })}
              >
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {L(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={ar ? "الخامة" : "Material"}>
              <select className={inputClass} value={s.materialCode} onChange={(e) => setS({ ...s, materialCode: e.target.value })}>
                {materials
                  .filter((m) => tpl?.materials.includes(m.code))
                  .map((m) => (
                    <option key={m.code} value={m.code}>
                      {L(m)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={ar ? "الكمية" : "Quantity"}>
              <UnitInput unit={ar ? "قطعة" : "pcs"} integer label="quantity" value={s.quantity} onChange={(v) => setS({ ...s, quantity: Math.max(1, Math.round(v ?? 1)) })} />
            </Field>
            <Field label={ar ? "الطباعة" : "Printing"}>
              <select className={inputClass} value={s.printOption} onChange={(e) => setS({ ...s, printOption: e.target.value as PrintKey })}>
                {PRINT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {PRINT_LABELS[k][locale]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {COATING_KEYS.map((k) => (
              <button key={k} type="button" className={chip(s.coating === k)} onClick={() => setS({ ...s, coating: s.coating === k ? null : k })}>
                {COATING_LABELS[k][locale]}
              </button>
            ))}
            <button type="button" className={chip(s.insidePrint)} onClick={() => setS({ ...s, insidePrint: !s.insidePrint })}>
              {ar ? "لون داخلي" : "Inside colour"}
            </button>
            {ELEMENT_FINISH_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={chip(s.elementFinishes.includes(k))}
                onClick={() => setS({ ...s, elementFinishes: s.elementFinishes.includes(k) ? s.elementFinishes.filter((x) => x !== k) : [...s.elementFinishes, k] })}
              >
                {ELEMENT_FINISH_LABELS[k][locale]}
              </button>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-navy">{ar ? "تشطيبات إضافية" : "Extra finishing"}</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {finishings.map((f) => (
                <button
                  key={f.code}
                  type="button"
                  className={chip(s.finishingCodes.includes(f.code))}
                  onClick={() => setS({ ...s, finishingCodes: s.finishingCodes.includes(f.code) ? s.finishingCodes.filter((x) => x !== f.code) : [...s.finishingCodes, f.code] })}
                >
                  {L(f)}
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="rounded-2xl bg-paper p-5">
          {!r ? (
            <p className="text-sm text-ink-500">—</p>
          ) : !r.ok ? (
            <div>
              <p className="text-sm font-semibold text-navy">{ar ? "سيُسعَّر هذا الطلب يدويًا:" : "This request would be priced manually:"}</p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ink-500">
                {r.reasons.map((x) => (
                  <li key={x.code}>{x[locale]}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-xs text-ink-500">
                {ar ? "فرخ القص" : "Cutting sheet"}{" "}
                <span className="num">
                  {res!.sheetMm.w} × {res!.sheetMm.h} mm
                </span>
              </p>
              <dl className="mt-3 divide-y divide-dashed divide-navy/10">
                {r.lines.map((l) => (
                  <div key={l.key} className="flex justify-between gap-3 py-1.5">
                    <dt className="text-ink-500">{l.label[locale]}</dt>
                    <dd className="num text-navy">{money(l.amount, r.currency, ar)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 py-1.5 font-semibold">
                  <dt>{ar ? "التكلفة" : "Cost"}</dt>
                  <dd className="num">{money(r.cost, r.currency, ar)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-1.5">
                  <dt className="text-ink-500">
                    {ar ? "هامش الربح" : "Margin"} <span className="num">({cfg.marginPercent}%)</span>
                  </dt>
                  <dd className="num text-navy">+{money(r.margin, r.currency, ar)}</dd>
                </div>
                {r.discount > 0 && (
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-ink-500">
                      {ar ? "خصم الكمية" : "Quantity discount"} <span className="num">({r.discountPercent}%)</span>
                    </dt>
                    <dd className="num text-ok">−{money(r.discount, r.currency, ar)}</dd>
                  </div>
                )}
                {r.minOrderApplied && <p className="py-1.5 text-xs text-warn">{ar ? "طُبّق الحد الأدنى لقيمة الطلب." : "Minimum order value applied."}</p>}
              </dl>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center">
                <div>
                  <p className="text-[11px] text-ink-500">{ar ? "سعر القطعة" : "Unit price"}</p>
                  <p className="num font-bold text-navy">{r.unitPrice.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500">{ar ? "قبل الضريبة" : "Before tax"}</p>
                  <p className="num font-bold text-navy">{money(r.subtotal, r.currency, ar)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-500">
                    {ar ? "الإجمالي" : "Total"} <span className="num">(+{r.taxPercent}%)</span>
                  </p>
                  <p className="num font-bold text-sun-600">{money(r.total, r.currency, ar)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
