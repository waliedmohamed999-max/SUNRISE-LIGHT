"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/dictionaries";
import type { Catalog } from "@/lib/catalog";
import type { DesignDocument } from "@/design/document";
import { canvasToBlob } from "@/design/render";
import { DesignPreview, type DesignPreviewHandle } from "@/components/studio/DesignPreview";
import { PRINT_LABELS } from "@/components/studio/panels";
import { SURFACE_KEYS } from "@/packaging/types";
import { Alert, Button, Card, CheckIcon, cx, Field, inputClass, LinkButton, Spinner } from "@/components/ui";

interface Props {
  design: { id: string; name: string; document: DesignDocument; engineKey: string; templateNameAr: string; templateNameEn: string };
  catalog: Catalog;
  prefill: { name: string; email: string; phone: string; company: string; city: string; address: string };
}

export function QuoteFlow({ design, catalog, prefill }: Props) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const doc = design.document;
  const template = catalog.templates.find((x) => x.code === doc.templateCode);
  const materials = catalog.materials.filter((m) => template?.materialCodes.includes(m.code));
  const preview = useRef<DesignPreviewHandle>(null);

  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState({
    quantity: doc.quantity ? String(doc.quantity) : "",
    printing: doc.printOption ? PRINT_LABELS[doc.printOption]?.[locale] ?? "" : "",
    materialCode: doc.materialCode ?? materials[0]?.code ?? "",
    finishingCodes: doc.finishingCodes,
    city: prefill.city,
    notes: "",
  });
  const [cust, setCust] = useState({ name: prefill.name, company: prefill.company, phone: prefill.phone, email: prefill.email, location: prefill.address });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<null | "capture" | "send">(null);
  const [result, setResult] = useState<{ id: string; rfqNumber: string } | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const material = catalog.materials.find((m) => m.code === spec.materialCode);
  const finishings = catalog.finishings.filter((f) => material?.finishingCodes.includes(f.code));
  const colors = [...new Set(SURFACE_KEYS.map((k) => doc.surfaces[k].background).filter(Boolean))] as string[];
  const req = t.common.required;

  function validateSpec() {
    const e: Record<string, string> = {};
    const q = parseInt(spec.quantity, 10);
    if (!Number.isFinite(q) || q < 1) e.quantity = req;
    if (spec.city.trim().length < 2) e.city = req;
    setErrors(e);
    return !Object.keys(e).length;
  }
  function validateCust() {
    const e: Record<string, string> = {};
    if (cust.name.trim().length < 2) e.name = req;
    if (!/^[+\d\s()-]{6,30}$/.test(cust.phone.trim())) e.phone = req;
    if (!/^\S+@\S+\.\S+$/.test(cust.email.trim())) e.email = req;
    if (cust.location.trim().length < 3) e.location = req;
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    setFatal(null);
    setSubmitting("capture");
    let previewAssetId: string | null = null;
    try {
      const iso = preview.current?.isoCanvas();
      if (iso) {
        const fd = new FormData();
        fd.append("file", await canvasToBlob(iso), "rfq-preview.png");
        fd.append("kind", "PREVIEW");
        const up = await fetch("/api/assets", { method: "POST", body: fd });
        if (up.ok) previewAssetId = (await up.json()).asset.id;
      }
    } catch {
      /* the request is still valid without a preview image */
    }
    setSubmitting("send");
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: design.id,
          quantity: parseInt(spec.quantity, 10),
          printingRequirements: spec.printing,
          materialCode: spec.materialCode || null,
          finishingCodes: spec.finishingCodes.filter((c) => finishings.some((f) => f.code === c)),
          deliveryCity: spec.city,
          deliveryLocation: cust.location,
          notes: spec.notes || undefined,
          contactName: cust.name,
          companyName: cust.company || undefined,
          phone: cust.phone,
          email: cust.email,
          previewAssetId,
          locale,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFatal(j.error === "invalid_dimensions" ? `${t.common.error} (${j.message})` : j.error === "rate_limited" ? (ar ? "محاولات كثيرة، حاول لاحقاً." : "Too many attempts, try later.") : t.common.error);
        return;
      }
      setResult(j.request);
      setStep(3);
    } catch {
      setFatal(t.common.error);
    } finally {
      setSubmitting(null);
    }
  }

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-end font-medium text-navy">{v}</dd>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-navy/8 bg-paper">
          <DesignPreview ref={preview} doc={doc} engineKey={design.engineKey} materialColor={material?.colorHex ?? "#C9A06B"} className="absolute inset-0" fallback={<div className="grid h-full place-items-center text-sm text-ink-500">{t.studio.webglFallback}</div>} />
        </div>
        <p className="text-center text-sm font-semibold text-navy">{design.name}</p>
      </div>

      <div>
        <ol className="mb-8 flex flex-wrap gap-2" aria-label={t.quote.title}>
          {t.quote.steps.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={cx("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", i === step ? "bg-navy text-white" : i < step ? "bg-ok/10 text-ok" : "bg-paper-200 text-ink-500")}>
              <span className="num grid size-5 place-items-center rounded-full bg-white/20">{i < step ? <CheckIcon className="size-3.5" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <Card className="p-6 sm:p-8">
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy">{t.quote.steps[0]}</h2>
              <dl className="mt-5 divide-y divide-navy/8">
                <Row k={t.quote.packagingType} v={ar ? design.templateNameAr : design.templateNameEn} />
                <Row k={t.quote.dims} v={<span className="num">{`${doc.dimensions.length} × ${doc.dimensions.width} × ${doc.dimensions.height} mm`}</span>} />
                <Row k={t.quote.material} v={material ? (ar ? material.nameAr : material.nameEn) : "—"} />
                <Row
                  k={t.quote.colors}
                  v={
                    colors.length ? (
                      <span className="flex justify-end gap-1">
                        {colors.map((c) => (
                          <span key={c} title={c} className="size-4 rounded border border-black/10" style={{ background: c }} />
                        ))}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row k={t.quote.finishing} v={doc.finishingCodes.map((c) => catalog.finishings.find((f) => f.code === c)).filter(Boolean).map((f) => (ar ? f!.nameAr : f!.nameEn)).join("، ") || "—"} />
              </dl>
              <Alert className="mt-5">{t.quote.reviewNote}</Alert>
              {template && !template.version.dielineValidated && <p className="mt-3 text-xs leading-relaxed text-ink-500">{t.studio.approxDieline}</p>}
              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <LinkButton href={`/${locale}/studio?design=${design.id}`} variant="ghost">
                  {t.common.edit}
                </LinkButton>
                <Button onClick={() => setStep(1)}>{t.common.next}</Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (validateSpec()) setStep(2);
              }}
            >
              <h2 className="text-xl font-bold text-navy">{t.quote.steps[1]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.quote.quantity} error={errors.quantity}>
                  <input type="text" min={1} inputMode="numeric" className={cx(inputClass, "num")} value={spec.quantity} onChange={(e) => setSpec({ ...spec, quantity: e.target.value })} required />
                </Field>
                <Field label={t.quote.material}>
                  <select className={inputClass} value={spec.materialCode} onChange={(e) => setSpec({ ...spec, materialCode: e.target.value })}>
                    {materials.map((m) => (
                      <option key={m.code} value={m.code}>
                        {ar ? m.nameAr : m.nameEn}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t.quote.printing}>
                <textarea rows={2} className={inputClass} placeholder={t.quote.printingPh} value={spec.printing} onChange={(e) => setSpec({ ...spec, printing: e.target.value })} maxLength={1000} />
              </Field>
              {finishings.length > 0 && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">{t.quote.finishing}</legend>
                  <div className="flex flex-wrap gap-2">
                    {finishings.map((f) => {
                      const on = spec.finishingCodes.includes(f.code);
                      return (
                        <label key={f.code} className={cx("cursor-pointer rounded-full border px-3 py-1.5 text-sm", on ? "border-navy bg-navy text-white" : "border-navy/15 bg-white")}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => setSpec({ ...spec, finishingCodes: on ? spec.finishingCodes.filter((c) => c !== f.code) : [...spec.finishingCodes, f.code] })}
                          />
                          {ar ? f.nameAr : f.nameEn}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              <Field label={t.quote.city} error={errors.city}>
                <input className={inputClass} value={spec.city} onChange={(e) => setSpec({ ...spec, city: e.target.value })} required />
              </Field>
              <Field label={`${t.quote.notes} (${t.common.optional})`}>
                <textarea rows={3} className={inputClass} value={spec.notes} onChange={(e) => setSpec({ ...spec, notes: e.target.value })} maxLength={2000} />
              </Field>
              <div className="flex justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                  {t.common.back}
                </Button>
                <Button type="submit">{t.common.next}</Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (validateCust()) void submit();
              }}
            >
              <h2 className="text-xl font-bold text-navy">{t.quote.steps[2]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.quote.fullName} error={errors.name}>
                  <input className={inputClass} value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} autoComplete="name" required />
                </Field>
                <Field label={t.quote.company}>
                  <input className={inputClass} value={cust.company} onChange={(e) => setCust({ ...cust, company: e.target.value })} autoComplete="organization" />
                </Field>
                <Field label={t.quote.phone} error={errors.phone}>
                  <input type="tel" dir="ltr" className={inputClass} value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} autoComplete="tel" required />
                </Field>
                <Field label={t.quote.email} error={errors.email}>
                  <input type="email" dir="ltr" className={inputClass} value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} autoComplete="email" required />
                </Field>
              </div>
              <Field label={t.quote.location} error={errors.location}>
                <textarea rows={2} className={inputClass} value={cust.location} onChange={(e) => setCust({ ...cust, location: e.target.value })} autoComplete="street-address" required />
              </Field>
              <Alert>{t.quote.noPrice}</Alert>
              {fatal && <Alert tone="danger">{fatal}</Alert>}
              <div className="flex justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={!!submitting}>
                  {t.common.back}
                </Button>
                <Button type="submit" variant="accent" disabled={!!submitting}>
                  {submitting && <Spinner />}
                  {submitting === "capture" ? t.quote.capturing : submitting === "send" ? t.quote.submitting : t.quote.submit}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && result && (
            <div className="py-6 text-center" role="status">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-ok/10 text-ok">
                <CheckIcon className="size-8" />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-navy">{t.quote.successTitle}</h2>
              <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-500">{fmt(t.quote.successBody, { rfq: result.rfqNumber })}</p>
              <p className="num mt-4 text-lg font-bold text-sun-600">{result.rfqNumber}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <LinkButton href={`/${locale}/account/quotes/${result.id}`}>{t.quote.viewRequest}</LinkButton>
                <Link href={`/${locale}/studio`} className="px-4 py-2.5 text-sm font-semibold text-navy">
                  {t.account.newDesign}
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
