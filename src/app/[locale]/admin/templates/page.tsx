import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { TemplateEditor } from "@/components/admin/TemplateEditor";

export default async function AdminTemplates({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "template.manage") && !can(user.role, "template.validate")) notFound();
  const t = getDict(locale);
  const [templates, materials] = await Promise.all([
    db.packagingTemplate.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { currentVersion: { include: { panels: true } }, materialRules: true, category: true, _count: { select: { versions: true, designs: true } } },
    }),
    db.materialType.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, nameEn: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t.admin.templates}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">{t.admin.newVersionNote}</p>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          {locale === "ar"
            ? "إضافة نوع عبوة جديد يتطلب تعريف معادلات الهندسة في الكود (src/packaging/templates) ثم ربطه هنا."
            : "Adding a new packaging type requires implementing its geometry formulas in code (src/packaging/templates) and registering it here."}
        </p>
      </div>
      {templates.map((tpl) =>
        tpl.currentVersion ? (
          <TemplateEditor
            key={tpl.id}
            canManage={can(user.role, "template.manage")}
            canValidate={can(user.role, "template.validate")}
            materials={materials}
            meta={{ versions: tpl._count.versions, designs: tpl._count.designs, category: locale === "ar" ? tpl.category.nameAr : tpl.category.nameEn, engineKey: tpl.engineKey, code: tpl.code }}
            initial={{
              id: tpl.id,
              nameAr: tpl.nameAr,
              nameEn: tpl.nameEn,
              descriptionAr: tpl.descriptionAr,
              descriptionEn: tpl.descriptionEn,
              isEnabled: tpl.isEnabled,
              version: tpl.currentVersion.version,
              limits: {
                minLengthMm: tpl.currentVersion.minLengthMm,
                maxLengthMm: tpl.currentVersion.maxLengthMm,
                minWidthMm: tpl.currentVersion.minWidthMm,
                maxWidthMm: tpl.currentVersion.maxWidthMm,
                minHeightMm: tpl.currentVersion.minHeightMm,
                maxHeightMm: tpl.currentVersion.maxHeightMm,
              },
              defaults: { length: tpl.currentVersion.defaultLengthMm, width: tpl.currentVersion.defaultWidthMm, height: tpl.currentVersion.defaultHeightMm },
              safeMarginMm: tpl.currentVersion.safeMarginMm,
              dielineValidated: tpl.currentVersion.dielineValidated,
              panels: tpl.currentVersion.panels.map((p) => ({ key: p.key, name: locale === "ar" ? p.nameAr : p.nameEn, printable: p.printable })),
              materialIds: tpl.materialRules.map((r) => r.materialId),
              industries: tpl.industries,
            }}
          />
        ) : null,
      )}
    </div>
  );
}
