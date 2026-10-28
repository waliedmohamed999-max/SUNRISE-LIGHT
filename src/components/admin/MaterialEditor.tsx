"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Badge, Button, Card, cx, Field, inputClass, Spinner } from "@/components/ui";

interface Material {
  id?: string;
  code: string;
  nameAr: string;
  nameEn: string;
  kind: "KRAFT" | "WHITE" | "CORRUGATED" | "DUPLEX" | "OTHER";
  thickness: string;
  colorHex: string;
  printableSides: string;
  limitationsAr: string;
  limitationsEn: string;
  isAvailable: boolean;
  factoryApproved: boolean;
  finishingIds: string[];
}

const EMPTY: Material = { code: "", nameAr: "", nameEn: "", kind: "OTHER", thickness: "", colorHex: "#C9A06B", printableSides: "outside", limitationsAr: "", limitationsEn: "", isAvailable: true, factoryApproved: false, finishingIds: [] };

export function MaterialEditor({ initial, finishings }: { initial: Material | null; finishings: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [m, setM] = useState<Material>(initial ?? EMPTY);
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });

  async function save() {
    setState({ busy: true });
    const { id, ...body } = m;
    const res = await fetch(id ? `/api/admin/materials/${id}` : "/api/admin/materials", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ busy: false, error: `${t.common.error} (${j.error ?? res.status})` });
    setState({ busy: false });
    setOpen(false);
    if (!id) setM(EMPTY);
    router.refresh();
  }

  if (!open) {
    return initial ? (
      <Card className="flex items-center gap-4 p-4">
        <span className="size-12 shrink-0 rounded-xl border border-black/10" style={{ background: m.colorHex }} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">
            {m.nameAr} · {m.nameEn}
          </p>
          <p className="truncate text-xs text-ink-500">
            <code>{m.code}</code> · {m.kind} · {m.thickness || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={m.isAvailable ? "ok" : "neutral"}>{m.isAvailable ? t.admin.available : t.admin.disabled}</Badge>
          {!m.factoryApproved && <Badge tone="warn">{t.admin.factoryApproved}: ✗</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          {t.common.edit}
        </Button>
      </Card>
    ) : (
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-card)] border-2 border-dashed border-navy/15 p-6 text-sm font-semibold text-navy hover:border-sun">
        + {t.admin.addMaterial}
      </button>
    );
  }

  return (
    <Card className="space-y-3 p-5 xl:col-span-2">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Code">
          <input className={cx(inputClass, "font-mono")} value={m.code} disabled={!!m.id} onChange={(e) => setM({ ...m, code: e.target.value.toLowerCase() })} dir="ltr" />
        </Field>
        <Field label="الاسم (عربي)">
          <input className={inputClass} value={m.nameAr} onChange={(e) => setM({ ...m, nameAr: e.target.value })} dir="rtl" />
        </Field>
        <Field label="Name (English)">
          <input className={inputClass} value={m.nameEn} onChange={(e) => setM({ ...m, nameEn: e.target.value })} dir="ltr" />
        </Field>
        <Field label="Type">
          <select className={inputClass} value={m.kind} onChange={(e) => setM({ ...m, kind: e.target.value as Material["kind"] })}>
            {["KRAFT", "WHITE", "CORRUGATED", "DUPLEX", "OTHER"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label={t.admin.thickness}>
          <input className={inputClass} value={m.thickness} onChange={(e) => setM({ ...m, thickness: e.target.value })} />
        </Field>
        <Field label={t.studio.color}>
          <input type="color" className="h-11 w-full rounded-xl border border-navy/15 p-1" value={m.colorHex} onChange={(e) => setM({ ...m, colorHex: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Printable sides">
          <input className={inputClass} value={m.printableSides} onChange={(e) => setM({ ...m, printableSides: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t.admin.limitations} (AR)`}>
          <textarea rows={2} className={inputClass} value={m.limitationsAr} onChange={(e) => setM({ ...m, limitationsAr: e.target.value })} dir="rtl" />
        </Field>
        <Field label={`${t.admin.limitations} (EN)`}>
          <textarea rows={2} className={inputClass} value={m.limitationsEn} onChange={(e) => setM({ ...m, limitationsEn: e.target.value })} dir="ltr" />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{t.admin.finishings}</p>
        <div className="flex flex-wrap gap-2">
          {finishings.map((f) => {
            const on = m.finishingIds.includes(f.id);
            return (
              <label key={f.id} className={cx("cursor-pointer rounded-full border px-3 py-1 text-xs", on ? "border-navy bg-navy text-white" : "border-navy/15")}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setM({ ...m, finishingIds: on ? m.finishingIds.filter((x) => x !== f.id) : [...m.finishingIds, f.id] })} />
                {f.name}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={m.isAvailable} onChange={(e) => setM({ ...m, isAvailable: e.target.checked })} />
          {t.admin.available}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={m.factoryApproved} onChange={(e) => setM({ ...m, factoryApproved: e.target.checked })} />
          {t.admin.factoryApproved}
        </label>
        <div className="ms-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>
          <Button size="sm" onClick={save} disabled={state.busy}>
            {state.busy && <Spinner />}
            {t.common.save}
          </Button>
        </div>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
    </Card>
  );
}

export function FinishingManager({ finishings }: { finishings: { id: string; code: string; name: string; isAvailable: boolean }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ code: "", nameAr: "", nameEn: "" });
  const [error, setError] = useState<string | null>(null);
  const call = async (method: string, body: unknown) => {
    setError(null);
    const res = await fetch("/api/admin/finishings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) setError(t.common.error);
    else router.refresh();
    return res.ok;
  };
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-navy">{t.admin.finishings}</h2>
      <div className="flex flex-wrap gap-2">
        {finishings.map((f) => (
          <label key={f.id} className={cx("flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm", f.isAvailable ? "border-ok/40 bg-ok/8" : "border-navy/15 text-ink-500")}>
            <input type="checkbox" checked={f.isAvailable} onChange={() => call("PATCH", { id: f.id, isAvailable: !f.isAvailable })} />
            {f.name}
          </label>
        ))}
      </div>
      <form
        className="mt-5 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await call("POST", form)) setForm({ code: "", nameAr: "", nameEn: "" });
        }}
      >
        <Field label="Code">
          <input required pattern="[a-z0-9-]{2,60}" className={cx(inputClass, "font-mono")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} dir="ltr" />
        </Field>
        <Field label="عربي">
          <input required className={inputClass} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        </Field>
        <Field label="English">
          <input required className={inputClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        </Field>
        <Button type="submit">{t.admin.addFinishing}</Button>
      </form>
      {error && <Alert tone="danger" className="mt-3">{error}</Alert>}
    </Card>
  );
}
