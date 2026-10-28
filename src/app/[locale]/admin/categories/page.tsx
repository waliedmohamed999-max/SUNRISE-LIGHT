import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export default async function AdminCategories({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "template.manage")) notFound();
  const categories = await db.packagingCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    include: { templates: { select: { isEnabled: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{ar ? "فئات المنتجات" : "Product categories"}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          {ar
            ? "«متاحة» تظهر في صفحة المنتجات مع زر التصميم، «قريبًا» تظهر بعلامة قريبًا، «مخفية» تُحذف من صفحات الموقع وخريطة الموقع. ظهور القالب في الاستوديو يتحكم فيه تفعيل القالب نفسه من صفحة القوالب."
            : "“Active” shows on the products page with a design button, “Coming soon” shows with a coming-soon label, “Hidden” is removed from site pages and the sitemap. Whether a template appears in the studio is controlled by enabling the template itself."}
        </p>
      </div>
      <div className="space-y-3">
        {categories.map((c) => (
          <CategoryEditor
            key={c.id}
            initial={{ id: c.id, slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, status: c.status, sortOrder: c.sortOrder }}
            templates={{ total: c.templates.length, enabled: c.templates.filter((t) => t.isEnabled).length }}
          />
        ))}
      </div>
    </div>
  );
}
