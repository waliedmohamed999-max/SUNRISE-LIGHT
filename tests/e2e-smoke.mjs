/**
 * End-to-end smoke test of the critical workflow against a running server.
 *   BASE_URL=http://localhost:3100 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e-smoke.mjs
 * Creates a throwaway customer, a design, an RFQ, then walks it through the factory workflow.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (a staff account allowed to price quotations).");
  process.exit(2);
}
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };

function client() {
  let cookie = "";
  return async (path, { method = "GET", json, form, expect = [200, 201] } = {}) => {
    const headers = { Origin: BASE };
    if (cookie) headers.Cookie = cookie;
    let body;
    if (json) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    } else if (form) body = form;
    const res = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
    const set = res.headers.get("set-cookie");
    if (set?.includes("sl_session=")) cookie = set.split(";")[0];
    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("json") ? await res.json() : await res.text();
    if (!expect.includes(res.status)) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
    return { status: res.status, data, headers: res.headers };
  };
}

const ok = (cond, msg) => {
  if (!cond) throw new Error(`✗ ${msg}`);
  console.log(`✓ ${msg}`);
};

// 1×1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const customer = client();
const other = client();
const anon = client();
const admin = client();
const email = `e2e-${Date.now()}@example.com`;

await anon("/api/designs", { expect: [401] });
ok(true, "anonymous users cannot list designs");
await anon("/api/auth/login", { method: "POST", json: { email: "x@example.com", password: "x" }, expect: [401, 429] });

await customer("/api/auth/register", { method: "POST", json: { name: "E2E Customer", email, password: "e2e-password-1", phone: "+966500000000", company: "E2E Co", locale: "ar" } });
ok(true, "customer registered and signed in");

const noOrigin = await fetch(`${BASE}/api/auth/logout`, { method: "POST" });
ok(noOrigin.status === 403, "mutations without an Origin header are rejected (CSRF)");

const fd = new FormData();
fd.append("file", new Blob([PNG], { type: "image/png" }), "logo.png");
fd.append("kind", "LOGO");
const logo = (await customer("/api/assets", { method: "POST", form: fd })).data.asset;
ok(logo.mime === "image/png" && logo.width === 1, "logo uploaded and inspected by content");

const evil = new FormData();
evil.append("file", new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" }), "evil.png");
await customer("/api/assets", { method: "POST", form: evil, expect: [422] });
ok(true, "non-image content with an image MIME type is rejected");

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
      {
        background: k === "front" ? "#14283F" : null,
        elements: k === "front" ? [{ id: "logo1", type: "image", assetId: logo.id, mime: "image/png", naturalWidth: 1, naturalHeight: 1, x: 150, y: 60, width: 40, height: 40, rotation: 0 }] : [],
      },
    ]),
  ),
};

await customer("/api/designs", { method: "POST", json: { name: "Bad", document: { ...doc, dimensions: { length: 5, width: 200, height: 120 } } }, expect: [422] });
ok(true, "out-of-limit dimensions are rejected server-side");

const design = (await customer("/api/designs", { method: "POST", json: { name: "E2E carton", document: doc } })).data.design;
ok(!!design.id, "design saved");
await customer(`/api/designs/${design.id}`, { method: "PATCH", json: { document: { ...doc, dimensions: { length: 320, width: 200, height: 120 } }, snapshot: true } });
ok(true, "design updated with version snapshot");

await other("/api/auth/register", { method: "POST", json: { name: "Other", email: `other-${email}`, password: "e2e-password-2", locale: "en" } });
await other(`/api/designs/${design.id}`, { expect: [404] });
await other(`/api/assets/${logo.id}`, { expect: [404] });
ok(true, "another customer cannot read the design or the logo");
await other("/api/designs", { method: "POST", json: { name: "steal", document: doc }, expect: [422] });
ok(true, "another customer cannot reference someone else's asset");

const rfq = (
  await customer("/api/rfq", {
    method: "POST",
    json: { designId: design.id, quantity: 1000, printingRequirements: "2 colours front", materialCode: "corrugated-kraft", finishingCodes: [], deliveryCity: "Riyadh", deliveryLocation: "Test address", contactName: "E2E Customer", phone: "+966500000000", email, locale: "ar" },
  })
).data.request;
ok(/^SL-RFQ-\d{4}-\d{5}$/.test(rfq.rfqNumber), `RFQ created (${rfq.rfqNumber})`);

await customer(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "PRICING" }, expect: [403] });
ok(true, "customers cannot use staff endpoints");
await customer(`/api/rfq/${rfq.id}/action`, { method: "POST", json: { action: "approve" }, expect: [409] });
ok(true, "customer cannot approve before a quotation is sent");

await admin("/api/auth/login", { method: "POST", json: ADMIN });
await admin(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "TECHNICAL_REVIEW" } });
await admin(`/api/admin/rfq/${rfq.id}/notes`, { method: "POST", json: { body: "Dieline checked", internal: false } });
await admin(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "PRICING" } });
const offer = (await admin(`/api/admin/rfq/${rfq.id}/offers`, { method: "POST", json: { unitPrice: 2.5, quantity: 1000, taxPercent: 15, leadTime: "TBD", terms: "", send: true } })).data.offer;
ok(!!offer.id, "staff reviewed, priced and sent the quotation");

const svg = await admin(`/api/designs/${design.id}/dieline.svg`);
ok(String(svg.data).includes("<svg"), "staff can download the SVG dieline");

const doc2 = await customer(`/ar/quotation/${offer.id}`);
ok(String(doc2.data).includes("2,875.00") || String(doc2.data).includes("2,875"), "customer sees the quotation document with the server-computed total");

await customer(`/api/rfq/${rfq.id}/action`, { method: "POST", json: { action: "approve" } });
const list = (await customer("/api/rfq")).data.requests;
ok(list.find((r) => r.id === rfq.id)?.status === "APPROVED", "customer approved; status is APPROVED");
await admin(`/api/admin/rfq/${rfq.id}`, { method: "PATCH", json: { status: "PRICING" }, expect: [409] });
ok(true, "approved requests are final");

console.log("\nAll end-to-end checks passed.");
