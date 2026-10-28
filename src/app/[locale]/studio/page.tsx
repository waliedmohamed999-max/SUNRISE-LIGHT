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

export default async function StudioPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ design?: string; template?: string; industry?: string }> }) {
  const { locale } = await params;
  const { design: designId, template, industry } = await searchParams;
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
      <StudioApp catalog={catalog} initial={initial} initialTemplateCode={template ?? (industry ? catalog.templates.find((x) => x.industries.includes(industry))?.code : undefined)} isLoggedIn={!!user} maxUploadMb={Number(process.env.MAX_UPLOAD_MB || 10)} />
    </>
  );
}
