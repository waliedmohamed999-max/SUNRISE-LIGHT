import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCatalog } from "@/lib/catalog";
import { designDocumentSchema } from "@/design/document";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { QuoteFlow } from "@/components/site/QuoteFlow";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).quote.title, alternates: { canonical: `/${locale}/quote` } };
}

export default async function QuotePage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ design?: string }> }) {
  const { locale } = await params;
  const { design: designId } = await searchParams;
  const t = getDict(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/quote${designId ? `?design=${designId}` : ""}`)}`);

  const crumbs = [{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: t.quote.title }];

  const designs = await db.designProject.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, thumbnailAssetId: true, template: { select: { nameAr: true, nameEn: true } } },
  });

  const design = designId ? await db.designProject.findFirst({ where: { id: designId, ownerId: user.id, deletedAt: null } }) : null;
  const parsed = design ? designDocumentSchema.safeParse(design.document) : null;

  if (!design || !parsed?.success) {
    return (
      <>
        <PageHeader title={t.quote.title} body={t.quote.noPrice} crumbs={crumbs} />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-lg font-semibold text-navy">{t.quote.chooseDesign}</h2>
          {designs.length === 0 ? (
            <EmptyState title={t.quote.noDesigns} action={<LinkButton href={`/${locale}/studio`} variant="accent">{t.home.ctaDesign}</LinkButton>} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {designs.map((d) => (
                <li key={d.id}>
                  <Link href={`/${locale}/quote?design=${d.id}`} className="block overflow-hidden rounded-[var(--radius-card)] border border-navy/8 bg-white transition hover:shadow-[var(--shadow-lift)]">
                    <div className="aspect-[4/3] bg-paper">
                      {d.thumbnailAssetId && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/assets/${d.thumbnailAssetId}`} alt="" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate font-semibold text-navy">{d.name}</p>
                      <p className="text-xs text-ink-500">{locale === "ar" ? d.template.nameAr : d.template.nameEn}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  const [catalog, profile] = await Promise.all([
    loadCatalog(),
    db.customerProfile.findUnique({ where: { userId: user.id }, include: { company: true } }),
  ]);
  const template = await db.packagingTemplate.findUnique({ where: { code: parsed.data.templateCode } });

  return (
    <>
      <PageHeader title={t.quote.title} body={t.quote.noPrice} crumbs={crumbs} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <QuoteFlow
          design={{ id: design.id, name: design.name, document: parsed.data, engineKey: template?.engineKey ?? "rsc", templateNameAr: template?.nameAr ?? "", templateNameEn: template?.nameEn ?? "" }}
          catalog={catalog}
          prefill={{ name: user.name, email: user.email, phone: user.phone ?? "", company: profile?.company?.name ?? "", city: profile?.city ?? "", address: profile?.address ?? "" }}
        />
      </div>
    </>
  );
}
