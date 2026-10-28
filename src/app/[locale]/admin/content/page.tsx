import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { isSettingKey, PAGE_TEXT_KEYS } from "@/lib/site-settings";
import { ContentEditor, FaqEditor, PortfolioEditor } from "@/components/admin/ContentEditors";

export default async function AdminContent({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "content.manage")) notFound();
  const t = getDict(locale);
  const [content, faq, portfolio] = await Promise.all([
    db.websiteContent.findMany({ orderBy: { key: "asc" } }),
    db.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
    db.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-navy">{t.admin.content}</h1>
      <ContentEditor
        entries={[
          ...content.filter((r) => !isSettingKey(r.key)).map(({ key, valueAr, valueEn }) => ({ key, valueAr, valueEn })),
          ...PAGE_TEXT_KEYS.filter((k) => !content.some((r) => r.key === k)).map((key) => ({ key, valueAr: "", valueEn: "" })),
        ]}
      />
      <FaqEditor items={faq} />
      <PortfolioEditor items={portfolio.map((p) => ({ ...p, imageUrl: p.imageUrl ?? "" }))} />
    </div>
  );
}
