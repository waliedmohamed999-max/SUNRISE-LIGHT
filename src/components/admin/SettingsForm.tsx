"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Card, cx, inputClass, Spinner } from "@/components/ui";
import { SETTING_GROUPS, validateSetting, type SettingField } from "@/lib/site-settings";

type Values = Record<string, { ar: string; en: string }>;

const ERRORS = {
  phone: { ar: "رقم غير صالح", en: "Invalid number" },
  email: { ar: "بريد غير صالح", en: "Invalid email" },
  url: { ar: "يجب أن يبدأ الرابط بـ https://", en: "Link must start with https://" },
};

/** Structured company settings (contact, legal, social) saved as website-content keys. */
export function SettingsForm({ initial }: { initial: Values }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; error?: string }>({ busy: false });

  const get = (k: string) => v[k] ?? { ar: "", en: "" };
  const set = (f: SettingField, lang: "ar" | "en" | "both", value: string) =>
    setV((prev) => ({ ...prev, [f.key]: lang === "both" ? { ar: value, en: value } : { ...get(f.key), [lang]: value } }));
  const fields = SETTING_GROUPS.flatMap((g) => g.fields);
  const invalid = fields.filter((f) => validateSetting(f.kind, get(f.key).ar) || validateSetting(f.kind, get(f.key).en));

  async function save() {
    if (invalid.length) return;
    setState({ busy: true });
    const entries = fields.map((f) => ({ key: f.key, valueAr: get(f.key).ar.trim(), valueEn: (f.bilingual ? get(f.key).en : get(f.key).ar).trim() }));
    const res = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "content", entries }) });
    if (!res.ok) return setState({ busy: false, error: `${t.common.error} (${res.status})` });
    setState({ busy: false, ok: true });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {SETTING_GROUPS.map((g) => (
        <Card key={g.id} className="p-6">
          <h2 className="mb-5 font-semibold text-navy">{g.label[locale]}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {g.fields.map((f) => {
              const val = get(f.key);
              const err = validateSetting(f.kind, val.ar) ?? validateSetting(f.kind, val.en);
              const ltr = f.kind !== "text";
              return (
                <div key={f.key} className={cx(f.bilingual && "md:col-span-2")}>
                  <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor={f.key}>
                    {f.label[locale]}
                  </label>
                  {f.bilingual ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <input id={f.key} dir="rtl" placeholder={ar ? "بالعربية" : "Arabic"} value={val.ar} onChange={(e) => set(f, "ar", e.target.value)} className={inputClass} />
                      <input dir="ltr" placeholder={ar ? "بالإنجليزية" : "English"} value={val.en} onChange={(e) => set(f, "en", e.target.value)} className={inputClass} />
                    </div>
                  ) : (
                    <input
                      id={f.key}
                      dir={ltr ? "ltr" : undefined}
                      type={f.kind === "email" ? "email" : f.kind === "url" ? "url" : f.kind === "phone" ? "tel" : "text"}
                      placeholder={f.placeholder}
                      value={val.ar}
                      onChange={(e) => set(f, "both", e.target.value)}
                      aria-invalid={!!err}
                      className={cx(inputClass, err && "border-danger")}
                    />
                  )}
                  {err ? <p className="mt-1 text-xs text-danger">{ERRORS[err][locale]}</p> : f.hint && <p className="mt-1 text-xs text-ink-500">{f.hint[locale]}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-navy/10 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button onClick={save} disabled={state.busy || invalid.length > 0}>
          {state.busy && <Spinner />}
          {t.common.save}
        </Button>
        {invalid.length > 0 && <span className="text-xs text-danger">{ar ? `صحّح ${invalid.length} حقلًا قبل الحفظ` : `Fix ${invalid.length} field(s) before saving`}</span>}
        {state.ok && !state.busy && <span className="text-xs text-ok">{ar ? "تم الحفظ — التغييرات ظاهرة في الموقع الآن." : "Saved — the site shows the changes now."}</span>}
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <span className="ms-auto text-xs text-ink-500">{ar ? "الحقول الفارغة لا تظهر في الموقع." : "Empty fields are not shown on the site."}</span>
      </div>
    </div>
  );
}
