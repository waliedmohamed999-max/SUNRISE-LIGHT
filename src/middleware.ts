import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

const SESSION_COOKIE = "sl_session";

/**
 * - Prefixes every page URL with a locale (/ar, /en).
 * - Sends visitors without a session cookie away from account/admin pages early.
 *   (Real authorisation happens server-side in layouts and API routes.)
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const [, first, second] = pathname.split("/");

  if (!isLocale(first)) {
    const preferred = req.cookies.get("sl_locale")?.value;
    const accept = req.headers.get("accept-language") ?? "";
    const locale = isLocale(preferred) ? preferred : /^en\b/i.test(accept) ? "en" : DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, req.url));
  }

  if ((second === "account" || second === "admin") && !req.cookies.get(SESSION_COOKIE)) {
    const url = new URL(`/${first}/login`, req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.cookies.set("sl_locale", first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
