"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuotationStatus } from "@prisma/client";
import { useI18n } from "@/i18n/client";
import type { DesignDocument } from "@/design/document";
import { downloadBlob } from "@/design/render";
import { DesignPreview } from "@/components/studio/DesignPreview";
import { Alert, Button, buttonClass, Card, cx, Field, inputClass, Spinner } from "@/components/ui";

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? String(res.status));
  return j;
}

interface Props {
  id: string;
  status: QuotationStatus;
  transitions: QuotationStatus[];
  assignedToId: string | null;
  staff: { id: string; name: string }[];
  canAssign: boolean;
}

export function AdminQuotePanel(p: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [note, setNote] = useState({ body: "", internal: true });
  const run = async (key: string, fn: () => Promise<unknown>, ok = t.common.saved) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "ok", text: ok });
      router.refresh();
      return true;
    } catch (e) {
      const code = (e as Error).message;
      setMsg({ tone: "danger", text: code === "forbidden" ? t.admin.forbidden : code === "status_changed" || code === "invalid_transition" ? `${t.common.error} (${code})` : t.common.error });
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold text-navy">{t.admin.changeStatus}</h2>
        {p.transitions.length === 0 ? (
          <p className="text-sm text-ink-500">—</p>
        ) : (
          <>
            <textarea rows={2} className={inputClass} placeholder={t.admin.note} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={2000} />
            <div className="flex flex-wrap gap-2">
              {p.transitions.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "REJECTED" || s === "CANCELLED" ? "ghost" : "outline"}
                  className={cx((s === "REJECTED" || s === "CANCELLED") && "text-danger")}
                  disabled={!!busy}
                  onClick={async () => {
                    if ((s === "REJECTED" || s === "CANCELLED") && !window.confirm(`${t.status[s]}?`)) return;
                    if (await run(`st-${s}`, () => call(`/api/admin/rfq/${p.id}`, "PATCH", { status: s, note: statusNote || undefined }))) setStatusNote("");
                  }}
                >
                  {busy === `st-${s}` && <Spinner />}→ {t.status[s]}
                </Button>
              ))}
            </div>
          </>
        )}
        {p.canAssign && (
          <Field label={t.admin.assignee}>
            <select
              className={inputClass}
              value={p.assignedToId ?? ""}
              disabled={!!busy}
              onChange={(e) => run("assign", () => call(`/api/admin/rfq/${p.id}`, "PATCH", { assignedToId: e.target.value || null }))}
            >
              <option value="">{t.admin.unassigned}</option>
              {p.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-semibold text-navy">{t.admin.addNote}</h2>
        <textarea rows={3} className={inputClass} value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} maxLength={4000} />
        <div role="radiogroup" className="flex gap-2 text-sm">
          {[true, false].map((internal) => (
            <label key={String(internal)} className={cx("cursor-pointer rounded-full border px-3 py-1.5", note.internal === internal ? "border-navy bg-navy text-white" : "border-navy/15")}>
              <input type="radio" className="sr-only" checked={note.internal === internal} onChange={() => setNote({ ...note, internal })} />
              {internal ? t.admin.internalNote : t.admin.customerFeedback}
            </label>
          ))}
        </div>
        <Button
          size="sm"
          disabled={!note.body.trim() || !!busy}
          onClick={async () => {
            if (await run("note", () => call(`/api/admin/rfq/${p.id}/notes`, "POST", note))) setNote({ body: "", internal: true });
          }}
        >
          {busy === "note" && <Spinner />}
          {t.admin.addNote}
        </Button>
      </Card>
    </div>
  );
}

export function JsonDownload({ doc, name, label }: { doc: DesignDocument; name: string; label: string }) {
  return (
    <button
      className={buttonClass("outline", "sm")}
      onClick={() => downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }), `${name.replace(/[^\p{L}\p{N}_-]+/gu, "-")}.json`)}
    >
      {label}
    </button>
  );
}

export function AdminDesignViewer({ doc, engineKey, materialColor, previewAssetId }: { doc: DesignDocument; engineKey: string; materialColor: string; previewAssetId: string | null }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-navy/8 bg-paper">
      <DesignPreview
        doc={doc}
        engineKey={engineKey}
        materialColor={materialColor}
        className="absolute inset-0"
        fallback={
          previewAssetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/assets/${previewAssetId}`} alt="" className="h-full w-full object-contain" />
          ) : null
        }
      />
    </div>
  );
}
