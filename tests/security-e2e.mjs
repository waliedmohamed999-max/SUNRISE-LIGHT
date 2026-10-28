/**
 * Security regression tests against a LOCAL or isolated staging server (never production).
 *   BASE_URL=http://localhost:3101 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/security-e2e.mjs
 * Uses synthetic @example.com accounts only. The temporary staff account it creates is deactivated at the end.
 * No denial-of-service, no third-party targets, no destructive operations on existing records.
 */
import { createHmac } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3101";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) && process.env.ALLOW_NON_LOCAL !== "1") {
  console.error("Refusing to run against a non-local BASE_URL (set ALLOW_NON_LOCAL=1 for an isolated staging host).");
  process.exit(2);
}
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (super admin of the test instance).");
  process.exit(2);
}

let passed = 0;
const failures = [];
const check = (cond, msg) => {
  if (cond) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failures.push(msg);
    console.log(`✗ ${msg}`);
  }
};

function client(extraHeaders = {}) {
  let cookie = "";
  const call = async (path, { method = "GET", json, form, headers = {}, raw } = {}) => {
    const h = { Origin: BASE, ...extraHeaders, ...headers };
    if (cookie) h.Cookie = cookie;
    let body = raw;
    if (json !== undefined) {
      h["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    } else if (form) body = form;
    const res = await fetch(BASE + path, { method, headers: h, body, redirect: "manual" });
    const set = res.headers.get("set-cookie");
    if (set && /sl_session=/.test(set)) cookie = /expires=Thu, 01 Jan 1970/i.test(set) || /Max-Age=0/i.test(set) ? "" : set.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("json") ? await res.json().catch(() => ({})) : await res.text();
    return { status: res.status, data, headers: res.headers, setCookie: set };
  };
  call.cookie = () => cookie;
  call.setCookie = (c) => (cookie = c);
  return call;
}

// RFC 6238 TOTP for the MFA test
const b32 = (s) => {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0;
  const out = [];
  for (const ch of s.replace(/=+$/, "")) {
    val = (val << 5) | A.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};
const totp = (secret, step) => {
  const c = Buffer.alloc(8);
  c.writeBigUInt64BE(BigInt(step));
  const m = createHmac("sha1", b32(secret)).update(c).digest();
  const o = m[m.length - 1] & 15;
  return String((((m[o] & 127) << 24) | (m[o + 1] << 16) | (m[o + 2] << 8) | m[o + 3]) % 1e6).padStart(6, "0");
};
const step = () => Math.floor(Date.now() / 30000);

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const stamp = Date.now();
const pw = (n) => `sec-test-${stamp}-${n}-Kraft`;

const anon = client();
const a = client();
const b = client();
const admin = client();
const tech = client();

/* ───────── 1. headers ───────── */
{
  const page = await anon("/ar");
  const csp = page.headers.get("content-security-policy") ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  check(!!nonce && /object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp), "pages send a nonce-based Content-Security-Policy");
  check(!!nonce && String(page.data).includes(`nonce="${nonce}"`), "Next.js scripts carry the CSP nonce");
  const page2 = await anon("/ar");
  check((page2.headers.get("content-security-policy") ?? "").match(/'nonce-([^']+)'/)?.[1] !== nonce, "the nonce changes on every request");
  check(page.headers.get("x-content-type-options") === "nosniff" && page.headers.get("x-frame-options") === "SAMEORIGIN" && !!page.headers.get("referrer-policy"), "baseline security headers are present");
  check(!page.headers.get("x-powered-by"), "framework banner (X-Powered-By) is hidden");
  const api = await anon("/api/health");
  check(api.headers.get("cache-control")?.includes("no-store"), "API responses are not cacheable");
}

/* ───────── 2. registration & mass assignment ───────── */
const emailA = `sec-a-${stamp}@example.com`;
const emailB = `sec-b-${stamp}@example.com`;
{
  const weak = await anon("/api/auth/register", { method: "POST", json: { name: "Weak", email: `sec-weak-${stamp}@example.com`, password: "password123", locale: "en" } });
  check(weak.status === 422, "common passwords are rejected at registration");
  const r = await a("/api/auth/register", { method: "POST", json: { name: "Sec A", email: emailA, password: pw("a"), locale: "en", role: "SUPER_ADMIN", isActive: true } });
  check(r.status === 201, "customer A registered");
  const esc = await a("/api/admin/users", { method: "PATCH", json: { id: r.data.user?.id, role: "SUPER_ADMIN" } });
  check(esc.status === 403, "extra fields (role) in registration are ignored — the new account is a customer");
  check((await b("/api/auth/register", { method: "POST", json: { name: "Sec B", email: emailB, password: pw("b"), locale: "en" } })).status === 201, "customer B registered");
}

/* ───────── 3. CSRF & request limits ───────── */
{
  const cross = await a("/api/designs", { method: "POST", json: { name: "x", document: {} }, headers: { Origin: "https://evil.example" } });
  check(cross.status === 403, "cross-origin mutation is rejected (CSRF)");
  const noOrigin = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { Cookie: a.cookie() } });
  check(noOrigin.status === 403, "mutation without Origin is rejected");
  const big = await a("/api/designs", { method: "POST", raw: JSON.stringify({ name: "x".repeat(3 * 1024 * 1024) }), headers: { "Content-Type": "application/json" } });
  check(big.status === 413, "oversized JSON bodies are refused before parsing (413)");
  const bad = await a("/api/designs", { method: "POST", raw: "{not json", headers: { "Content-Type": "application/json" } });
  check(bad.status === 400, "malformed JSON is a 400, not a 500");
  const proto = await a("/api/designs", { method: "POST", raw: '{"name":"p","document":{"__proto__":{"isAdmin":true}}}', headers: { "Content-Type": "application/json" } });
  check(proto.status === 400 || proto.status === 422, "prototype-pollution payloads fail validation");
}

/* ───────── 4. unauthenticated access ───────── */
for (const [path, method] of [["/api/designs", "GET"], ["/api/rfq", "GET"], ["/api/assets?kind=LOGO", "GET"], ["/api/account/mfa", "POST"], ["/api/admin/rfq/export", "GET"]]) {
  const r = await anon(path, { method, json: method === "POST" ? { action: "setup" } : undefined });
  check(r.status === 401, `anonymous ${method} ${path} → 401`);
}

/* ───────── 5. customer → staff functions (BFLA) ───────── */
{
  const probes = [
    ["/api/admin/users", "POST", { name: "x", email: `x-${stamp}@example.com`, password: pw("x"), role: "SUPER_ADMIN" }],
    ["/api/admin/content", "POST", { type: "content", entries: [{ key: "contact.phone", valueAr: "1", valueEn: "1" }] }],
    ["/api/admin/materials", "POST", { code: "x" }],
    ["/api/admin/finishings", "POST", { code: "x", nameAr: "x", nameEn: "x" }],
    ["/api/admin/messages", "PATCH", { id: "x", handled: true }],
    ["/api/admin/rfq/export", "GET"],
    ["/api/admin/customers/export", "GET"],
  ];
  for (const [path, method, json] of probes) {
    const r = await a(path, { method, json });
    check(r.status === 403, `customer ${method} ${path} → 403`);
  }
  for (const page of ["/ar/admin", "/ar/admin/users", "/ar/admin/system", "/ar/admin/designs"]) {
    const r = await a(page);
    check(r.status === 404, `customer cannot open ${page} (404)`);
  }
}

/* ───────── 6. object-level authorisation (IDOR / BOLA) ───────── */
const fd = new FormData();
fd.append("file", new Blob([PNG], { type: "image/png" }), "logo.png");
fd.append("kind", "LOGO");
const logo = (await a("/api/assets", { method: "POST", form: fd })).data.asset;
const doc = {
  schemaVersion: 1,
  templateCode: "shipping-carton",
  templateVersion: 1,
  dimensions: { length: 300, width: 200, height: 120 },
  materialCode: "corrugated-kraft",
  finishingCodes: [],
  printOption: "2c",
  quantity: 1000,
  surfaces: Object.fromEntries(
    ["front", "back", "left", "right", "top", "bottom"].map((k) => [
      k,
      { background: null, elements: k === "front" ? [{ id: "logo1", type: "image", assetId: logo.id, mime: "image/png", naturalWidth: 1, naturalHeight: 1, x: 150, y: 60, width: 40, height: 40, rotation: 0 }] : [] },
    ]),
  ),
};
const design = (await a("/api/designs", { method: "POST", json: { name: "Sec design", document: doc } })).data.design;
{
  check((await b(`/api/designs/${design.id}`)).status === 404, "B cannot read A's design");
  check((await b(`/api/designs/${design.id}`, { method: "PATCH", json: { name: "pwned" } })).status === 404, "B cannot modify A's design");
  check((await b(`/api/designs/${design.id}`, { method: "DELETE" })).status === 404, "B cannot delete A's design");
  check((await b(`/api/designs/${design.id}/duplicate`, { method: "POST" })).status === 404, "B cannot duplicate A's design");
  check((await b(`/api/designs/${design.id}/dieline.svg`)).status === 404, "B cannot download A's dieline");
  check((await b(`/api/assets/${logo.id}`)).status === 404, "B cannot download A's logo");
  check((await b("/api/designs", { method: "POST", json: { name: "steal", document: doc } })).status === 422, "B cannot reference A's logo in a design");
  check((await a(`/api/assets/${encodeURIComponent("../../etc/passwd")}`)).status === 404, "path traversal in asset ids is not possible");
}

/* ───────── 7. stored XSS via SVG upload ───────── */
{
  const evil = new FormData();
  evil.append("file", new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(document.cookie)</script><image href="https://evil.example/x.png"/><rect onclick="alert(1)" width="5" height="5"/></svg>'], { type: "image/svg+xml" }), "evil.svg");
  evil.append("kind", "LOGO");
  const up = await a("/api/assets", { method: "POST", form: evil });
  const got = up.status === 201 ? await a(`/api/assets/${up.data.asset.id}`) : null;
  check(!!got && !/script|onclick|evil\.example/i.test(String(got.data)), "malicious SVG is sanitised before storage");
  check(!!got && /sandbox/.test(got.headers.get("content-security-policy") ?? "") && got.headers.get("x-content-type-options") === "nosniff", "private files are served with a sandbox CSP and nosniff");
}

/* ───────── 8. quotation workflow ───────── */
await admin("/api/auth/login", { method: "POST", json: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
const rfqBody = { designId: design.id, quantity: 1000, printingRequirements: "", materialCode: "corrugated-kraft", finishingCodes: [], deliveryCity: "Riyadh", deliveryLocation: "Security test", contactName: "Sec A", phone: "+966500000000", email: emailA, locale: "en" };
const rfq = (await a("/api/rfq", { method: "POST", json: rfqBody })).data.request;
{
  check((await b("/api/rfq", { method: "POST", json: rfqBody })).status === 404, "B cannot submit an RFQ for A's design");
  check((await b(`/api/rfq/${rfq.id}/action`, { method: "POST", json: { action: "cancel" } })).status === 404, "B cannot act on A's request");
  check((await a(`/api/admin/rfq/${rfq.id}/offers`, { method: "POST", json: { unitPrice: 0.01, quantity: 1, taxPercent: 0, send: true } })).status === 403, "customer cannot create or send a price");
  check((await a(`/api/rfq/${rfq.id}/action`, { method: "POST", json: { action: "approve" } })).status === 409, "customer cannot approve before a quotation is sent");

  // a temporary technical reviewer
  const techEmail = `sec-tech-${stamp}@example.com`;
  const created = await admin("/api/admin/users", { method: "POST", json: { name: "Sec Tech", email: techEmail, password: pw("tech"), role: "TECH_REVIEWER" } });
  check(created.status === 201, "temporary technical reviewer created");
  const login = await tech("/api/auth/login", { method: "POST", json: { email: techEmail, password: pw("tech") } });
  const exp = login.setCookie?.match(/expires=([^;]+)/i)?.[1];
  const hours = exp ? (new Date(exp).getTime() - Date.now()) / 36e5 : 999;
  check(login.status === 200 && hours <= 12.1, `staff sessions are short-lived (${hours.toFixed(1)} h)`);
  check((await tech(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "TECHNICAL_REVIEW" } })).status === 200, "reviewer can move a request into technical review");
  check((await tech(`/api/admin/rfq/${rfq.id}/offers`, { method: "POST", json: { unitPrice: 1, quantity: 1000, taxPercent: 15, send: true } })).status === 403, "reviewer cannot set prices");
  check((await tech("/api/admin/users", { method: "POST", json: { name: "x", email: `y-${stamp}@example.com`, password: pw("y"), role: "SUPER_ADMIN" } })).status === 403, "reviewer cannot create users (no vertical escalation)");
  await admin(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "PRICING" } });
  const yesterday = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const offer = await admin(`/api/admin/rfq/${rfq.id}/offers`, { method: "POST", json: { unitPrice: 2.5, quantity: 1000, taxPercent: 15, validUntil: yesterday, send: true } });
  check(offer.status === 201, "expired test quotation sent");
  check((await tech(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "APPROVED" } })).status === 403, "reviewer cannot record a commercial approval");
  const exp2 = await a(`/api/rfq/${rfq.id}/action`, { method: "POST", json: { action: "approve" } });
  check(exp2.status === 409 && exp2.data.error === "offer_expired", "customer cannot approve an expired quotation");
  check((await b(`/en/quotation/${offer.data.offer.id}`)).status === 404, "B cannot open A's quotation document");
  const notes = await a(`/en/account/quotes/${rfq.id}`);
  await admin(`/api/admin/rfq/${rfq.id}/notes`, { method: "POST", json: { body: `INTERNAL-${stamp}`, internal: true } });
  const notes2 = await a(`/en/account/quotes/${rfq.id}`);
  check(notes.status === 200 && !String(notes2.data).includes(`INTERNAL-${stamp}`), "internal factory notes are never shown to the customer");

  // deactivation revokes the session immediately
  await admin("/api/admin/users", { method: "PATCH", json: { id: created.data.user.id, isActive: false } });
  check((await tech("/api/rfq")).status === 401, "deactivated staff are signed out at once");
}

/* ───────── 9. sessions & passwords ───────── */
{
  const oldCookie = b.cookie();
  const changed = await b("/api/account/password", { method: "POST", json: { current: pw("b"), next: pw("b2") } });
  check(changed.status === 200, "password changed");
  const stale = client();
  stale.setCookie(oldCookie);
  check((await stale("/api/rfq")).status === 401, "old session is revoked after a password change");
  check((await b("/api/rfq")).status === 200, "the current browser keeps a fresh session");
  const before = b.cookie();
  await b("/api/auth/logout", { method: "POST" });
  const replay = client();
  replay.setCookie(before);
  check((await replay("/api/rfq")).status === 401, "a session cookie cannot be reused after logout");
}

/* ───────── 10. two-step verification ───────── */
{
  const c = client();
  await c("/api/auth/login", { method: "POST", json: { email: emailA, password: pw("a") } });
  const setup = await c("/api/account/mfa", { method: "POST", json: { action: "setup" } });
  if (setup.status === 503) {
    check(false, "MFA not configured on this server (MFA_ENCRYPTION_KEY) — skipped");
  } else {
    const secret = setup.data.secret;
    check(/^[A-Z2-7]{32}$/.test(secret) && setup.data.uri.startsWith("otpauth://totp/"), "MFA setup returns a 160-bit secret and otpauth URI");
    check((await c("/api/account/mfa", { method: "POST", json: { action: "enable", code: "000000" } })).status === 400, "a wrong code does not enable MFA");
    const en = await c("/api/account/mfa", { method: "POST", json: { action: "enable", code: totp(secret, step()) } });
    check(en.status === 200, "MFA enabled with a valid code");
    const d = client();
    const noCode = await d("/api/auth/login", { method: "POST", json: { email: emailA, password: pw("a") } });
    check(noCode.status === 401 && noCode.data.error === "mfa_required" && !noCode.setCookie, "password alone no longer signs in");
    const wrongPw = await d("/api/auth/login", { method: "POST", json: { email: emailA, password: "wrong-password-x", code: "123456" } });
    check(wrongPw.status === 401 && wrongPw.data.error === "invalid_credentials", "MFA state is not revealed before the password is proven");
    const wrong = await d("/api/auth/login", { method: "POST", json: { email: emailA, password: pw("a"), code: "000000" } });
    check(wrong.status === 401 && wrong.data.error === "mfa_invalid", "a wrong code is refused");
    // wait for the next 30 s step so this code has not been consumed by "enable"
    const s = step();
    await new Promise((r) => setTimeout(r, (30 - ((Date.now() / 1000) % 30)) * 1000 + 300));
    const code = totp(secret, s + 1);
    const good = await d("/api/auth/login", { method: "POST", json: { email: emailA, password: pw("a"), code } });
    check(good.status === 200 && !!good.setCookie, "password + valid code signs in");
    const replay = await client()("/api/auth/login", { method: "POST", json: { email: emailA, password: pw("a"), code } });
    check(replay.status === 401, "the same code cannot be replayed");
  }
}

/* ───────── 11. rate limiting ───────── */
{
  const victim = `sec-rl-${stamp}@example.com`;
  let limited = false;
  for (let i = 0; i < 12; i++) {
    // forged left-most X-Forwarded-For entries must not create fresh rate-limit buckets
    const r = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { Origin: BASE, "Content-Type": "application/json", "X-Forwarded-For": `10.9.${i}.${i}, 203.0.113.77` }, body: JSON.stringify({ email: victim, password: "wrong-password" }) });
    if (r.status === 429) limited = true;
  }
  check(limited, "login is rate-limited even when X-Forwarded-For is forged");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
