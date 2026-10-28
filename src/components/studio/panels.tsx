"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "./context";
import { effectiveDpi, FINISHES, FONT_KEYS, isOutsideSafeArea, MIN_PRINT_DPI, type Finish, type FontKey, type TextElement, FINISH_LABELS, COATINGS, COATING_LABELS, type Coating } from "@/design/document";
import { STUDIO_FONTS } from "@/design/fonts";
import { fmt } from "@/i18n/dictionaries";
import { SURFACE_KEYS, type Dimensions, type SurfaceKey } from "@/packaging/types";
import { INDUSTRIES } from "@/packaging/industries";
import { ENGINE_TIPS, sizePresetsFor } from "@/packaging/sizes";
import { TemplateGlyph } from "./TemplateGlyph";
import { drawIcon, ICONS, ICON_KEYS, type IconKey } from "@/design/icons";
import { applyPreset, DESIGN_PRESETS, type DesignPreset } from "@/design/presets";
import { measureText } from "@/design/render";
export { TemplateGlyph };
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
  XIcon,
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
  const [query, setQuery] = useState("");
  // ?industry= in the URL pre-selects a filter (links from the homepage and products pages)
  const [industry, setIndustry] = useState<string | null>(null);
  // read after mount so server and client render the same markup
  useEffect(() => setIndustry(new URLSearchParams(window.location.search).get("industry")), []);
  const used = INDUSTRIES.filter((i) => catalog.templates.some((tpl) => tpl.industries.includes(i.key)));
  const q = query.trim().toLowerCase();
  const list = catalog.templates.filter(
    (tpl) =>
      (!industry || tpl.industries.includes(industry)) &&
      (!q || `${tpl.nameAr} ${tpl.nameEn} ${tpl.descriptionAr} ${tpl.descriptionEn}`.toLowerCase().includes(q)),
  );
  const groups = [...new Map(list.map((tpl) => [tpl.category.slug, tpl.category])).values()];
  return (
    <div>
      <PanelTitle aside={<span className="num text-[11px] text-ink-500">{list.length}</span>}>{t.studio.templates}</PanelTitle>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={locale === "ar" ? "ابحث: عطر، برجر، هدية…" : "Search: perfume, burger, gift…"}
        className={cx(inputClass, "mb-3")}
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button onClick={() => setIndustry(null)} aria-pressed={!industry} className={cx("rounded-full border px-2.5 py-1 text-[11px]", !industry ? "border-navy bg-navy text-white" : "border-navy/15 text-ink-500")}>
          {t.common.all}
        </button>
        {used.map((i) => (
          <button
            key={i.key}
            onClick={() => setIndustry(industry === i.key ? null : i.key)}
            aria-pressed={industry === i.key}
            className={cx("rounded-full border px-2.5 py-1 text-[11px]", industry === i.key ? "border-navy bg-navy text-white" : "border-navy/15 text-ink-500 hover:text-navy")}
          >
            {locale === "ar" ? i.ar : i.en}
          </button>
        ))}
      </div>
      {groups.length === 0 && <p className="rounded-lg bg-paper-200/60 px-3 py-4 text-center text-xs text-ink-500">{t.admin.noResults}</p>}
      {groups.map((g) => (
        <div key={g.slug} className="mb-4">
          <p className="mb-2 text-[11px] font-semibold text-ink-500">{locale === "ar" ? g.nameAr : g.nameEn}</p>
          <div className="grid grid-cols-2 gap-2">
            {list
              .filter((tpl) => tpl.category.slug === g.slug)
              .map((tpl) => {
                const active = tpl.code === template.code;
                return (
                  <button
                    key={tpl.code}
                    onClick={() => !active && switchTemplate(tpl.code)}
                    aria-pressed={active}
                    title={locale === "ar" ? tpl.descriptionAr : tpl.descriptionEn}
                    className={cx(
                      "group flex flex-col items-center rounded-xl border p-2.5 text-center transition",
                      active ? "border-sun bg-sun-100/60 ring-2 ring-sun/30" : "border-navy/10 bg-white hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm",
                    )}
                  >
                    <TemplateGlyph engineKey={tpl.engineKey} className="size-16 bg-paper p-2 transition group-hover:scale-105" />
                    <span className="mt-2 line-clamp-2 text-[12px] leading-tight font-semibold text-navy">{locale === "ar" ? tpl.nameAr : tpl.nameEn}</span>
                    <span className="num mt-1 text-[10px] text-ink-500">
                      {tpl.version.defaults.length}×{tpl.version.defaults.width}×{tpl.version.defaults.height}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
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
      <div className="mb-3 flex flex-wrap gap-1.5">
        {sizePresetsFor(template.code, template.version.defaults).map((sp) => {
          const clampTo = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
          const dims = {
            length: clampTo(sp.dims.length, lim.minLengthMm, lim.maxLengthMm),
            width: clampTo(sp.dims.width, lim.minWidthMm, lim.maxWidthMm),
            height: clampTo(sp.dims.height, lim.minHeightMm, lim.maxHeightMm),
          };
          const on = dims.length === doc.dimensions.length && dims.width === doc.dimensions.width && dims.height === doc.dimensions.height;
          return (
            <button
              key={sp.en}
              type="button"
              onClick={() => applyDims(dims)}
              title={`${dims.length} × ${dims.width} × ${dims.height} mm`}
              className={cx("rounded-full border px-2.5 py-1 text-[11px]", on ? "border-sun bg-sun-100 text-navy" : "border-navy/15 text-ink-500 hover:border-navy/40 hover:text-navy")}
            >
              {locale === "ar" ? sp.ar : sp.en}
            </button>
          );
        })}
      </div>
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
      {/* drag to resize live */}
      <div className="mt-4 space-y-3">
        {axes.map((a) => (
          <label key={a.k} className="block">
            <span className="mb-1 flex justify-between text-[11px] text-ink-500">
              <span>{a.label}</span>
              <span className="num font-semibold text-navy">{show(doc.dimensions[a.k])} {t.common[unit]}</span>
            </span>
            <input
              type="range"
              min={a.min}
              max={a.max}
              step={1}
              value={doc.dimensions[a.k]}
              onChange={(e) => applyDims({ ...doc.dimensions, [a.k]: Number(e.target.value) })}
              className="w-full accent-[#EA5B32]"
              aria-label={a.label}
            />
          </label>
        ))}
      </div>
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
  const { specs, surfaceKey, setSurfaceKey, printable, doc, locale, t, copySurface } = useStudio();
  const [target, setTarget] = useState<SurfaceKey | "all">("all");
  const ar = locale === "ar";
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
      <div className="mt-3 rounded-xl border border-navy/10 bg-white p-2.5">
        <p className="mb-2 text-[11px] text-ink-500">{ar ? "انسخ تصميم الوجه المحدد إلى:" : "Copy the active face's design to:"}</p>
        <div className="flex gap-1.5">
          <select className={cx(inputClass, "py-1.5 text-xs")} value={target} onChange={(e) => setTarget(e.target.value as SurfaceKey | "all")}>
            <option value="all">{ar ? "كل الأوجه" : "All faces"}</option>
            {specs
              .filter((s) => s.key !== surfaceKey && printable(s.key))
              .map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label[locale]}
                </option>
              ))}
          </select>
          <Button size="sm" variant="primary" onClick={() => copySurface(target)}>
            {ar ? "نسخ" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}


/* ───────────────────────── Material / printing / finishing ───────────────────────── */

export function MaterialPanel() {
  const { compatibleMaterials, material, update, locale, t, template, doc, catalog } = useStudio();
  const finishings = catalog.finishings.filter((f) => material?.finishingCodes.includes(f.code));
  const tip = ENGINE_TIPS[template.engineKey];
  return (
    <div className="space-y-5">
      {tip && (
        <p className="rounded-xl border border-sun/30 bg-sun-100/50 px-3 py-2.5 text-[11px] leading-relaxed text-navy">
          <span className="font-semibold">{locale === "ar" ? "نصيحة: " : "Tip: "}</span>
          {tip[locale]}
        </p>
      )}
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

const BRAND_SWATCHES = ["#2F357C", "#EA5B32", "#FFFFFF", "#1D2235"];

/** One colour control: native picker + HEX + clear. */
function ColorField({ value, onChange, onClear, label }: { value: string | null; onChange: (hex: string, live?: boolean) => void; onClear?: () => void; label: string }) {
  const [hex, setHex] = useState(value ?? "");
  useEffect(() => setHex(value ?? ""), [value]);
  return (
    <div className="flex items-center gap-1.5">
      <label className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-navy/15 bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:8px_8px]" title={label}>
        <span className="absolute inset-0" style={{ background: value ?? "transparent" }} />
        <input type="color" aria-label={label} value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value.toUpperCase(), true)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <input
        aria-label={`${label} HEX`}
        className={cx(inputClass, "num h-8 min-w-0 px-1.5 py-1 text-[11px] uppercase")}
        value={hex}
        placeholder="—"
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          setHex(v.toUpperCase());
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
        }}
      />
      {onClear && value && (
        <button type="button" onClick={onClear} aria-label="×" className="grid size-7 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-paper-200">
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Box colours: every face listed with its own colour, a palette for the active face,
 * "same colour for all faces", the inside colour and a coating per face.
 */
export function ColorsPanel() {
  const { doc, surfaceKey, setSurfaceKey, update, specs, printable, t, locale } = useStudio();
  const ar = locale === "ar";
  const current = doc.surfaces[surfaceKey];

  const setFace = (k: SurfaceKey, color: string | null, live = false) =>
    update((d) => ({ ...d, surfaces: { ...d.surfaces, [k]: { ...d.surfaces[k], background: color } } }), live ? `bg-${k}` : undefined);
  const setAll = (color: string | null) =>
    update((d) => ({
      ...d,
      surfaces: Object.fromEntries(SURFACE_KEYS.map((k) => [k, printable(k) ? { ...d.surfaces[k], background: color } : d.surfaces[k]])) as typeof d.surfaces,
    }));
  const setCoating = (k: SurfaceKey | "all", coating: Coating) =>
    update((d) => ({
      ...d,
      surfaces: Object.fromEntries(SURFACE_KEYS.map((key) => [key, k === "all" || k === key ? { ...d.surfaces[key], coating } : d.surfaces[key]])) as typeof d.surfaces,
    }));

  return (
    <div className="space-y-6">
      {/* palette for the active face */}
      <div>
        <PanelTitle>{ar ? "لون سريع للوجه المحدد" : "Quick colour for the active face"}</PanelTitle>
        <p className="mb-2 text-[11px] text-ink-500">{ar ? "ألوان الهوية" : "Brand colours"}</p>
        <div className="mb-3 grid grid-cols-8 gap-1.5">
          {[...BRAND_SWATCHES, ...PRESETS.filter((p) => !BRAND_SWATCHES.includes(p))].slice(0, 16).map((p) => (
            <button
              key={p}
              aria-label={p}
              title={p}
              onClick={() => setFace(surfaceKey, p)}
              className={cx("aspect-square rounded-md border transition hover:scale-110", current.background === p ? "border-sun ring-2 ring-sun/40" : "border-black/10")}
              style={{ background: p }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" disabled={!current.background} onClick={() => setAll(current.background)}>
            {t.studio.applyAll}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAll(null)}>
            {ar ? "إزالة كل الألوان" : "Clear all colours"}
          </Button>
        </div>
      </div>

      {/* every face */}
      <div>
        <PanelTitle>{ar ? "لون كل وجه" : "Colour per face"}</PanelTitle>
        <ul className="space-y-1.5">
          {specs.map((s) => {
            const active = s.key === surfaceKey;
            const can = printable(s.key);
            return (
              <li key={s.key} className={cx("rounded-xl border p-2 transition", active ? "border-sun bg-sun-100/50" : "border-navy/10 bg-white", !can && "opacity-40")}>
                <button type="button" disabled={!can} onClick={() => setSurfaceKey(s.key)} className="mb-1.5 flex w-full items-center justify-between text-start">
                  <span className="text-xs font-semibold text-navy">{s.label[locale]}</span>
                  <span className="num text-[10px] text-ink-500">
                    {Math.round(s.w)}×{Math.round(s.h)}
                  </span>
                </button>
                {can && (
                  <ColorField
                    label={s.label[locale]}
                    value={doc.surfaces[s.key].background}
                    onChange={(hex, live) => {
                      setSurfaceKey(s.key);
                      setFace(s.key, hex, live);
                    }}
                    onClear={() => setFace(s.key, null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* inside */}
      <div>
        <PanelTitle>{ar ? "لون العلبة من الداخل" : "Inside colour"}</PanelTitle>
        <ColorField label={ar ? "الداخل" : "Inside"} value={doc.interior} onChange={(hex, live) => update((d) => ({ ...d, interior: hex }), live ? "interior" : undefined)} onClear={() => update((d) => ({ ...d, interior: null }))} />
        <p className="mt-1.5 text-[11px] text-ink-500">{ar ? "يظهر عند فتح الغطاء في المعاينة ثلاثية الأبعاد (طباعة داخلية)." : "Visible when the lid is opened in 3D (inside print)."}</p>
      </div>

      {/* coating */}
      <div>
        <PanelTitle>{ar ? "طبقة السطح للوجه المحدد" : "Coating for the active face"}</PanelTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {COATINGS.map((co) => (
            <button
              key={co}
              aria-pressed={(current.coating ?? "none") === co}
              onClick={() => setCoating(surfaceKey, co)}
              className={cx("rounded-lg border px-2 py-1.5 text-[11px]", (current.coating ?? "none") === co ? "border-sun bg-sun-100/60 text-navy" : "border-navy/10 text-ink-500 hover:border-navy/30")}
            >
              {COATING_LABELS[co][locale]}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setCoating("all", current.coating ?? "none")}>
          {ar ? "نفس الطبقة لكل الأوجه" : "Same coating on every face"}
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-ink-500">{t.studio.colorNote}</p>
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
      {/* on desktop the selected-element inspector already shows these controls */}
      {selected?.type === "text" && (
        <div className="lg:hidden">
          <TextInspector el={selected} />
        </div>
      )}
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
                    {el.type === "text" ? el.text || "—" : el.type === "icon" ? ICONS[el.icon].label[locale] : "Logo"}
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
  const { selected, updateElement, removeElement, duplicateElement, centerElement, placeElement, moveElementToSurface, applyElementToAllSurfaces, specs, surfaceKey, printable, t, spec, template, locale } = useStudio();
  if (!selected) return null;
  const ar = locale === "ar";
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
      {/* quick placement: 9 anchor points inside the safe area */}
      <div className="grid grid-cols-[auto_1fr] items-start gap-3">
        <div>
          <p className="mb-1 text-[11px] text-ink-500">{ar ? "الموضع" : "Position"}</p>
          <div className="grid w-[78px] grid-cols-3 gap-1 rounded-lg border border-navy/10 bg-white p-1" dir="ltr">
            {([0, 1, 2] as const).flatMap((row) =>
              ([0, 1, 2] as const).map((col) => (
                <button
                  key={`${row}${col}`}
                  type="button"
                  aria-label={`${row}-${col}`}
                  onClick={() => placeElement(selected.id, col, row)}
                  className="grid aspect-square place-items-center rounded hover:bg-sun-100"
                >
                  <span className="size-1.5 rounded-full bg-navy/50" />
                </button>
              )),
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink-500">{ar ? "انقله إلى وجه آخر" : "Move to another face"}</span>
            <select className={cx(inputClass, "py-1.5 text-xs")} value={surfaceKey} onChange={(e) => moveElementToSurface(selected.id, e.target.value as SurfaceKey)}>
              {specs
                .filter((s) => printable(s.key))
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label[locale]}
                  </option>
                ))}
            </select>
          </label>
          <Button size="sm" variant="outline" className="w-full" onClick={() => applyElementToAllSurfaces(selected.id)}>
            {ar ? "كرّره على كل الأوجه" : "Repeat on every face"}
          </Button>
        </div>
      </div>
      {selected.type === "text" && <TextInspector el={selected} />}
      {selected.type === "icon" && (
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div>
            <p className="mb-1 text-[11px] text-ink-500">{t.studio.color}</p>
            <ColorField label={t.studio.color} value={selected.color} onChange={(hex, live) => updateElement(selected.id, { color: hex }, live ? `ic-${selected.id}` : undefined)} />
          </div>
          {ICONS[selected.icon].shape && (
            <label className="block w-20">
              <span className="mb-1 block text-[11px] text-ink-500">{t.studio.height}</span>
              <input
                type="text"
                inputMode="decimal"
                className={cx(inputClass, "num px-2 py-1.5")}
                value={Math.round(selected.height * 10) / 10}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (v > 0) updateElement(selected.id, { height: v }, `h-${selected.id}`);
                }}
              />
            </label>
          )}
        </div>
      )}
      <FinishPicker value={selected.finish ?? "none"} onChange={(f) => updateElement(selected.id, { finish: f })} />
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
  const usedFinishes = [...new Set(specs.flatMap((s) => doc.surfaces[s.key].elements.map((e) => e.finish ?? "none")).filter((x) => x !== "none"))] as Finish[];
  const finishing = doc.finishingCodes.map((c) => catalog.finishings.find((f) => f.code === c)).filter(Boolean);
  const rows: [string, React.ReactNode][] = [
    [t.studio.product, locale === "ar" ? template.nameAr : template.nameEn],
    [t.studio.dimensions, <span key="d" className="num">{`${L} × ${W} × ${H} mm`}</span>],
    [t.studio.material, material ? (locale === "ar" ? material.nameAr : material.nameEn) : "—"],
    [locale === "ar" ? "الطباعة" : "Printing", doc.printOption ? PRINT_LABELS[doc.printOption]?.[locale] ?? doc.printOption : "—"],
    [t.studio.finishing, finishing.length ? finishing.map((f) => (locale === "ar" ? f!.nameAr : f!.nameEn)).join("، ") : "—"],
    [t.studio.quantity, doc.quantity ? <span key="q" className="num">{doc.quantity.toLocaleString("en")}</span> : "—"],
    [t.studio.layers, <span key="e" className="num">{elements}</span>],
    [locale === "ar" ? "تشطيبات العناصر" : "Element finishes", usedFinishes.length ? usedFinishes.map((x) => FINISH_LABELS[x][locale]).join(locale === "ar" ? "، " : ", ") : "—"],
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

/* ───────────────────────── Finishes (البصمة / الكفراج / UV) ───────────────────────── */



const FINISH_SWATCH: Record<Finish, string> = {
  none: "bg-transparent",
  "foil-gold": "bg-[linear-gradient(135deg,#8a6420,#f3d58a_45%,#a87a2a_60%,#e8c46a)]",
  "foil-silver": "bg-[linear-gradient(135deg,#7d8188,#f1f3f6_45%,#9aa0a8_60%,#dfe2e6)]",
  emboss: "bg-[#c79a6b] shadow-[inset_2px_2px_0_rgba(255,255,255,0.5),inset_-2px_-2px_0_rgba(0,0,0,0.35)]",
  deboss: "bg-[#c79a6b] shadow-[inset_-2px_-2px_0_rgba(255,255,255,0.4),inset_2px_2px_0_rgba(0,0,0,0.4)]",
  "spot-uv": "bg-[linear-gradient(135deg,#2a1a10,#5a3a26_40%,#ffffff_50%,#5a3a26_60%,#2a1a10)]",
};

function FinishPicker({ value, onChange }: { value: Finish; onChange: (f: Finish) => void }) {
  const { locale } = useStudio();
  return (
    <div>
      <p className="mb-2 text-[11px] text-ink-500">{locale === "ar" ? "التشطيب (يظهر في المعاينة ثلاثية الأبعاد)" : "Finish (shown in the 3D preview)"}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {FINISHES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value === f}
            onClick={() => onChange(f)}
            className={cx("flex items-center gap-2 rounded-lg border px-2 py-1.5 text-start text-[11px]", value === f ? "border-sun bg-sun-100/50 text-navy" : "border-navy/10 text-ink-500 hover:border-navy/30")}
          >
            <span className={cx("size-4 shrink-0 rounded-sm border border-black/10", FINISH_SWATCH[f])} />
            {FINISH_LABELS[f][locale]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Elements (symbols & shapes) ───────────────────────── */

function IconPreview({ icon, color, size = 40 }: { icon: IconKey; color: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.height = size * dpr;
    const x = c.getContext("2d")!;
    x.setTransform(dpr, 0, 0, dpr, size / 2, size / 2);
    x.clearRect(-size, -size, size * 2, size * 2);
    const box = ICONS[icon].shape ? size * 0.7 : size * 0.82;
    drawIcon(x, icon, box, ICONS[icon].shape && icon === "shape-line" ? box * 0.5 : box, color);
  }, [icon, color, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

export function ElementsPanel() {
  const { addIcon, locale } = useStudio();
  const ar = locale === "ar";
  const [color, setColor] = useState("#2F357C");
  const groups: { key: "handling" | "marks" | "shapes"; ar: string; en: string }[] = [
    { key: "handling", ar: "علامات المناولة والشحن", en: "Handling symbols" },
    { key: "marks", ar: "علامات بيئية وغذائية", en: "Eco & food marks" },
    { key: "shapes", ar: "أشكال", en: "Shapes" },
  ];
  return (
    <div className="space-y-5">
      <PanelTitle>{ar ? "العناصر" : "Elements"}</PanelTitle>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ink-500">{ar ? "لون العنصر" : "Element colour"}</span>
        {["#2F357C", "#EA5B32", "#1D2235", "#FFFFFF", "#2F855A"].map((c) => (
          <button key={c} aria-label={c} onClick={() => setColor(c)} className={cx("size-6 rounded-md border", color === c ? "border-sun ring-2 ring-sun/40" : "border-black/10")} style={{ background: c }} />
        ))}
        <input type="color" aria-label={ar ? "لون مخصص" : "Custom colour"} value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-6 w-8 cursor-pointer rounded border border-navy/15" />
      </div>
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-2 text-[11px] font-semibold text-ink-500">{ar ? g.ar : g.en}</p>
          <div className="grid grid-cols-3 gap-2">
            {ICON_KEYS.filter((k) => ICONS[k].group === g.key).map((k) => (
              <button
                key={k}
                onClick={() => addIcon(k, color)}
                className="flex flex-col items-center gap-1 rounded-xl border border-navy/10 bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm"
              >
                <span className={cx("grid size-11 place-items-center rounded-lg", color.toUpperCase() === "#FFFFFF" ? "bg-navy" : "bg-paper")}>
                  <IconPreview icon={k} color={color} />
                </span>
                <span className="text-[10px] leading-tight text-navy">{ICONS[k].label[locale]}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-ink-500">
        {ar ? "العناصر متجهة (Vector) وتُطبع بحدة كاملة، ويمكن جعلها بصمة أو كفراج من لوحة العنصر المحدد." : "Elements are vector and print sharply; make them foil or embossed from the selected-element panel."}
      </p>
    </div>
  );
}

/* ───────────────────────── Ready-made designs ───────────────────────── */

export function PresetsPanel() {
  const { specs, update, doc, printable, locale } = useStudio();
  const ar = locale === "ar";
  const [brand, setBrand] = useState(ar ? "اسم علامتك" : "Your brand");
  const [tagline, setTagline] = useState(ar ? "صُنع بعناية" : "Made with care");
  const apply = (p: DesignPreset) => {
    const hasWork = SURFACE_KEYS.some((k) => doc.surfaces[k].elements.some((e) => e.type !== "image") || doc.surfaces[k].background);
    if (hasWork && !window.confirm(ar ? "سيستبدل هذا التصميم الألوان والنصوص الحالية (شعاراتك المرفوعة تبقى). متابعة؟" : "This replaces current colours and text (your uploaded logos are kept). Continue?")) return;
    const font: FontKey = /[\u0600-\u06FF]/.test(brand) ? "plexArabic" : "inter";
    update((d) => ({ ...d, surfaces: applyPreset(p, d.surfaces, { specs, brand: brand.trim() || "—", tagline: tagline.trim(), font, measure: measureText }, printable) }));
  };
  return (
    <div className="space-y-4">
      <PanelTitle>{ar ? "تصاميم جاهزة" : "Ready designs"}</PanelTitle>
      <p className="text-[11px] leading-relaxed text-ink-500">
        {ar ? "اكتب اسم علامتك ثم اختر تصميماً — يُطبَّق على كل أوجه العلبة بمقاساتها، ويمكنك تعديل أي شيء بعده." : "Type your brand name and pick a design — it's applied to every face at its real size, and you can edit anything afterwards."}
      </p>
      <div className="grid gap-2">
        <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 40))} placeholder={ar ? "اسم علامتك" : "Brand name"} dir="auto" />
        <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 60))} placeholder={ar ? "شعار نصي قصير (اختياري)" : "Short tagline (optional)"} dir="auto" />
      </div>
      <div className="grid gap-2">
        {DESIGN_PRESETS.map((p) => (
          <button key={p.key} onClick={() => apply(p)} className="flex items-center gap-3 rounded-xl border border-navy/10 bg-white p-2.5 text-start transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-sm">
            <span className="flex h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10">
              {p.swatches.map((sw) => (
                <span key={sw} className="h-full flex-1" style={{ background: sw }} />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy">{ar ? p.ar : p.en}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">{ar ? p.descAr : p.descEn}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
