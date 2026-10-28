import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDict } from "@/i18n/dictionaries";
import { LogoMark } from "./Logo";
import { ShareButton } from "./ShareButton";
import { buttonClass } from "@/components/ui";
import { telUrl, whatsappUrl, type SiteInfo } from "@/lib/site-settings";

/** Scattered kraft cartons at three depths — the footer's backdrop (pure SVG, no photography). */
function CartonField() {
  const boxes = Array.from({ length: 46 }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const depth = r(1);
    return { x: r(2) * 100, y: r(3) * 100, s: 10 + depth * 46, rot: r(4) * 360, blur: (1 - depth) * 3, o: 0.25 + depth * 0.65 };
  });
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 60">
      <defs>
        {[0, 1, 2, 3].map((b) => (
          <filter key={b} id={`fb${b}`}>
            <feGaussianBlur stdDeviation={b * 0.12} />
          </filter>
        ))}
        <radialGradient id="glow" cx="78%" cy="20%" r="70%">
          <stop offset="0" stopColor="#7a3510" stopOpacity="0.55" />
          <stop offset="1" stopColor="#100904" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="60" fill="#0c0603" />
      <rect width="100" height="60" fill="url(#glow)" />
      {boxes.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y * 0.6}) rotate(${b.rot}) scale(${b.s / 100})`} opacity={b.o} filter={`url(#fb${Math.round(b.blur)})`}>
          <path d="M0-6 7-2.5 0 1-7-2.5z" fill="#d9a06a" />
          <path d="M-7-2.5 0 1v8l-7-3.5z" fill="#9c6a3e" />
          <path d="M7-2.5 0 1v8l7-3.5z" fill="#6e4625" />
        </g>
      ))}
      <rect width="100" height="60" fill="url(#fade)" />
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.45" stopColor="#100904" stopOpacity="0" />
        <stop offset="1" stopColor="#100904" stopOpacity="0.9" />
      </linearGradient>
    </svg>
  );
}

export function Footer({ locale, info }: { locale: Locale; info: SiteInfo }) {
  const t = getDict(locale);
  const b = `/${locale}`;
  const year = new Date().getFullYear();
  const links = [
    { href: `${b}/products`, label: t.nav.products },
    { href: `${b}/studio`, label: t.nav.studio },
    { href: `${b}/services`, label: t.nav.services },
    { href: `${b}/portfolio`, label: t.nav.portfolio },
    { href: `${b}/about`, label: t.nav.about },
    { href: `${b}/faq`, label: t.nav.faq },
    { href: `${b}/contact`, label: t.nav.contact },
  ];

  return (
    <footer className="no-print relative z-20 overflow-hidden bg-walnut text-cream">
      <div className="relative min-h-[100dvh]">
        <CartonField />
        <div className="relative flex min-h-[100dvh] flex-col justify-between px-4 pt-24 pb-8 sm:px-8">
          {/* statement */}
          <div className="grid gap-10 lg:grid-cols-[auto_1fr]">
            <LogoMark className="h-20 sm:h-28" />
            <div className="lg:justify-self-end lg:text-end">
              <p className="display max-w-3xl text-[29px] leading-[0.95] font-medium sm:text-[41px] lg:text-[51px]">{t.story.closingStatement}</p>
              <p className="display mt-5 text-[18px] text-cream/70 sm:text-[24px]">{t.story.closingSub}</p>
              <div className="mt-8 flex flex-wrap gap-3 lg:justify-end">
                <Link href={`${b}/studio`} className={buttonClass("primary", "md")}>
                  {t.home.ctaDesign}
                </Link>
                <Link href={`${b}/quote`} className={buttonClass("outline", "md")}>
                  {t.nav.quote}
                </Link>
              </div>
            </div>
          </div>

          {/* information */}
          <div className="mt-20 grid gap-8 md:grid-cols-[1fr_1fr_1.2fr_1.4fr]">
            <div className="max-w-[230px] rounded-[12px] border border-dashed border-cream/30 bg-walnut/50 p-5 backdrop-blur">
              <p className="eyebrow text-[11px] font-medium text-ember">{t.brand.name}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-cream/70">{t.footer.about}</p>
              <div className="mt-4">
                <ShareButton label={t.story.share} copied={t.story.copied} />
              </div>
            </div>
            <ul className="space-y-2.5 text-xs font-medium">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="eyebrow text-cream/75 underline-offset-4 hover:text-cream hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="space-y-4 text-xs">
              <p className="eyebrow text-[11px] font-medium text-cream/50">{t.pages.contactInfo}</p>
              {[info.phone, info.phone2].map((ph) =>
                ph && telUrl(ph) ? (
                  <a key={ph} href={telUrl(ph)!} dir="ltr" className="num block font-medium text-cream hover:text-ember">
                    {ph}
                  </a>
                ) : null,
              )}
              {info.whatsapp && whatsappUrl(info.whatsapp) && (
                <a href={whatsappUrl(info.whatsapp)!} target="_blank" rel="noopener noreferrer" className="block font-medium text-cream hover:text-ember">
                  WhatsApp · <span className="num" dir="ltr">{info.whatsapp}</span>
                </a>
              )}
              {[info.email, info.email2].map((em) =>
                em ? (
                  <a key={em} href={`mailto:${em}`} dir="ltr" className="num block font-medium text-cream hover:text-ember">
                    {em}
                  </a>
                ) : null,
              )}
              {info.address && <p className="font-medium text-cream">{info.address}</p>}
              {!info.phone && !info.whatsapp && !info.email && !info.address && (
                <Link href={`${b}/contact`} className="font-medium text-cream underline-offset-4 hover:underline">
                  {t.pages.contactForm}
                </Link>
              )}
              {info.social.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {info.social.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-cream/25 px-3 py-1 text-[11px] text-cream/80 hover:border-ember hover:text-cream">
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-cream/50 md:text-end">{t.story.disclaimer}</p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-cream/20 pt-5 text-[11px] font-medium text-cream/55">
            <span>
              © <span className="num">{year}</span> {t.brand.name} — {t.footer.rights}
            </span>
            <span className="flex gap-6">
              <Link href={`${b}/terms`} className="eyebrow hover:text-cream">
                {t.pages.termsTitle}
              </Link>
              <Link href={`${b}/privacy`} className="eyebrow hover:text-cream">
                {t.pages.privacyTitle}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
