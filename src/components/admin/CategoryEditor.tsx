"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Badge, Button, Card, cx, Field, inputClass, Spinner } from "@/components/ui";

type Status = "ACTIVE" | "COMING_SOON" | "HIDDEN";
interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  status: Status;
  sortOrder: number;
}

export const CATEGORY_STATUS: Record<Status, { ar: string; en: string; tone: "ok" | "warn" | "neutral" }> = {
  ACTIVE: { ar: "متاحة", en: "Active", tone: "ok" },
  COMING_SOON: { ar: "قريبًا", en: "Coming soon", tone: "warn" },
  HIDDEN: { ar: "مخفية", en: "Hidden", tone: "neutral" },
};

export function CategoryEditor({ initial, templates }: { initial: Category; templates: { total: number; enabled: number } }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(initial);
  const [state, setState] = useState<{ busy: boolean; error?: string; saved?: boolean }>({ busy: false });

  async function save(next = c) {
    setState({ busy: true });
    const { id, slug, ...body } = next;
    void slug;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ busy: false, error: `${t.common.error} (${j.error ?? res.status})` });
    setState({ busy: false, saved: true });
    router.refresh();
  }

  const st = CATEGORY_STATUS[c.status];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{ar ? c.nameAr : c.nameEn}</p>
          <p className="truncate text-xs text-ink-500">
            <code>{c.slug}</code> · {templates.enabled}/{templates.total} {ar ? "قالب مفعّل" : "templates enabled"} · {ar ? "الترتيب" : "order"} {c.sortOrder}
          </p>
        </div>
        <div role="radiogroup" aria-label={ar ? "حالة الفئة" : "Category status"} className="flex gap-1 rounded-lg bg-paper-200 p-1">
          {(Object.keys(CATEGORY_STATUS) as Status[]).map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={c.status === s}
              disabled={state.busy}
              onClick={() => {
                const next = { ...c, status: s };
                setC(next);
                void save(next);
              }}
              className={cx("rounded-md px-2.5 py-1 text-xs font-medium", c.status === s ? "bg-white text-navy shadow-sm" : "text-ink-500 hover:text-navy")}
            >
              {CATEGORY_STATUS[s][locale]}
            </button>
          ))}
        </div>
        <Badge tone={st.tone}>{st[locale]}</Badge>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t.common.cancel : t.common.edit}
        </Button>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 border-t border-navy/8 pt-4 md:grid-cols-2">
          <Field label={ar ? "الاسم بالعربية" : "Arabic name"}>
            <input className={inputClass} value={c.nameAr} onChange={(e) => setC({ ...c, nameAr: e.target.value })} dir="rtl" />
          </Field>
          <Field label={ar ? "الاسم بالإنجليزية" : "English name"}>
            <input className={inputClass} value={c.nameEn} onChange={(e) => setC({ ...c, nameEn: e.target.value })} dir="ltr" />
          </Field>
          <Field label={ar ? "الوصف بالعربية" : "Arabic description"}>
            <textarea className={inputClass} rows={2} value={c.descriptionAr} onChange={(e) => setC({ ...c, descriptionAr: e.target.value })} dir="rtl" />
          </Field>
          <Field label={ar ? "الوصف بالإنجليزية" : "English description"}>
            <textarea className={inputClass} rows={2} value={c.descriptionEn} onChange={(e) => setC({ ...c, descriptionEn: e.target.value })} dir="ltr" />
          </Field>
          <Field label={ar ? "ترتيب العرض" : "Display order"}>
            <input className={cx(inputClass, "num")} inputMode="numeric" value={c.sortOrder} onChange={(e) => setC({ ...c, sortOrder: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={() => save()} disabled={state.busy}>
              {state.busy ? <Spinner /> : t.common.save}
            </Button>
          </div>
        </div>
      )}
      {state.error && (
        <Alert tone="danger" className="mt-3">
          {state.error}
        </Alert>
      )}
    </Card>
  );
}
