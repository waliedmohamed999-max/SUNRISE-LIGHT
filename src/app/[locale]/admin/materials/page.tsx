import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { FinishingManager, MaterialEditor } from "@/components/admin/MaterialEditor";

export default async function AdminMaterials({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "material.manage")) notFound();
  const t = getDict(locale);
  const [materials, finishings] = await Promise.all([
    db.materialType.findMany({ orderBy: { sortOrder: "asc" }, include: { finishings: true } }),
    db.finishingOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const fin = finishings.map((f) => ({ id: f.id, code: f.code, name: locale === "ar" ? f.nameAr : f.nameEn, isAvailable: f.isAvailable }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-navy">{t.admin.materials}</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        {materials.map((m) => (
          <MaterialEditor
            key={m.id}
            finishings={fin}
            initial={{
              id: m.id,
              code: m.code,
              nameAr: m.nameAr,
              nameEn: m.nameEn,
              kind: m.kind,
              thickness: m.thickness,
              colorHex: m.colorHex,
              printableSides: m.printableSides,
              limitationsAr: m.limitationsAr,
              limitationsEn: m.limitationsEn,
              isAvailable: m.isAvailable,
              factoryApproved: m.factoryApproved,
              finishingIds: m.finishings.map((f) => f.finishingId),
            }}
          />
        ))}
        <MaterialEditor finishings={fin} initial={null} />
      </div>
      <FinishingManager finishings={fin} />
    </div>
  );
}
