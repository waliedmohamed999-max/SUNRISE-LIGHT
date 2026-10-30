import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { getPricing } from "@/lib/pricing-store";
import { PricingEditor } from "@/components/admin/PricingEditor";

export default async function AdminPricing({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "pricing.manage")) notFound();

  const [config, materials, finishings, templates, lastChange] = await Promise.all([
    getPricing(),
    db.materialType.findMany({ orderBy: { sortOrder: "asc" }, select: { code: true, nameAr: true, nameEn: true, kind: true, isAvailable: true } }),
    db.finishingOption.findMany({ where: { code: { not: "none" } }, orderBy: { sortOrder: "asc" }, select: { code: true, nameAr: true, nameEn: true, isAvailable: true } }),
    db.packagingTemplate.findMany({
      where: { isEnabled: true, currentVersionId: { not: null } },
      orderBy: { sortOrder: "asc" },
      select: { code: true, nameAr: true, nameEn: true, engineKey: true, materialRules: { select: { material: { select: { code: true } } } } },
    }),
    db.auditLog.findFirst({ where: { action: "pricing.update" }, orderBy: { createdAt: "desc" }, select: { createdAt: true, actor: { select: { name: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{ar ? "التسعير التلقائي" : "Automatic pricing"}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          {ar
            ? "قائمة أسعار المصنع. عند تفعيلها يُحسب عرض السعر على الخادم من مساحة فرخ القص الفعلية والخامة والطباعة والتشطيبات والكمية. التغييرات تسري على الطلبات الجديدة فقط؛ العروض المرسلة لا تتغير."
            : "The factory price list. When enabled, quotations are computed on the server from the real cutting-sheet area, material, printing, finishing and quantity. Changes apply to new requests only; offers already sent never change."}
        </p>
        {lastChange && (
          <p className="mt-2 text-xs text-ink-500">
            {ar ? "آخر تعديل" : "Last changed"}: <span className="num">{lastChange.createdAt.toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-GB")}</span>
            {lastChange.actor ? ` — ${lastChange.actor.name}` : ""}
          </p>
        )}
      </div>
      <PricingEditor
        initial={config}
        materials={materials}
        finishings={finishings}
        templates={templates.map((t) => ({ code: t.code, nameAr: t.nameAr, nameEn: t.nameEn, engineKey: t.engineKey, materials: t.materialRules.map((r) => r.material.code) }))}
      />
    </div>
  );
}
