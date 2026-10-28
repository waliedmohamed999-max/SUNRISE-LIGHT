"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, buttonClass, CopyIcon, Field, inputClass, PenIcon, Spinner, TrashIcon } from "@/components/ui";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? String(res.status));
  return res.json().catch(() => ({}));
}

export function MarkReadButton() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await send("/api/notifications", "POST");
        router.refresh();
      }}
    >
      {t.account.markRead}
    </Button>
  );
}

export function DesignCardActions({ id, name }: { id: string; name: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch {
      alert(t.common.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href={`/${locale}/studio?design=${id}`} className={buttonClass("primary", "sm")}>
        <PenIcon className="size-4" />
        {t.common.edit}
      </Link>
      <Link href={`/${locale}/quote?design=${id}`} className={buttonClass("outline", "sm")}>
        {t.studio.requestQuote}
      </Link>
      <span className="ms-auto flex">
        <button
          disabled={busy}
          title={t.common.rename}
          aria-label={t.common.rename}
          className="rounded-full p-2 text-navy-500 hover:bg-paper-200"
          onClick={() => {
            const next = window.prompt(t.common.rename, name)?.trim();
            if (next && next !== name) run(() => send(`/api/designs/${id}`, "PATCH", { name: next.slice(0, 120) }));
          }}
        >
          <PenIcon className="size-4" />
        </button>
        <button disabled={busy} title={t.common.duplicate} aria-label={t.common.duplicate} className="rounded-full p-2 text-navy-500 hover:bg-paper-200" onClick={() => run(() => send(`/api/designs/${id}/duplicate`, "POST"))}>
          {busy ? <Spinner /> : <CopyIcon className="size-4" />}
        </button>
        <button
          disabled={busy}
          title={t.common.delete}
          aria-label={t.common.delete}
          className="rounded-full p-2 text-danger/80 hover:bg-danger/8"
          onClick={() => window.confirm(t.account.deleteConfirm) && run(() => send(`/api/designs/${id}`, "DELETE"))}
        >
          <TrashIcon className="size-4" />
        </button>
      </span>
    </div>
  );
}

export function QuoteCustomerActions({ id, status }: { id: string; status: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<null | "revision">(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: "approve" | "revision" | "cancel") => {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/rfq/${id}/action`, "POST", { action, message: msg || undefined });
      setMode(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "offer_expired"
          ? locale === "ar"
            ? "انتهت صلاحية عرض السعر. اطلب تعديلًا ليرسل لك الفريق عرضًا محدّثًا."
            : "This quotation has expired. Request a revision to receive an updated one."
          : t.common.error,
      );
    } finally {
      setBusy(false);
    }
  };
  const final = ["APPROVED", "REJECTED", "CANCELLED"].includes(status);
  if (final) return null;
  return (
    <div className="space-y-3">
      {mode === "revision" ? (
        <>
          <Field label={t.account.requestRevision}>
            <textarea rows={3} className={inputClass} placeholder={t.account.revisionPh} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !msg.trim()} onClick={() => act("revision")}>
              {t.common.submit}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
              {t.common.cancel}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status === "QUOTE_SENT" && (
            <>
              <Button size="sm" variant="accent" disabled={busy} onClick={() => act("approve")}>
                {t.account.approve}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("revision")}>
                {t.account.requestRevision}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-danger" disabled={busy} onClick={() => window.confirm(`${t.account.cancelRequest}?`) && act("cancel")}>
            {t.account.cancelRequest}
          </Button>
        </div>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}

export function ProfileForm({ initial }: { initial: Record<string, string> }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label}>
      <input name={name} defaultValue={initial[name] ?? ""} className={inputClass} {...props} />
    </Field>
  );
  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        try {
          await send("/api/account", "PATCH", { ...Object.fromEntries(new FormData(e.currentTarget)), locale: (new FormData(e.currentTarget).get("locale") as string) || locale });
          setState("ok");
          router.refresh();
        } catch {
          setState("error");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {f("name", t.auth.name, { required: true, minLength: 2 })}
        {f("phone", t.auth.phone, { dir: "ltr", type: "tel" })}
        <Field label={t.auth.email}>
          <input value={initial.email} disabled dir="ltr" className={inputClass} />
        </Field>
        <Field label="Language / اللغة">
          <select name="locale" defaultValue={initial.locale} className={inputClass}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </Field>
        {f("city", t.account.city)}
        {f("address", t.account.address)}
      </div>
      <div>
        <h2 className="mb-4 font-semibold text-navy">{t.account.companyInfo}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {f("companyName", t.auth.company)}
          {f("crNumber", t.account.crNumber, { dir: "ltr" })}
          {f("vatNumber", t.account.vatNumber, { dir: "ltr" })}
        </div>
      </div>
      {state === "ok" && <Alert tone="ok">{t.account.profileSaved}</Alert>}
      {state === "error" && <Alert tone="danger">{t.common.error}</Alert>}
      <Button type="submit" disabled={state === "busy"}>
        {state === "busy" && <Spinner />}
        {t.common.save}
      </Button>
    </form>
  );
}
