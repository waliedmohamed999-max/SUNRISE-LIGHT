import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env-check";
import { buildSiteInfo, safeUrl, telUrl, validateSetting, whatsappUrl } from "@/lib/site-settings";

describe("startup configuration check", () => {
  const base = { NODE_ENV: "production", DATABASE_URL: "postgres://x", APP_URL: "https://sunrise.example", RESEND_API_KEY: "k", EMAIL_FROM: "a@b.c" };
  it("passes a complete production config", () => {
    expect(checkEnv(base)).toEqual([]);
  });
  it("errors on a missing database or incomplete S3 settings", () => {
    expect(checkEnv({ ...base, DATABASE_URL: undefined }).some((i) => i.level === "error")).toBe(true);
    expect(checkEnv({ ...base, STORAGE_DRIVER: "s3" }).some((i) => i.level === "error")).toBe(true);
    expect(checkEnv({ ...base, STORAGE_DRIVER: "s3", S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" })).toEqual([]);
  });
  it("warns on http APP_URL, missing email and the example admin password", () => {
    const issues = checkEnv({ ...base, APP_URL: "http://x", RESEND_API_KEY: undefined, SEED_ADMIN_PASSWORD: "change-me-now-123" });
    expect(issues.map((i) => i.level)).toEqual(["warn", "warn", "warn"]);
  });
});

describe("company settings", () => {
  it("validates phone, email and https links", () => {
    expect(validateSetting("phone", "+966 50 123 4567")).toBeNull();
    expect(validateSetting("phone", "call me")).toBe("phone");
    expect(validateSetting("email", "sales@sunrise.sa")).toBeNull();
    expect(validateSetting("email", "nope")).toBe("email");
    expect(validateSetting("url", "http://insecure.example")).toBe("url");
    expect(validateSetting("url", "")).toBeNull();
  });
  it("only renders safe links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://instagram.com/sunrise")).toBe("https://instagram.com/sunrise");
    expect(whatsappUrl("+966 50 123 4567")).toBe("https://wa.me/966501234567");
    expect(telUrl("+966 50 123 4567")).toBe("tel:+966501234567");
  });
  it("builds site info and drops empty or unsafe social links", () => {
    const values: Record<string, string> = { "contact.phone": " +966500000000 ", "social.instagram": "https://instagram.com/x", "social.x": "javascript:1", "company.vat": "300000000000003" };
    const info = buildSiteInfo((k) => values[k] ?? "", "ar");
    expect(info.phone).toBe("+966500000000");
    expect(info.social).toEqual([{ key: "instagram", label: "إنستغرام", url: "https://instagram.com/x" }]);
    expect(info.vat).toBe("300000000000003");
    expect(info.email).toBe("");
  });
});
