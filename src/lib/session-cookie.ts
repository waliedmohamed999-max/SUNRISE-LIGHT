/**
 * Session cookie name, shared by the server and the middleware.
 * In production the "__Host-" prefix makes the browser enforce Secure, Path=/ and no Domain attribute,
 * so the cookie cannot be set or overwritten by a sibling subdomain.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-sl_session" : "sl_session";
