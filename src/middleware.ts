import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Content-Security-Policy with a per-request nonce. Next.js reads the nonce from the request's CSP header
 * and applies it to its own scripts; 'strict-dynamic' lets those scripts load the app's chunks.
 * Inline styles stay allowed (React style attributes); no external script, frame or object sources.
 */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' blob: data:${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * - Prefixes every page URL with a locale (/ar, /en).
 * - Sends visitors without a session cookie away from account/admin pages early.
 *   (Real authorisation happens server-side in layouts and API routes.)
 * - Sets the page Content-Security-Policy.
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

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.cookies.set("sl_locale", first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
