import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { designDocumentSchema } from "@/design/document";
import { getDict } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import StudioApp, { type StudioInitial } from "@/components/studio/StudioApp";
import { EmptyState, LinkButton } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(isLocale(locale) ? locale : "ar");
  return { title: t.studio.title, alternates: { canonical: `/${locale}/studio`, languages: { ar: "/ar/studio", en: "/en/studio" } } };
}

/** Starting template from the link that opened the studio: an exact template, else the first of a category, else of an industry. */
function pickTemplate(templates: { code: string; category: { slug: string }; industries: string[] }[], q: { template?: string; category?: string; industry?: string }) {
  if (q.template && templates.some((x) => x.code === q.template)) return q.template;
  if (q.category) return templates.find((x) => x.category.slug === q.category)?.code;
  if (q.industry) return templates.find((x) => x.industries.includes(q.industry!))?.code;
  return undefined;
}

export default async function StudioPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ design?: string; template?: string; industry?: string; category?: string }> }) {
  const { locale } = await params;
  const { design: designId, template, industry, category } = await searchParams;
  const t = getDict(locale);
  const [catalog, user] = await Promise.all([loadCatalog(), getCurrentUser()]);

  if (!catalog.templates.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState title={t.common.comingSoon} body={t.pages.productsBody} action={<LinkButton href={`/${locale}/contact`}>{t.nav.contact}</LinkButton>} />
      </div>
    );
  }

  let initial: StudioInitial | null = null;
  if (designId && user) {
    const design = await db.designProject.findFirst({ where: { id: designId, ownerId: user.id, deletedAt: null } });
    const parsed = design ? designDocumentSchema.safeParse(design.document) : null;
    if (design && parsed?.success && catalog.templates.some((x) => x.code === parsed.data.templateCode)) {
      initial = { id: design.id, name: design.name, document: parsed.data };
    }
  }

  return (
    <>
      <h1 className="sr-only">{t.studio.title}</h1>
      <StudioApp catalog={catalog} initial={initial} initialTemplateCode={pickTemplate(catalog.templates, { template, category, industry })} isLoggedIn={!!user} maxUploadMb={Number(process.env.MAX_UPLOAD_MB || 10)} />
    </>
  );
}
