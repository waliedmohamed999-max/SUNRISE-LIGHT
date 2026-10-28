"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, Field, inputClass, Spinner } from "@/components/ui";

export function ContactForm() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error" | "rate">("idle");
  if (state === "ok") return <Alert tone="ok">{t.pages.contactSent}</Alert>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        const body = Object.fromEntries(new FormData(e.currentTarget));
        const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
        setState(res?.ok ? "ok" : res?.status === 429 ? "rate" : "error");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.pages.name}>
          <input name="name" required minLength={2} autoComplete="name" className={inputClass} />
        </Field>
        <Field label={`${t.pages.phone} (${t.common.optional})`}>
          <input name="phone" type="tel" dir="ltr" autoComplete="tel" className={inputClass} />
        </Field>
      </div>
      <Field label={t.pages.email}>
        <input name="email" type="email" required dir="ltr" autoComplete="email" className={inputClass} />
      </Field>
      <Field label={t.pages.message}>
        <textarea name="message" rows={5} required minLength={5} maxLength={4000} className={inputClass} />
      </Field>
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <Alert tone="danger">{t.common.error}</Alert>}
      {state === "rate" && <Alert tone="warn">{locale === "ar" ? "محاولات كثيرة، حاول لاحقاً." : "Too many attempts, try later."}</Alert>}
      <Button type="submit" disabled={state === "busy"}>
        {state === "busy" && <Spinner />}
        {t.common.submit}
      </Button>
    </form>
  );
}
