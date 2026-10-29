import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { buttonClass, PageHeader } from "@/components/ui";

/** Simple content page (legal texts): editable copy from the admin, numbered paragraphs in the editorial layout. */
export function TextPage({ locale, title, body, crumb, notice, children }: { locale: Locale; title: string; body: string; crumb: string; notice?: string; children?: React.ReactNode }) {
  const t = getDict(locale);
  const paragraphs = body ? body.split(/\n{2,}/) : [];
  return (
    <div className="bg-walnut text-cream">
      <PageHeader eyebrow={t.brand.name} title={title} crumbs={[{ label: t.common.breadcrumbHome, href: `/${locale}` }, { label: crumb }]} />
      <div className="grid gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_2fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          {notice && <p className="rounded-[12px] border border-dashed border-ember/50 bg-ember/10 p-4 text-sm leading-relaxed text-cream/80">{notice}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${locale}/studio`} className={buttonClass("primary", "md")}>
              {t.home.ctaDesign}
            </Link>
            <Link href={`/${locale}/contact`} className={buttonClass("outline", "md")}>
              {t.nav.contact}
            </Link>
          </div>
        </aside>
        <div>
          {paragraphs.length > 0 && (
            <ol className="space-y-0">
              {paragraphs.map((p, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-dashed border-cork py-6 last:border-b">
                  <span className="serif num pt-1 text-sm text-cream/35">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-[17px] leading-loose whitespace-pre-line text-cream/85">{p}</p>
                </li>
              ))}
            </ol>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
