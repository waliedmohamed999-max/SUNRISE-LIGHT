"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Badge, Button, Card, cx, Field, inputClass, Spinner } from "@/components/ui";
import { TemplateGlyph } from "@/components/studio/TemplateGlyph";
import { INDUSTRIES } from "@/packaging/industries";

interface Initial {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isEnabled: boolean;
  version: number;
  limits: Record<"minLengthMm" | "maxLengthMm" | "minWidthMm" | "maxWidthMm" | "minHeightMm" | "maxHeightMm", number>;
  defaults: { length: number; width: number; height: number };
  safeMarginMm: number;
  dielineValidated: boolean;
  panels: { key: string; name: string; printable: boolean }[];
  materialIds: string[];
  industries: string[];
}

export function TemplateEditor({
  initial,
  materials,
  meta,
  canManage,
  canValidate,
}: {
  initial: Initial;
  materials: { id: string; nameAr: string; nameEn: string }[];
  meta: { versions: number; designs: number; category: string; engineKey: string; code: string };
  canManage: boolean;
  canValidate: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<{ busy: boolean; msg?: { tone: "ok" | "danger"; text: string } }>({ busy: false });
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  async function save() {
    setState({ busy: true });
    const res = await fetch(`/api/admin/templates/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        descriptionAr: s.descriptionAr,
        descriptionEn: s.descriptionEn,
        isEnabled: s.isEnabled,
        limits: s.limits,
        defaults: s.defaults,
        safeMarginMm: s.safeMarginMm,
        dielineValidated: s.dielineValidated,
        printablePanels: s.panels.filter((p) => p.printable).map((p) => p.key),
        materialIds: s.materialIds,
        industries: s.industries,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setState({ busy: false, msg: res.ok ? { tone: "ok", text: t.admin.templateSaved + (j.newVersion ? ` (v${s.version + 1})` : "") } : { tone: "danger", text: `${t.common.error} (${j.error ?? res.status})` } });
    if (res.ok) router.refresh();
  }

  const disabled = !canManage;
  const axis = [
    ["Length", t.studio.length, "minLengthMm", "maxLengthMm", "length"],
    ["Width", t.studio.width, "minWidthMm", "maxWidthMm", "width"],
    ["Height", t.studio.height, "minHeightMm", "maxHeightMm", "height"],
  ] as const;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TemplateGlyph engineKey={meta.engineKey} />
          <div>
            <h2 className="font-semibold text-navy">{locale === "ar" ? s.nameAr : s.nameEn}</h2>
            <p className="text-xs text-ink-500">
              <code>{meta.code}</code> · {meta.category} · v<span className="num">{s.version}</span> · {t.admin.designs}: <span className="num">{meta.designs}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge tone={s.isEnabled ? "ok" : "neutral"}>{s.isEnabled ? t.admin.enabled : t.admin.disabled}</Badge>
          <Badge tone={s.dielineValidated ? "ok" : "warn"}>{s.dielineValidated ? t.studio.validatedDieline : t.studio.approxDieline.split(".")[0]}</Badge>
        </div>
      </div>

      <fieldset disabled={disabled} className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم (عربي)">
              <input className={inputClass} value={s.nameAr} onChange={(e) => setS({ ...s, nameAr: e.target.value })} dir="rtl" />
            </Field>
            <Field label="Name (English)">
              <input className={inputClass} value={s.nameEn} onChange={(e) => setS({ ...s, nameEn: e.target.value })} dir="ltr" />
            </Field>
          </div>
          <Field label="الوصف (عربي)">
            <textarea rows={2} className={inputClass} value={s.descriptionAr} onChange={(e) => setS({ ...s, descriptionAr: e.target.value })} dir="rtl" />
          </Field>
          <Field label="Description (English)">
            <textarea rows={2} className={inputClass} value={s.descriptionEn} onChange={(e) => setS({ ...s, descriptionEn: e.target.value })} dir="ltr" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isEnabled} onChange={(e) => setS({ ...s, isEnabled: e.target.checked })} />
            {t.admin.enabled}
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              {t.admin.limits} · {t.admin.defaults}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {axis.map(([, label, min, max, def]) => (
                  <tr key={def}>
                    <td className="py-1 pe-2 text-ink-500">{label}</td>
                    {[min, max].map((k) => (
                      <td key={k} className="py-1 pe-2">
                        <input aria-label={`${label} ${k}`} type="text" inputMode="decimal" className={cx(inputClass, "num px-2 py-1.5")} value={s.limits[k]} onChange={(e) => setS({ ...s, limits: { ...s.limits, [k]: num(e.target.value) } })} />
                      </td>
                    ))}
                    <td className="py-1">
                      <input aria-label={`${label} default`} type="text" inputMode="decimal" className={cx(inputClass, "num bg-sun-100/40 px-2 py-1.5")} value={s.defaults[def]} onChange={(e) => setS({ ...s, defaults: { ...s.defaults, [def]: num(e.target.value) } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-ink-500">min · max · default</p>
          </div>
          <Field label={t.admin.safeMargin}>
            <input type="text" inputMode="decimal" className={cx(inputClass, "num w-28")} value={s.safeMarginMm} onChange={(e) => setS({ ...s, safeMarginMm: num(e.target.value) })} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t.admin.panels}</p>
            <div className="flex flex-wrap gap-2">
              {s.panels.map((p, i) => (
                <label key={p.key} className={cx("cursor-pointer rounded-full border px-3 py-1 text-xs", p.printable ? "border-navy bg-navy text-white" : "border-navy/15")}>
                  <input type="checkbox" className="sr-only" checked={p.printable} onChange={() => setS({ ...s, panels: s.panels.map((x, j) => (j === i ? { ...x, printable: !x.printable } : x)) })} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{locale === "ar" ? "القطاعات" : "Industries"}</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => {
                const on = s.industries.includes(i.key);
                return (
                  <label key={i.key} className={cx("cursor-pointer rounded-full border px-3 py-1 text-xs", on ? "border-navy bg-navy text-white" : "border-navy/15")}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setS({ ...s, industries: on ? s.industries.filter((x) => x !== i.key) : [...s.industries, i.key] })} />
                    {locale === "ar" ? i.ar : i.en}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">{t.admin.compatibleMaterials}</p>
            <div className="flex flex-wrap gap-2">
              {materials.map((m) => {
                const on = s.materialIds.includes(m.id);
                return (
                  <label key={m.id} className={cx("cursor-pointer rounded-full border px-3 py-1 text-xs", on ? "border-sun bg-sun-100 text-navy" : "border-navy/15")}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setS({ ...s, materialIds: on ? s.materialIds.filter((x) => x !== m.id) : [...s.materialIds, m.id] })} />
                    {locale === "ar" ? m.nameAr : m.nameEn}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-navy/8 pt-4">
        <label className={cx("flex items-center gap-2 text-sm", !canValidate && "opacity-50")}>
          <input type="checkbox" disabled={!canValidate} checked={s.dielineValidated} onChange={(e) => setS({ ...s, dielineValidated: e.target.checked })} />
          {t.admin.validated}
        </label>
        <Button className="ms-auto" onClick={save} disabled={state.busy || (!canManage && !canValidate)}>
          {state.busy && <Spinner />}
          {t.common.save}
        </Button>
      </div>
      {state.msg && <Alert tone={state.msg.tone} className="mt-4">{state.msg.text}</Alert>}
    </Card>
  );
}
