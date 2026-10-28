import type { Metadata } from "next";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { AuthShell } from "@/components/site/AuthShell";
import { AuthForm } from "@/components/site/AuthForm";

export const metadata: Metadata = { robots: { index: false } };

export default async function RegisterPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  return (
    <AuthShell title={t.auth.registerTitle} aside={t.home.studioBody}>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
