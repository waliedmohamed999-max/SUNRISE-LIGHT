"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, Badge, Button, Field, inputClass, Spinner } from "@/components/ui";
import { qrMatrix } from "@/design/codes";

function QrSvg({ value }: { value: string }) {
  const m = useMemo(() => qrMatrix(value), [value]);
  const n = m.length;
  return (
    <svg viewBox={`-4 -4 ${n + 8} ${n + 8}`} className="size-48 rounded-xl bg-white p-1" role="img" aria-label="QR">
      {m.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#1D2235" /> : null)))}
    </svg>
  );
}

/** Two-step verification (TOTP) — set up, confirm, disable. */
export function MfaPanel({ enabled, available, required }: { enabled: boolean; available: boolean; required: boolean }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<{ busy: boolean; error?: string; ok?: string }>({ busy: false });

  const ERR: Record<string, string> = {
    mfa_invalid: ar ? "الرمز غير صحيح — تأكد من ضبط الوقت في الجوال وأعد المحاولة" : "Wrong code — check the phone's clock and try again",
    wrong_password: ar ? "كلمة المرور غير صحيحة" : "Wrong password",
    mfa_not_configured: ar ? "التحقق بخطوتين غير مهيأ على الخادم (MFA_ENCRYPTION_KEY)" : "Two-step verification is not configured on the server (MFA_ENCRYPTION_KEY)",
    rate_limited: ar ? "محاولات كثيرة، حاول لاحقًا." : "Too many attempts, try again later.",
  };

  async function call(body: object) {
    setState({ busy: true });
    const res = await fetch("/api/account/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ busy: false, error: ERR[j.error] ?? (ar ? "حدث خطأ" : "Something went wrong") });
      return null;
    }
    setState({ busy: false });
    return j;
  }

  if (!available) {
    return <Alert tone="warn">{ERR.mfa_not_configured}</Alert>;
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-ink">
          <Badge tone="ok">{ar ? "مفعّل" : "On"}</Badge>
          {ar ? "يُطلب رمز من تطبيق المصادقة عند كل تسجيل دخول." : "A code from your authenticator app is required at every sign-in."}
        </p>
        {!required && (
          <form
            className="grid gap-3 sm:grid-cols-3 sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await call({ action: "disable", password, code })) {
                setState({ busy: false, ok: ar ? "تم إيقاف التحقق بخطوتين." : "Two-step verification turned off." });
                router.refresh();
              }
            }}
          >
            <Field label={ar ? "كلمة المرور" : "Password"}>
              <input type="password" required dir="ltr" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label={ar ? "رمز التحقق" : "Code"}>
              <input required inputMode="numeric" autoComplete="one-time-code" maxLength={7} dir="ltr" className={`${inputClass} num`} value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline" disabled={state.busy}>
              {state.busy && <Spinner />}
              {ar ? "إيقاف التحقق بخطوتين" : "Turn off"}
            </Button>
          </form>
        )}
        {required && <p className="text-xs text-ink-500">{ar ? "مطلوب لحسابات فريق المصنع. لإعادة الضبط تواصل مع مدير النظام." : "Required for factory staff accounts. Ask a super admin to reset it."}</p>}
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && <Alert tone="ok">{state.ok}</Alert>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-500">
        {ar
          ? "أضف حماية ثانية لحسابك: بعد كلمة المرور يُطلب رمز من 6 أرقام من تطبيق مصادقة على جوالك (Google Authenticator أو Microsoft Authenticator أو غيرهما)."
          : "Add a second layer: after your password, a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, …) is required."}
      </p>
      {!setup ? (
        <Button
          disabled={state.busy}
          onClick={async () => {
            const j = await call({ action: "setup" });
            if (j) setSetup(j);
          }}
        >
          {state.busy && <Spinner />}
          {ar ? "تفعيل التحقق بخطوتين" : "Set up two-step verification"}
        </Button>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <QrSvg value={setup.uri} />
          <div className="space-y-3">
            <p className="text-sm text-ink">{ar ? "١. امسح الرمز بتطبيق المصادقة، أو أدخل المفتاح يدويًا:" : "1. Scan the code with your authenticator app, or enter the key manually:"}</p>
            <code dir="ltr" className="block rounded-lg bg-paper px-3 py-2 text-sm font-semibold tracking-wider break-all text-navy select-all">
              {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
            </code>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await call({ action: "enable", code })) {
                  setSetup(null);
                  setCode("");
                  setState({ busy: false, ok: ar ? "تم التفعيل. سُجّل الخروج من الأجهزة الأخرى." : "Enabled. Other devices were signed out." });
                  router.refresh();
                }
              }}
            >
              <Field label={ar ? "٢. أدخل الرمز الظاهر في التطبيق" : "2. Enter the code shown in the app"}>
                <input required autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={7} dir="ltr" className={`${inputClass} num w-40 text-center tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value)} />
              </Field>
              <Button type="submit" disabled={state.busy}>
                {state.busy && <Spinner />}
                {ar ? "تأكيد وتفعيل" : "Confirm & enable"}
              </Button>
            </form>
          </div>
        </div>
      )}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="ok">{state.ok}</Alert>}
    </div>
  );
}
