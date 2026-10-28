import type { Metadata } from "next";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { AuthShell } from "@/components/site/AuthShell";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const points = locale === "ar"
    ? ["صمّم علبتك بالمقاسات الدقيقة بالمليمتر", "عاين التصميم ثلاثي الأبعاد قبل التصنيع", "احفظ تصاميمك واطلب عرض سعر من المصنع"]
    : ["Design your box to exact millimetre dimensions", "Preview it in 3D before manufacturing", "Save designs and request a factory quotation"];
  return (
    <AuthShell locale={locale} title={t.auth.loginTitle} subtitle={locale === "ar" ? "أهلًا بعودتك — سجّل دخولك لمتابعة تصاميمك وطلباتك." : "Welcome back — sign in to continue with your designs and requests."} aside={t.brand.tagline} points={points}>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
