import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";
import { DesignCardActions } from "@/components/site/AccountActions";

export default async function MyDesigns({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const designs = await db.designProject.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { template: { select: { nameAr: true, nameEn: true } }, _count: { select: { quotationItems: true } } },
  });

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy">{t.account.designs}</h1>
        <LinkButton href={`/${locale}/studio`} variant="accent" size="sm">
          {t.account.newDesign}
        </LinkButton>
      </div>
      {designs.length === 0 ? (
        <EmptyState title={t.account.noDesigns} action={<LinkButton href={`/${locale}/studio`}>{t.home.ctaDesign}</LinkButton>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((d) => {
            const doc = d.document as { dimensions?: { length: number; width: number; height: number } };
            return (
              <li key={d.id} className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-navy/8 bg-white shadow-[var(--shadow-card)]">
                <div className="relative aspect-[4/3] bg-paper bg-grid">
                  {d.thumbnailAssetId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/assets/${d.thumbnailAssetId}`} alt="" className="h-full w-full object-contain" loading="lazy" />
                  )}
                  {d._count.quotationItems > 0 && (
                    <Badge tone="ok" className="absolute top-3 start-3">
                      {t.account.quotes}: <span className="num">{d._count.quotationItems}</span>
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div>
                    <p className="truncate font-semibold text-navy">{d.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {locale === "ar" ? d.template.nameAr : d.template.nameEn}
                      {doc.dimensions && <span className="num"> · {doc.dimensions.length}×{doc.dimensions.width}×{doc.dimensions.height} mm</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {t.account.lastEdited}: <span className="num">{fmtDate(d.updatedAt, locale)}</span>
                    </p>
                  </div>
                  <div className="mt-auto">
                    <DesignCardActions id={d.id} name={d.name} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
