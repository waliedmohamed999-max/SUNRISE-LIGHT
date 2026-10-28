"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "./context";
import { effectiveDpi, FONT_KEYS, isOutsideSafeArea, MIN_PRINT_DPI, type TextElement } from "@/design/document";
import { STUDIO_FONTS } from "@/design/fonts";
import { fmt } from "@/i18n/dictionaries";
import { SURFACE_KEYS, type Dimensions } from "@/packaging/types";
import {
  AlignCenterIcon,
  AlignMiddleIcon,
  Alert,
  Badge,
  Button,
  CopyIcon,
  cx,
  DownIcon,
  inputClass,
  LockIcon,
  Spinner,
  TextIcon,
  TrashIcon,
  UpIcon,
  UploadIcon,
} from "@/components/ui";

const PRESETS = ["#FFFFFF", "#F8F6F2", "#14283F", "#1D2935", "#F5A623", "#D69A38", "#B78B59", "#C53030", "#2F855A", "#2B6CB0", "#6B46C1", "#000000"];

export const PRINT_LABELS: Record<string, { ar: string; en: string }> = {
  none: { ar: "بدون طباعة", en: "No print" },
  "1c": { ar: "لون واحد", en: "1 colour" },
  "2c": { ar: "لونان", en: "2 colours" },
  "4c": { ar: "طباعة كاملة الألوان", en: "Full colour (CMYK)" },
};

export function PanelTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-xs font-bold tracking-wide text-ink-500 uppercase">{children}</h3>
      {aside}
    </div>
  );
}

/* ───────────────────────── Templates ───────────────────────── */

export function TemplatesPanel() {
  const { catalog, template, switchTemplate, locale, t } = useStudio();
  return (
    <div>
      <PanelTitle>{t.studio.templates}</PanelTitle>
      <div className="grid gap-2">
        {catalog.templates.map((tpl) => {
          const active = tpl.code === template.code;
          return (
            <button
              key={tpl.code}
              onClick={() => !active && switchTemplate(tpl.code)}
              aria-pressed={active}
              className={cx("flex items-start gap-3 rounded-xl border p-3 text-start transition", active ? "border-sun bg-sun-100/60" : "border-navy/10 bg-white hover:border-navy/30")}
            >
              <TemplateGlyph engineKey={tpl.engineKey} />
              <span>
                <span className="block text-sm font-semibold text-navy">{locale === "ar" ? tpl.nameAr : tpl.nameEn}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-500">{locale === "ar" ? tpl.descriptionAr : tpl.descriptionEn}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TemplateGlyph({ engineKey, className }: { engineKey: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("size-11 shrink-0 rounded-lg bg-paper-200 p-1.5", className)} aria-hidden>
      {engineKey === "mailer" ? (
        <>
          <path d="M8 26 24 34 40 26 40 38 24 46 8 38z" fill="#B78B59" />
          <path d="M8 26 24 18 40 26 24 34z" fill="#D9BC94" />
          <path d="M8 26 24 18 26 6 10 14z" fill="#C9A06B" />
        </>
      ) : engineKey === "rte" ? (
        <>
          <path d="M16 12 26 8 34 12 24 16z" fill="#F5A623" />
          <path d="M16 12 24 16 24 44 16 40z" fill="#14283F" />
          <path d="M24 16 34 12 34 40 24 44z" fill="#23405F" />
        </>
      ) : (
        <>
          <path d="M6 18 24 10 42 18 24 26z" fill="#D9BC94" />
          <path d="M6 18 24 26 24 44 6 36z" fill="#B78B59" />
          <path d="M24 26 42 18 42 36 24 44z" fill="#9C7547" />
          <path d="M15 14 33 22" stroke="#8a6a44" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}

/* ───────────────────────── Dimensions ───────────────────────── */

export function DimensionsPanel() {
  const { doc, template, applyDims, unit, setUnit, dimIssues, t, locale } = useStudio();
  const lim = template.version.limits;
  const factor = unit === "cm" ? 10 : 1;
  const axes = [
    { k: "length", label: t.studio.length, min: lim.minLengthMm, max: lim.maxLengthMm },
    { k: "width", label: t.studio.width, min: lim.minWidthMm, max: lim.maxWidthMm },
    { k: "height", label: t.studio.height, min: lim.minHeightMm, max: lim.maxHeightMm },
  ] as const;
  const show = (mm: number) => String(Math.round((mm / factor) * 10) / 10);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => setDraft({}), [doc.dimensions, unit]);

  function commit() {
    const next: Dimensions = { ...doc.dimensions };
    for (const a of axes) {
      const raw = draft[a.k];
      if (raw === undefined) continue;
      const v = Number(raw.replace(",", "."));
      next[a.k] = Number.isFinite(v) ? Math.round(v * factor * 10) / 10 : NaN;
    }
    applyDims(next);
  }

  return (
    <div>
      <PanelTitle
        aside={
          <div role="radiogroup" aria-label={t.studio.unit} className="flex rounded-full bg-paper-200 p-0.5 text-xs font-semibold">
            {(["mm", "cm"] as const).map((u) => (
              <button key={u} role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={cx("rounded-full px-2.5 py-1", unit === u ? "bg-white text-navy shadow-sm" : "text-ink-500")}>
                {t.common[u]}
              </button>
            ))}
          </div>
        }
      >
        {t.studio.dimensions}
      </PanelTitle>
      <form
        className="grid grid-cols-3 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        {axes.map((a) => (
          <label key={a.k} className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">{a.label}</span>
            <input
              inputMode="decimal"
              className={cx(inputClass, "num px-2 text-center")}
              value={draft[a.k] ?? show(doc.dimensions[a.k])}
              onChange={(e) => setDraft((d) => ({ ...d, [a.k]: e.target.value }))}
              onBlur={commit}
              aria-describedby={`range-${a.k}`}
            />
            <span id={`range-${a.k}`} className="num mt-1 block text-center text-[10px] text-ink-500">
              {show(a.min)}–{show(a.max)}
            </span>
          </label>
        ))}
        <button type="submit" className="sr-only">
          {t.studio.apply}
        </button>
      </form>
      <IssueList issues={dimIssues} locale={locale} />
    </div>
  );
}

function IssueList({ issues, locale }: { issues: { level: string; message: { ar: string; en: string } }[]; locale: "ar" | "en" }) {
  if (!issues.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {issues.map((i, n) => (
        <li key={n} className={cx("rounded-lg px-3 py-2 text-xs leading-relaxed", i.level === "error" ? "bg-danger/8 text-danger" : "bg-warn/8 text-warn")}>
          {i.message[locale]}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Surfaces ───────────────────────── */

export function SurfacesPanel() {
  const { specs, surfaceKey, setSurfaceKey, printable, doc, locale, t } = useStudio();
  return (
    <div>
      <PanelTitle>{t.studio.surfaces}</PanelTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {specs.map((s) => {
          const n = doc.surfaces[s.key].elements.length;
          const bg = doc.surfaces[s.key].background;
          return (
            <button
              key={s.key}
              disabled={!printable(s.key)}
              onClick={() => setSurfaceKey(s.key)}
              aria-pressed={surfaceKey === s.key}
              className={cx(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-start text-xs transition disabled:opacity-40",
                surfaceKey === s.key ? "border-navy bg-navy text-white" : "border-navy/10 bg-white text-navy hover:border-navy/30",
              )}
            >
              <span className="size-3.5 shrink-0 rounded-sm border border-black/10" style={{ background: bg ?? "transparent" }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.label[locale]}</span>
                <span className="num block opacity-70">
                  {Math.round(s.w)}×{Math.round(s.h)}
                </span>
              </span>
              {n > 0 && <span className={cx("num rounded-full px-1.5 text-[10px] font-bold", surfaceKey === s.key ? "bg-white/20" : "bg-paper-200")}>{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Material / printing / finishing ───────────────────────── */

export function MaterialPanel() {
  const { compatibleMaterials, material, update, locale, t, template, doc, catalog } = useStudio();
  const finishings = catalog.finishings.filter((f) => material?.finishingCodes.includes(f.code));
  return (
    <div className="space-y-5">
      <div>
        <PanelTitle>{t.studio.material}</PanelTitle>
        <div className="grid gap-2">
          {compatibleMaterials.map((m) => (
            <button
              key={m.code}
              onClick={() => update((d) => ({ ...d, materialCode: m.code, finishingCodes: d.finishingCodes.filter((c) => m.finishingCodes.includes(c)) }))}
              aria-pressed={material?.code === m.code}
              className={cx("flex items-center gap-3 rounded-xl border p-2.5 text-start", material?.code === m.code ? "border-sun bg-sun-100/60" : "border-navy/10 bg-white hover:border-navy/30")}
            >
              <span className="size-9 shrink-0 rounded-lg border border-black/10" style={{ background: m.colorHex }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy">{locale === "ar" ? m.nameAr : m.nameEn}</span>
                <span className="block truncate text-xs text-ink-500">{m.thickness || (locale === "ar" ? m.limitationsAr : m.limitationsEn)}</span>
              </span>
              {!m.factoryApproved && <Badge tone="warn">{locale === "ar" ? "للتأكيد" : "TBC"}</Badge>}
            </button>
          ))}
        </div>
      </div>
      {template.version.printOptions.length > 0 && (
        <div>
          <PanelTitle>{locale === "ar" ? "الطباعة" : "Printing"}</PanelTitle>
          <select className={inputClass} value={doc.printOption ?? ""} onChange={(e) => update((d) => ({ ...d, printOption: e.target.value || null }))}>
            <option value="">—</option>
            {template.version.printOptions.map((o) => (
              <option key={o} value={o}>
                {PRINT_LABELS[o]?.[locale] ?? o}
              </option>
            ))}
          </select>
        </div>
      )}
      {finishings.length > 0 && (
        <div>
          <PanelTitle>{t.studio.finishing}</PanelTitle>
          <div className="flex flex-wrap gap-1.5">
            {finishings.map((f) => {
              const on = doc.finishingCodes.includes(f.code);
              return (
                <button
                  key={f.code}
                  aria-pressed={on}
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      finishingCodes: f.code === "none" ? (on ? [] : ["none"]) : on ? d.finishingCodes.filter((c) => c !== f.code) : [...d.finishingCodes.filter((c) => c !== "none"), f.code],
                    }))
                  }
                  className={cx("rounded-full border px-3 py-1.5 text-xs font-medium", on ? "border-navy bg-navy text-white" : "border-navy/15 bg-white text-navy")}
                >
                  {locale === "ar" ? f.nameAr : f.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <PanelTitle>{t.studio.quantity}</PanelTitle>
        <input
          type="text"
          min={1}
          inputMode="numeric"
          className={cx(inputClass, "num")}
          value={doc.quantity ?? ""}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            update((d) => ({ ...d, quantity: Number.isFinite(v) && v > 0 ? Math.min(v, 10_000_000) : null }), "qty");
          }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Colours ───────────────────────── */

export function ColorsPanel() {
  const { doc, surfaceKey, update, specs, printable, t, spec, locale } = useStudio();
  const current = doc.surfaces[surfaceKey].background;
  const [color, setColor] = useState(current ?? "#14283F");
  const [hex, setHex] = useState(color);
  useEffect(() => {
    if (current) {
      setColor(current);
      setHex(current);
    }
  }, [current]);

  const apply = (c: string, all = false) =>
    update(
      (d) => ({
        ...d,
        surfaces: Object.fromEntries(
          SURFACE_KEYS.map((k) => [k, all ? (printable(k) ? { ...d.surfaces[k], background: c } : d.surfaces[k]) : k === surfaceKey ? { ...d.surfaces[k], background: c } : d.surfaces[k]]),
        ) as typeof d.surfaces,
      }),
      all ? undefined : `bg-${surfaceKey}`,
    );

  return (
    <div className="space-y-4">
      <PanelTitle>
        {t.studio.background} — {spec.label[locale]}
      </PanelTitle>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={t.studio.color}
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setHex(e.target.value.toUpperCase());
            apply(e.target.value.toUpperCase());
          }}
          className="h-11 w-14 cursor-pointer rounded-lg border border-navy/15 bg-white p-1"
        />
        <input
          aria-label={t.studio.hex}
          className={cx(inputClass, "num uppercase")}
          value={hex}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setHex(v.toUpperCase());
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              setColor(v.toUpperCase());
              apply(v.toUpperCase());
            }
          }}
        />
      </div>
      <div>
        <p className="mb-2 text-xs text-ink-500">{t.studio.presets}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              aria-label={p}
              onClick={() => {
                setColor(p);
                setHex(p);
                apply(p);
              }}
              className={cx("aspect-square rounded-lg border", current === p ? "border-sun ring-2 ring-sun/40" : "border-black/10")}
              style={{ background: p }}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Button variant="outline" size="sm" onClick={() => apply(color.toUpperCase(), true)}>
          {t.studio.applyAll}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => update((d) => ({ ...d, surfaces: { ...d.surfaces, [surfaceKey]: { ...d.surfaces[surfaceKey], background: null } } }))}
          disabled={!current}
        >
          {t.studio.resetColor}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-ink-500">{t.studio.colorNote}</p>
      <div className="flex flex-wrap gap-1">
        {specs.map((s) => (
          <span key={s.key} title={s.label[locale]} className="size-5 rounded border border-black/10" style={{ background: doc.surfaces[s.key].background ?? "transparent" }} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Text ───────────────────────── */

export function TextPanel() {
  const { addText, t, selected } = useStudio();
  return (
    <div className="space-y-4">
      <PanelTitle>{t.studio.text}</PanelTitle>
      <Button variant="primary" size="sm" className="w-full" onClick={addText}>
        <TextIcon className="size-4" />
        {t.studio.addText}
      </Button>
      {selected?.type === "text" && <TextInspector el={selected} />}
    </div>
  );
}

function TextInspector({ el }: { el: TextElement }) {
  const { updateElement, t } = useStudio();
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-3">
      <textarea
        ref={ref}
        dir="auto"
        rows={2}
        className={inputClass}
        value={el.text}
        placeholder={t.studio.textPlaceholder}
        onChange={(e) => updateElement(el.id, { text: e.target.value.slice(0, 500) }, `text-${el.id}`)}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-500">{t.studio.font}</span>
          <select className={cx(inputClass, "px-2")} value={el.font} onChange={(e) => updateElement(el.id, { font: e.target.value as TextElement["font"] })}>
            {FONT_KEYS.map((f) => (
              <option key={f} value={f}>
                {STUDIO_FONTS[f].label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink-500">{t.studio.fontSize}</span>
          <input
            type="text" inputMode="decimal"
            min={2}
            max={300}
            step={0.5}
            className={cx(inputClass, "num px-2")}
            value={Math.round(el.fontSizeMm * 10) / 10}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v > 0 && v <= 300) updateElement(el.id, { fontSizeMm: v }, `fs-${el.id}`);
            }}
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={t.studio.color} value={el.color} onChange={(e) => updateElement(el.id, { color: e.target.value.toUpperCase() }, `tc-${el.id}`)} className="h-10 w-12 rounded-lg border border-navy/15 p-1" />
        <button
          aria-pressed={el.bold}
          onClick={() => updateElement(el.id, { bold: !el.bold })}
          className={cx("h-10 rounded-lg border px-3 text-sm font-bold", el.bold ? "border-navy bg-navy text-white" : "border-navy/15 bg-white")}
        >
          {t.studio.bold}
        </button>
        <div role="radiogroup" aria-label={t.studio.align} className="flex flex-1 rounded-lg border border-navy/15 bg-white p-0.5">
          {(["start", "center", "end"] as const).map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={el.align === a}
              onClick={() => updateElement(el.id, { align: a })}
              className={cx("flex-1 rounded-md py-1.5 text-xs", el.align === a ? "bg-navy text-white" : "text-ink-500")}
            >
              {a === "start" ? t.studio.alignStart : a === "center" ? t.studio.alignCenter : t.studio.alignEnd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Uploads ───────────────────────── */

export function UploadsPanel() {
  const { t, uploadLogo, uploading, uploadError, uploads, placeAsset, isLoggedIn, requireLogin, maxUploadMb } = useStudio();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <PanelTitle>{t.studio.uploads}</PanelTitle>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadLogo(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => (isLoggedIn ? input.current?.click() : requireLogin())}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          if (isLoggedIn) uploadLogo(f);
          else requireLogin();
        }}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-navy/15 bg-paper/60 px-4 py-6 text-center transition hover:border-sun"
      >
        {uploading ? <Spinner className="text-sun" /> : <UploadIcon className="size-6 text-kraft" />}
        <span className="text-sm font-semibold text-navy">{uploading ? t.studio.uploading : isLoggedIn ? t.studio.upload : t.studio.loginToUpload}</span>
        <span className="text-xs text-ink-500">{fmt(t.studio.uploadHint, { mb: maxUploadMb })}</span>
      </button>
      {uploadError && <Alert tone="danger">{uploadError}</Alert>}
      {uploads.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-ink-500">{t.studio.myUploads}</p>
          <div className="grid grid-cols-3 gap-2">
            {uploads.map((a) => (
              <button
                key={a.id}
                onClick={() => placeAsset(a)}
                title={`${t.studio.placeOn}: ${a.originalName}`}
                className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-navy/10 bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:12px_12px] p-1.5 hover:border-sun"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/assets/${a.id}`} alt={a.originalName} className="max-h-full max-w-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Layers ───────────────────────── */

export function LayersPanel() {
  const { doc, surfaceKey, selectedId, setSelectedId, moveElement, duplicateElement, removeElement, updateElement, t, spec, locale } = useStudio();
  const els = doc.surfaces[surfaceKey].elements;
  return (
    <div>
      <PanelTitle>
        {t.studio.layers} — {spec.label[locale]}
      </PanelTitle>
      {els.length === 0 ? (
        <p className="rounded-lg bg-paper-200/60 px-3 py-4 text-center text-xs text-ink-500">{t.studio.noLayers}</p>
      ) : (
        <ul className="space-y-1.5">
          {[...els].reverse().map((el, ri) => {
            const i = els.length - 1 - ri;
            const sel = el.id === selectedId;
            return (
              <li key={el.id} className={cx("flex items-center gap-2 rounded-lg border px-2 py-1.5", sel ? "border-sun bg-sun-100/50" : "border-navy/10 bg-white")}>
                <button className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={() => setSelectedId(el.id)}>
                  <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded bg-paper-200 text-navy">
                    {el.type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/assets/${el.assetId}`} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <TextIcon className="size-4" />
                    )}
                  </span>
                  <span className="truncate text-xs font-medium text-navy" dir="auto">
                    {el.type === "text" ? el.text || "—" : "Logo"}
                  </span>
                </button>
                <button aria-label={t.studio.lockedHint} aria-pressed={!!el.locked} onClick={() => updateElement(el.id, { locked: !el.locked })} className={cx("rounded p-1", el.locked ? "text-sun-600" : "text-navy-300 hover:text-navy")}>
                  <LockIcon className="size-4" />
                </button>
                <button aria-label={t.studio.bringForward} disabled={i === els.length - 1} onClick={() => moveElement(el.id, 1)} className="rounded p-1 text-navy-500 disabled:opacity-30">
                  <UpIcon className="size-4" />
                </button>
                <button aria-label={t.studio.sendBackward} disabled={i === 0} onClick={() => moveElement(el.id, -1)} className="rounded p-1 text-navy-500 disabled:opacity-30">
                  <DownIcon className="size-4" />
                </button>
                <button aria-label={t.studio.duplicateEl} onClick={() => duplicateElement(el.id)} className="rounded p-1 text-navy-500">
                  <CopyIcon className="size-4" />
                </button>
                <button aria-label={t.studio.deleteElement} onClick={() => removeElement(el.id)} className="rounded p-1 text-danger/80">
                  <TrashIcon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────── Selected element inspector ───────────────────────── */

export function InspectorPanel() {
  const { selected, updateElement, removeElement, duplicateElement, centerElement, t, spec, template } = useStudio();
  if (!selected) return null;
  const dpi = selected.type === "image" ? effectiveDpi(selected) : null;
  const outside = isOutsideSafeArea(selected, spec, template.version.safeMarginMm);
  const num = (label: string, value: number, onChange: (v: number) => void, key: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink-500">{label}</span>
      <input
        type="text" inputMode="decimal"
        step={0.5}
        className={cx(inputClass, "num px-2 py-1.5")}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        data-key={key}
      />
    </label>
  );
  return (
    <div className="space-y-3 rounded-xl border border-sun/40 bg-sun-100/30 p-3">
      <PanelTitle
        aside={
          <div className="flex gap-1">
            <button aria-label={t.studio.alignH} onClick={() => centerElement(selected.id, "x")} className="rounded p-1 text-navy hover:bg-white">
              <AlignCenterIcon className="size-4" />
            </button>
            <button aria-label={t.studio.alignV} onClick={() => centerElement(selected.id, "y")} className="rounded p-1 text-navy hover:bg-white">
              <AlignMiddleIcon className="size-4" />
            </button>
            <button aria-label={t.studio.duplicateEl} onClick={() => duplicateElement(selected.id)} className="rounded p-1 text-navy hover:bg-white">
              <CopyIcon className="size-4" />
            </button>
            <button aria-label={t.studio.deleteElement} onClick={() => removeElement(selected.id)} className="rounded p-1 text-danger hover:bg-white">
              <TrashIcon className="size-4" />
            </button>
          </div>
        }
      >
        {t.studio.selected}
      </PanelTitle>
      <div className="grid grid-cols-4 gap-1.5">
        {num("X", selected.x, (v) => updateElement(selected.id, { x: v }, `x-${selected.id}`), "x")}
        {num("Y", selected.y, (v) => updateElement(selected.id, { y: v }, `y-${selected.id}`), "y")}
        {num(t.studio.width, selected.width, (v) => {
          if (v <= 0) return;
          const k = v / selected.width;
          updateElement(selected.id, selected.type === "text" ? { width: v, height: selected.height * k, fontSizeMm: selected.fontSizeMm * k } : { width: v, height: selected.height * k }, `w-${selected.id}`);
        }, "w")}
        {num("°", selected.rotation, (v) => updateElement(selected.id, { rotation: Math.max(-360, Math.min(360, v)) }, `r-${selected.id}`), "r")}
      </div>
      {selected.type === "text" && <TextInspector el={selected} />}
      {dpi !== null && dpi < MIN_PRINT_DPI && <Alert tone="warn">{fmt(t.studio.lowRes, { dpi })}</Alert>}
      {dpi !== null && dpi >= MIN_PRINT_DPI && <p className="num text-xs text-ok">{dpi} dpi</p>}
      {outside && <Alert tone="warn">{t.studio.outsideSafe}</Alert>}
    </div>
  );
}

/* ───────────────────────── Summary ───────────────────────── */

export function SummaryPanel({ issues }: { issues: { level: string; message: { ar: string; en: string } }[] }) {
  const { doc, template, material, locale, t, catalog, specs } = useStudio();
  const { length: L, width: W, height: H } = doc.dimensions;
  const colors = [...new Set(specs.map((s) => doc.surfaces[s.key].background).filter(Boolean))] as string[];
  const elements = specs.reduce((n, s) => n + doc.surfaces[s.key].elements.length, 0);
  const finishing = doc.finishingCodes.map((c) => catalog.finishings.find((f) => f.code === c)).filter(Boolean);
  const rows: [string, React.ReactNode][] = [
    [t.studio.product, locale === "ar" ? template.nameAr : template.nameEn],
    [t.studio.dimensions, <span key="d" className="num">{`${L} × ${W} × ${H} mm`}</span>],
    [t.studio.material, material ? (locale === "ar" ? material.nameAr : material.nameEn) : "—"],
    [locale === "ar" ? "الطباعة" : "Printing", doc.printOption ? PRINT_LABELS[doc.printOption]?.[locale] ?? doc.printOption : "—"],
    [t.studio.finishing, finishing.length ? finishing.map((f) => (locale === "ar" ? f!.nameAr : f!.nameEn)).join("، ") : "—"],
    [t.studio.quantity, doc.quantity ? <span key="q" className="num">{doc.quantity.toLocaleString("en")}</span> : "—"],
    [t.studio.layers, <span key="e" className="num">{elements}</span>],
  ];
  return (
    <div className="space-y-4">
      <div>
        <PanelTitle>{t.studio.summary}</PanelTitle>
        <dl className="divide-y divide-navy/6 rounded-xl border border-navy/8 bg-white text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-ink-500">{k}</dt>
              <dd className="text-end font-medium text-navy">{v}</dd>
            </div>
          ))}
          {colors.length > 0 && (
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-ink-500">{t.studio.colors}</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {colors.map((c) => (
                  <span key={c} title={c} className="size-4 rounded border border-black/10" style={{ background: c }} />
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <div>
        <PanelTitle>{t.studio.issues}</PanelTitle>
        {issues.length === 0 ? <p className="text-xs text-ok">{t.studio.noIssues}</p> : <IssueList issues={issues} locale={locale} />}
        <p className={cx("mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed", template.version.dielineValidated ? "bg-ok/8 text-ok" : "bg-navy-100/60 text-navy")}>
          {template.version.dielineValidated ? t.studio.validatedDieline : t.studio.approxDieline}
        </p>
      </div>
    </div>
  );
}
