import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { SETTING_KEYS } from "@/lib/site-settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettings({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "content.manage")) notFound();
  const rows = await db.websiteContent.findMany({ where: { key: { in: SETTING_KEYS } } });
  const initial = Object.fromEntries(rows.map((r) => [r.key, { ar: r.valueAr, en: r.valueEn }]));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{ar ? "إعدادات الشركة" : "Company settings"}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          {ar
            ? "بيانات التواصل والبيانات النظامية والحسابات الاجتماعية. تظهر في تذييل الموقع وصفحة التواصل وعروض الأسعار — أدخل البيانات الحقيقية المعتمدة فقط."
            : "Contact, legal and social details. Shown in the site footer, the contact page and quotations — enter only real, approved information."}
        </p>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
