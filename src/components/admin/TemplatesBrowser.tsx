"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Badge, cx, inputClass } from "@/components/ui";
import { TemplateGlyph } from "@/components/studio/TemplateGlyph";
import { TemplateEditor } from "./TemplateEditor";

type EditorProps = React.ComponentProps<typeof TemplateEditor>;
export type TemplateRow = Omit<EditorProps, "materials" | "canManage" | "canValidate">;
type Filter = "all" | "enabled" | "disabled" | "unvalidated" | "validated";

/** Compact, searchable list of templates; one editor opens at a time. */
export function TemplatesBrowser({ rows, materials, canManage, canValidate, initialFilter }: { rows: TemplateRow[]; materials: EditorProps["materials"]; canManage: boolean; canValidate: boolean; initialFilter?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState<Filter>((["all", "enabled", "disabled", "unvalidated", "validated"] as const).find((f) => f === initialFilter) ?? "all");
  const [open, setOpen] = useState<string | null>(null);

  const cats = useMemo(() => [...new Set(rows.map((r) => r.meta.category))], [rows]);
  const shown = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && ![r.initial.nameAr, r.initial.nameEn, r.meta.code, r.meta.engineKey].some((x) => x.toLowerCase().includes(s))) return false;
    if (cat && r.meta.category !== cat) return false;
    if (filter === "enabled" && !r.initial.isEnabled) return false;
    if (filter === "disabled" && r.initial.isEnabled) return false;
    if (filter === "unvalidated" && r.initial.dielineValidated) return false;
    if (filter === "validated" && !r.initial.dielineValidated) return false;
    return true;
  });
  const validated = rows.filter((r) => r.initial.dielineValidated).length;

  const FILTERS: [Filter, string][] = [
    ["all", ar ? "الكل" : "All"],
    ["enabled", ar ? "مفعّلة" : "Enabled"],
    ["disabled", ar ? "معطّلة" : "Disabled"],
    ["unvalidated", ar ? "مخطط غير معتمد" : "Dieline not validated"],
    ["validated", ar ? "مخطط معتمد" : "Dieline validated"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-navy/8 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-ink-500">
          <span>{ar ? "اعتماد المخططات هندسيًا" : "Dieline validation"}</span>
          <span className="num font-semibold text-navy">
            {validated} / {rows.length}
          </span>
        </div>
        <div className="mb-4 h-2 rounded-full bg-navy/6">
          <div className="h-2 rounded-full bg-ok" style={{ width: `${(validated / Math.max(1, rows.length)) * 100}%` }} />
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "بحث بالاسم أو الكود…" : "Search name or code…"} className={inputClass} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputClass}>
            <option value="">{ar ? "كل الفئات" : "All categories"}</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map(([f, label]) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} className={cx("rounded-full border px-3 py-1 text-xs font-medium", filter === f ? "border-navy bg-navy text-white" : "border-navy/15 text-navy hover:border-navy/40")}>
              {label}
            </button>
          ))}
          <span className="num ms-auto self-center text-xs text-ink-500">
            {shown.length} {ar ? "قالب" : "templates"}
          </span>
        </div>
      </div>

      <ul className="space-y-2">
        {shown.map((r) => {
          const isOpen = open === r.initial.id;
          return (
            <li key={r.initial.id} className={cx("rounded-[var(--radius-card)] border bg-white", isOpen ? "border-navy/30 shadow-[var(--shadow-card)]" : "border-navy/8")}>
              <button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.initial.id)} className="flex w-full items-center gap-4 p-3 text-start">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-paper text-navy">
                  <TemplateGlyph engineKey={r.meta.engineKey} className="size-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{ar ? r.initial.nameAr : r.initial.nameEn}</span>
                  <span className="block truncate text-xs text-ink-500">
                    <code>{r.meta.code}</code> · {r.meta.category} · {r.initial.defaults.length}×{r.initial.defaults.width}×{r.initial.defaults.height} {ar ? "مم" : "mm"}
                  </span>
                </span>
                <span className="hidden text-xs text-ink-500 md:block">
                  v{r.initial.version} · {r.meta.designs} {ar ? "تصميم" : "designs"}
                </span>
                <Badge tone={r.initial.isEnabled ? "ok" : "neutral"}>{r.initial.isEnabled ? (ar ? "مفعّل" : "Enabled") : ar ? "معطّل" : "Disabled"}</Badge>
                <Badge tone={r.initial.dielineValidated ? "ok" : "warn"}>{r.initial.dielineValidated ? (ar ? "معتمد" : "Validated") : ar ? "غير معتمد" : "Not validated"}</Badge>
                <span aria-hidden className={cx("text-ink-500 transition", isOpen && "rotate-180")}>
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-navy/8 p-3">
                  <TemplateEditor {...r} materials={materials} canManage={canManage} canValidate={canValidate} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="py-10 text-center text-sm text-ink-500">{ar ? "لا توجد قوالب مطابقة." : "No matching templates."}</p>}
    </div>
  );
}
