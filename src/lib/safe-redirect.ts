/**
 * Accept only same-site relative paths for post-login redirects.
 * Rejects absolute URLs, protocol-relative "//host", browser-normalised "/\host",
 * control characters and anything outside the locale-prefixed site.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null;
  if (!/^\/(ar|en)(\/|$|\?)/.test(raw)) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw) || raw.startsWith("//")) return null;
  return raw;
}
