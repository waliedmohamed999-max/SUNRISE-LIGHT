import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { base32Encode, currentStep, openSecret, sealSecret, totpAt, verifyTotp } from "@/lib/totp";
import { passwordProblem } from "@/lib/password-policy";
import { safeNextPath } from "@/lib/safe-redirect";
import { clientIp } from "@/lib/api";
import { inspectImage, UploadRejected } from "@/lib/upload-security";

const SECRET = base32Encode(Buffer.from("12345678901234567890")); // RFC 6238 test key (SHA-1)

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC test vectors (last 6 digits)", () => {
    expect(totpAt(SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(SECRET, Math.floor(1234567890 / 30))).toBe("005924");
  });
  it("accepts ±1 step and refuses replays and malformed codes", () => {
    const now = 1_800_000_000_000;
    const step = currentStep(now);
    expect(verifyTotp(SECRET, totpAt(SECRET, step), null, now)).toBe(step);
    expect(verifyTotp(SECRET, totpAt(SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(SECRET, totpAt(SECRET, step - 3), null, now)).toBeNull();
    expect(verifyTotp(SECRET, totpAt(SECRET, step), step, now)).toBeNull(); // already used
    expect(verifyTotp(SECRET, "12345a", null, now)).toBeNull();
  });
  it("encrypts secrets at rest and detects tampering", () => {
    process.env.MFA_ENCRYPTION_KEY = "k".repeat(40);
    const sealed = sealSecret(SECRET);
    expect(sealed).not.toContain(SECRET);
    expect(openSecret(sealed)).toBe(SECRET);
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered!!").toString("base64url");
    expect(() => openSecret(parts.join("."))).toThrow();
  });
});

describe("password policy", () => {
  it("rejects short, common and email-based passwords", () => {
    expect(passwordProblem("short", {})).toBe("password_too_short");
    expect(passwordProblem("password123", {})).toBe("password_too_common");
    expect(passwordProblem("aaaaaaaaaa", {})).toBe("password_too_common");
    expect(passwordProblem("mohamed2026!", { email: "mohamed@example.com" })).toBe("password_contains_email");
    expect(passwordProblem("short-pass", { minLength: 14 })).toBe("password_too_short");
    expect(passwordProblem("kraft-carton-river-42", { email: "sales@example.com" })).toBeNull();
  });
});

describe("post-login redirect", () => {
  it("only allows locale-prefixed same-site paths", () => {
    expect(safeNextPath("/ar/admin")).toBe("/ar/admin");
    expect(safeNextPath("/en/account?tab=1")).toBe("/en/account?tab=1");
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "/ar\\@evil", "/xx/admin", "javascript:alert(1)", "/ar/\u0000", ""]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });
});

describe("client IP for rate limits", () => {
  const req = (h: Record<string, string>) => ({ headers: new Headers(h) }) as unknown as NextRequest;
  afterEach(() => delete process.env.TRUST_PROXY_HOPS);
  it("ignores client-forged X-Forwarded-For entries", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    process.env.TRUST_PROXY_HOPS = "2";
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 198.51.100.4, 10.0.0.2" }))).toBe("198.51.100.4");
  });
  it("rejects non-IP values", () => {
    expect(clientIp(req({ "x-forwarded-for": "<script>" }))).toBe("unknown");
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("upload inspection", () => {
  const svg = (s: string) => Buffer.from(s, "utf8");
  it("strips scripts and event handlers from SVG", () => {
    const out = inspectImage(svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect onload="alert(1)" width="5" height="5"/></svg>'), 1e6);
    const text = out.data.toString("utf8");
    expect(text).not.toMatch(/script|onload/i);
    expect(out.mime).toBe("image/svg+xml");
  });
  it("rejects entities, external references and unknown types", () => {
    const code = (b: Buffer) => {
      try {
        inspectImage(b, 1e6);
        return "accepted";
      } catch (e) {
        return e instanceof UploadRejected ? e.code : "error";
      }
    };
    expect(code(svg('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>'))).toBe("svg_doctype");
    expect(code(svg('<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://evil.example/x)"/></svg>'))).toBe("svg_external_ref");
    expect(code(Buffer.from("<html><script>alert(1)</script></html>"))).toBe("unsupported_type");
    expect(code(Buffer.from("MZ\x90\x00 executable"))).toBe("unsupported_type");
  });
  it("caps the declared SVG size", () => {
    const out = inspectImage(svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9999999 9999999"></svg>'), 1e6);
    expect(out.width).toBeLessThanOrEqual(20_000);
    expect(out.height).toBeLessThanOrEqual(20_000);
  });
});
