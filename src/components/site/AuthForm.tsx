"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Button, EyeIcon, Field, inputClass, Spinner } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get("next") ?? "";
  // Only allow same-site relative redirects
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { ...fd, locale } : fd),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          j.error === "invalid_credentials"
            ? t.auth.invalid
            : j.error === "email_taken"
              ? t.auth.exists
              : j.error === "rate_limited"
                ? locale === "ar"
                  ? "محاولات كثيرة، حاول لاحقاً."
                  : "Too many attempts, try again later."
                : j.error === "validation"
                  ? (j.issues?.map((i: { path: string }) => i.path).join(", ") ?? "") + " — " + t.common.error
                  : t.common.error,
        );
        return;
      }
      router.push(next ?? (j.user?.isStaff ? `/${locale}/admin` : `/${locale}/account`));
      router.refresh();
    } catch {
      setError(t.common.error);
    } finally {
      setPending(false);
    }
  }

  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {mode === "register" && (
        <>
          <Field label={t.auth.name}>
            <input name="name" required minLength={2} autoComplete="name" className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.auth.phone}>
              <input name="phone" type="tel" dir="ltr" autoComplete="tel" className={inputClass} />
            </Field>
            <Field label={`${t.auth.company} (${t.common.optional})`}>
              <input name="company" autoComplete="organization" className={inputClass} />
            </Field>
          </div>
        </>
      )}
      <Field label={t.auth.email}>
        <input name="email" type="email" required dir="ltr" autoComplete="email" className={inputClass} />
      </Field>
      <Field label={t.auth.password} hint={mode === "register" ? t.auth.passwordHint : undefined}>
        <div className="relative">
          <input name="password" type={showPassword ? "text" : "password"} required minLength={mode === "register" ? 8 : 1} dir="ltr" autoComplete={mode === "register" ? "new-password" : "current-password"} className={`${inputClass} pe-11`} />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            aria-label={showPassword ? (locale === "ar" ? "إخفاء كلمة المرور" : "Hide password") : locale === "ar" ? "إظهار كلمة المرور" : "Show password"}
            className={`absolute inset-y-0 end-0 grid w-11 place-items-center ${showPassword ? "text-sun" : "text-ink-500 hover:text-navy"}`}
          >
            <EyeIcon className="size-4" />
          </button>
        </div>
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending && <Spinner />}
        {mode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
      </Button>
      <p className="border-t border-navy/8 pt-5 text-center text-sm text-ink-500">
        {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link href={`/${locale}/${mode === "login" ? "register" : "login"}${q}`} className="font-semibold text-navy underline-offset-4 hover:underline">
          {mode === "login" ? t.nav.register : t.nav.login}
        </Link>
      </p>
    </form>
  );
}
