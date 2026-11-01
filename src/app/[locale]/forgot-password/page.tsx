import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { AuthShell } from "@/components/site/AuthShell";
import { ForgotForm } from "@/components/site/RecoveryForms";
import { Alert } from "@/components/ui";
import { emailConfigured } from "@/lib/notifications";

export const metadata: Metadata = { robots: { index: false } };

const points = (ar: boolean) => (ar ? ["رابط يعمل لمرة واحدة ولمدة ساعة", "تُغلق كل الجلسات المفتوحة بعد التغيير"] : ["The link works once, for one hour", "Every open session is signed out afterwards"]);

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  return (
    <AuthShell locale={locale} title={ar ? "نسيت كلمة المرور؟" : "Forgot your password?"} subtitle={ar ? "اكتب بريدك وسنرسل لك رابطًا لتعيين كلمة جديدة." : "Enter your email and we will send a link to set a new one."} aside={ar ? "استعادة الحساب" : "Account recovery"} points={points(ar)}>
      {emailConfigured() ? (
        <ForgotForm locale={locale} />
      ) : (
        // no provider yet: say what actually works rather than promise a message that will never come
        <Alert tone="warn">
          {ar ? "الاستعادة عبر البريد غير متاحة حاليًا. " : "Recovery by email is not available right now. "}
          <Link href={`/${locale}/contact`} className="font-semibold underline">
            {ar ? "تواصل معنا" : "Contact us"}
          </Link>
          {ar ? " وسنعيد ضبط كلمة المرور لك." : " and we will reset your password."}
        </Alert>
      )}
    </AuthShell>
  );
}
