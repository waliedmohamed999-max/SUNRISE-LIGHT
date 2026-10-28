import type { Locale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { Alert, LinkButton, PageHeader } from "@/components/ui";

/** Simple content page: editable copy from the admin (nothing is shown while it is empty). */
export function TextPage({ locale, title, body, crumb, notice, children }: { locale: Locale; title: string; body: string; crumb: string; notice?: string; children?: React.ReactNode }) {
  const t = getDict(locale);
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: crumb }]} />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        {notice && <Alert tone="warn" className="mb-8">{notice}</Alert>}
        {body && (
          <div className="space-y-4 text-lg leading-loose text-ink">
            {body.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        )}
        {children}
        <div className="mt-12 flex flex-wrap gap-3">
          <LinkButton href={`/${locale}/studio`} variant="accent">
            {t.home.ctaDesign}
          </LinkButton>
          <LinkButton href={`/${locale}/contact`} variant="outline">
            {t.nav.contact}
          </LinkButton>
        </div>
      </div>
    </>
  );
}
