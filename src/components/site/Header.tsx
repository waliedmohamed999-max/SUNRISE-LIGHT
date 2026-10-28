"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Logo } from "./Logo";
import { buttonClass, cx, MenuIcon, XIcon } from "@/components/ui";

export function Header({ user }: { user: { name: string; isStaff: boolean } | null }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const base = `/${locale}`;
  // On the homepage the header floats transparently over the 3D film
  const isHome = pathname === base;

  useEffect(() => setOpen(false), [pathname]);

  // Four items maximum, as in the editorial reference
  const links = [
    { href: `${base}/products`, label: t.nav.products },
    { href: `${base}/studio`, label: t.nav.studio },
    { href: `${base}/services`, label: t.nav.services },
    { href: `${base}/contact`, label: t.nav.contact },
  ];
  const secondary = [
    { href: `${base}/about`, label: t.nav.about },
    { href: `${base}/portfolio`, label: t.nav.portfolio },
    { href: `${base}/faq`, label: t.nav.faq },
    { href: `${base}/quote`, label: t.nav.quote },
  ];
  const other = locale === "ar" ? "en" : "ar";
  const switchHref = `/${other}${pathname.slice(3)}`;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(base);
    router.refresh();
  }

  const navLink = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx("border-b border-dashed px-0.5 py-1 text-xs font-medium transition-colors", active ? "border-cream text-cream" : "border-transparent text-cream/60 hover:text-cream")}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className={cx("no-print top-0 z-40", isHome ? "fixed inset-x-0 bg-gradient-to-b from-walnut/70 to-transparent" : "sticky bg-walnut/80 backdrop-blur-md")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:bg-bark focus:px-3 focus:py-2">
        {t.nav.skip}
      </a>
      <div className="flex h-18 items-center justify-between gap-6 px-4 sm:px-8">
        <Link href={base} aria-label={t.brand.name}>
          <Logo locale={locale} />
        </Link>

        <nav aria-label="primary" className="hidden items-center gap-8 lg:flex">
          {links.map((l) => navLink(l.href, l.label))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link href={switchHref} hrefLang={other} className="text-xs font-medium text-cream/60 hover:text-cream">
            {t.nav.switchLang}
          </Link>
          {user ? (
            <>
              {user.isStaff && navLink(`${base}/admin`, t.nav.admin)}
              {navLink(`${base}/account`, t.nav.account)}
            </>
          ) : (
            navLink(`${base}/login`, t.nav.login)
          )}
          <Link href={`${base}/studio`} className={buttonClass("outline", "sm")}>
            {t.home.ctaDesign}
          </Link>
        </div>

        <button className="grid size-11 place-items-center text-cream lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? t.nav.close : t.nav.menu} onClick={() => setOpen((v) => !v)}>
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </div>
      {!isHome && <div className="rule mx-4 sm:mx-8" />}

      {open && (
        <div id="mobile-nav" className="h-[calc(100dvh-4.5rem)] overflow-y-auto bg-walnut px-4 pb-8 lg:hidden">
          <nav aria-label="mobile" className="flex flex-col py-4">
            {[...links, ...secondary].map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-dashed border-cork py-4 text-lg font-medium text-cream">
                {l.label}
              </Link>
            ))}
            {user?.isStaff && (
              <Link href={`${base}/admin`} className="border-b border-dashed border-cork py-4 text-lg font-medium text-cream">
                {t.nav.admin}
              </Link>
            )}
            <Link href={user ? `${base}/account` : `${base}/login`} className="border-b border-dashed border-cork py-4 text-lg font-medium text-cream">
              {user ? t.nav.account : t.nav.login}
            </Link>
            {user && (
              <button onClick={logout} className="border-b border-dashed border-cork py-4 text-start text-lg font-medium text-cream/60">
                {t.nav.logout}
              </button>
            )}
            <Link href={switchHref} hrefLang={other} className="py-4 text-lg font-medium text-cream/60">
              {t.nav.switchLang}
            </Link>
          </nav>
          <Link href={`${base}/studio`} className={buttonClass("primary", "md", "w-full")}>
            {t.home.ctaDesign}
          </Link>
        </div>
      )}
    </header>
  );
}
