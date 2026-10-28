"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Card, Field, inputClass, Spinner, TrashIcon } from "@/components/ui";

function useSave() {
  const router = useRouter();
  const { t } = useI18n();
  const [state, setState] = useState<{ busy: boolean; msg?: { tone: "ok" | "danger"; text: string } }>({ busy: false });
  const save = async (body: unknown) => {
    setState({ busy: true });
    const res = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setState({ busy: false, msg: res.ok ? { tone: "ok", text: t.common.saved } : { tone: "danger", text: t.common.error } });
    if (res.ok) router.refresh();
    return res.ok;
  };
  return { state, save };
}

const KEY_LABELS: Record<string, string> = {
  "contact.phone": "Phone / الهاتف",
  "contact.email": "Email / البريد",
  "contact.whatsapp": "WhatsApp / واتساب",
  "contact.address": "Address / العنوان",
  "contact.hours": "Working hours / ساعات العمل",
  "about.body": "About page / صفحة عن المصنع",
  "services.body": "Services page / صفحة الخدمات",
  "privacy.body": "Privacy policy (approved text) / سياسة الخصوصية (النص المعتمد)",
  "terms.body": "Terms & conditions (approved text) / الشروط والأحكام (النص المعتمد)",
};

export function ContentEditor({ entries }: { entries: { key: string; valueAr: string; valueEn: string }[] }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(entries);
  const { state, save } = useSave();
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-semibold text-navy">{t.admin.content}</h2>
      <p className="text-xs text-ink-500">{locale === "ar" ? "اترك صفحتي الخصوصية والشروط فارغتين لعرض المسودة الافتراضية مع تنبيه المراجعة؛ بمجرد لصق النص المعتمد قانونيًا يختفي التنبيه." : "Leave privacy and terms empty to show the built-in draft with its review notice; once you paste the legally approved text the notice disappears."}</p>
      {rows.map((r, i) => {
        const long = r.key.endsWith(".body");
        const Input = long ? "textarea" : "input";
        return (
          <div key={r.key} className="grid gap-3 border-b border-navy/6 pb-4 md:grid-cols-[200px_1fr_1fr]">
            <p className="pt-2 text-sm font-medium text-navy">{KEY_LABELS[r.key] ?? r.key}</p>
            <Field label={t.admin.valueAr}>
              <Input rows={long ? 6 : undefined} dir="rtl" className={inputClass} value={r.valueAr} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRows(rows.map((x, j) => (j === i ? { ...x, valueAr: e.target.value } : x)))} />
            </Field>
            <Field label={t.admin.valueEn}>
              <Input rows={long ? 6 : undefined} dir="ltr" className={inputClass} value={r.valueEn} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRows(rows.map((x, j) => (j === i ? { ...x, valueEn: e.target.value } : x)))} />
            </Field>
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <Button onClick={() => save({ type: "content", entries: rows })} disabled={state.busy}>
          {state.busy && <Spinner />}
          {t.common.save}
        </Button>
        {state.msg && <Alert tone={state.msg.tone}>{state.msg.text}</Alert>}
      </div>
    </Card>
  );
}

interface Faq {
  id?: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  published: boolean;
  sortOrder: number;
}

export function FaqEditor({ items }: { items: Faq[] }) {
  const { t } = useI18n();
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-semibold text-navy">{t.admin.faq}</h2>
      {items.map((f) => (
        <FaqRow key={f.id} initial={f} />
      ))}
      <FaqRow initial={{ questionAr: "", questionEn: "", answerAr: "", answerEn: "", published: true, sortOrder: items.length }} isNew />
    </Card>
  );
}

function FaqRow({ initial, isNew }: { initial: Faq; isNew?: boolean }) {
  const { t } = useI18n();
  const [f, setF] = useState(initial);
  const { state, save } = useSave();
  return (
    <div className="space-y-2 rounded-xl border border-navy/8 p-4">
      {isNew && <p className="text-sm font-semibold text-navy">+ {t.admin.addFaq}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        <input className={inputClass} dir="rtl" placeholder="السؤال" value={f.questionAr} onChange={(e) => setF({ ...f, questionAr: e.target.value })} />
        <input className={inputClass} dir="ltr" placeholder="Question" value={f.questionEn} onChange={(e) => setF({ ...f, questionEn: e.target.value })} />
        <textarea rows={2} className={inputClass} dir="rtl" placeholder="الإجابة" value={f.answerAr} onChange={(e) => setF({ ...f, answerAr: e.target.value })} />
        <textarea rows={2} className={inputClass} dir="ltr" placeholder="Answer" value={f.answerEn} onChange={(e) => setF({ ...f, answerEn: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />
          {t.admin.published}
        </label>
        <Button
          size="sm"
          disabled={state.busy || !f.questionAr || !f.answerAr}
          onClick={async () => {
            if ((await save({ type: "faq", ...f })) && isNew) setF(initial);
          }}
        >
          {t.common.save}
        </Button>
        {f.id && (
          <button className="rounded-full p-2 text-danger" aria-label={t.common.delete} onClick={() => window.confirm(`${t.common.delete}?`) && save({ type: "faq", id: f.id, delete: true })}>
            <TrashIcon className="size-4" />
          </button>
        )}
        {state.msg && <span className={state.msg.tone === "ok" ? "text-xs text-ok" : "text-xs text-danger"}>{state.msg.text}</span>}
      </div>
    </div>
  );
}

interface Portfolio {
  id?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  imageUrl: string;
  published: boolean;
  sortOrder: number;
}

export function PortfolioEditor({ items }: { items: Portfolio[] }) {
  const { t, locale } = useI18n();
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-semibold text-navy">{t.admin.portfolio}</h2>
      <p className="text-xs text-ink-500">
        {locale === "ar" ? "انشر فقط أعمالاً حقيقية لديك إذن من العميل بعرضها." : "Only publish real projects you have the customer's permission to show."}
      </p>
      {items.map((p) => (
        <PortfolioRow key={p.id} initial={p} />
      ))}
      <PortfolioRow initial={{ titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "", imageUrl: "", published: false, sortOrder: items.length }} isNew />
    </Card>
  );
}

function PortfolioRow({ initial, isNew }: { initial: Portfolio; isNew?: boolean }) {
  const { t } = useI18n();
  const [p, setP] = useState(initial);
  const { state, save } = useSave();
  return (
    <div className="space-y-2 rounded-xl border border-navy/8 p-4">
      {isNew && <p className="text-sm font-semibold text-navy">+ {t.admin.addPortfolio}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        <input className={inputClass} dir="rtl" placeholder="العنوان" value={p.titleAr} onChange={(e) => setP({ ...p, titleAr: e.target.value })} />
        <input className={inputClass} dir="ltr" placeholder="Title" value={p.titleEn} onChange={(e) => setP({ ...p, titleEn: e.target.value })} />
        <textarea rows={2} className={inputClass} dir="rtl" placeholder="الوصف" value={p.descriptionAr} onChange={(e) => setP({ ...p, descriptionAr: e.target.value })} />
        <textarea rows={2} className={inputClass} dir="ltr" placeholder="Description" value={p.descriptionEn} onChange={(e) => setP({ ...p, descriptionEn: e.target.value })} />
        <input className={`${inputClass} md:col-span-2`} dir="ltr" placeholder="https://… image URL" value={p.imageUrl} onChange={(e) => setP({ ...p, imageUrl: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.published} onChange={(e) => setP({ ...p, published: e.target.checked })} />
          {t.admin.published}
        </label>
        <Button
          size="sm"
          disabled={state.busy || !p.titleAr || !p.titleEn}
          onClick={async () => {
            if ((await save({ type: "portfolio", ...p, imageUrl: p.imageUrl || null })) && isNew) setP(initial);
          }}
        >
          {t.common.save}
        </Button>
        {p.id && (
          <button className="rounded-full p-2 text-danger" aria-label={t.common.delete} onClick={() => window.confirm(`${t.common.delete}?`) && save({ type: "portfolio", id: p.id, delete: true })}>
            <TrashIcon className="size-4" />
          </button>
        )}
        {state.msg && <span className={state.msg.tone === "ok" ? "text-xs text-ok" : "text-xs text-danger"}>{state.msg.text}</span>}
      </div>
    </div>
  );
}
