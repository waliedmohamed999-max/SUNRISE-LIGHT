import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { AuthShell } from "@/components/site/AuthShell";
import { ResetForm } from "@/components/site/RecoveryForms";

// the address holds a one-time token: never indexed, never passed on to other sites
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

const points = (ar: boolean) => (ar ? ["رابط يعمل لمرة واحدة ولمدة ساعة", "تُغلق كل الجلسات المفتوحة بعد التغيير"] : ["The link works once, for one hour", "Every open session is signed out afterwards"]);

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  const { token = "" } = await searchParams;
  const ar = locale === "ar";
  return (
    <AuthShell locale={locale} title={ar ? "كلمة مرور جديدة" : "Set a new password"} aside={ar ? "استعادة الحساب" : "Account recovery"} points={points(ar)}>
      <ResetForm locale={locale} token={token} />
    </AuthShell>
  );
}
