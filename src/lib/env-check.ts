/** Configuration problems found at startup. "error" stops a production server; "warn" is logged. */
export interface EnvIssue {
  level: "error" | "warn";
  message: string;
}

export function checkEnv(env: Record<string, string | undefined>): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const prod = env.NODE_ENV === "production";
  if (!env.DATABASE_URL) issues.push({ level: "error", message: "DATABASE_URL is not set" });
  if (!env.APP_URL) issues.push({ level: "warn", message: "APP_URL is not set — links in notifications, the sitemap and canonical URLs fall back to http://localhost:3000" });
  else if (prod && !env.APP_URL.startsWith("https://")) issues.push({ level: "warn", message: `APP_URL should use https in production (got ${env.APP_URL})` });
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) issues.push({ level: "warn", message: "Email is not configured (RESEND_API_KEY / EMAIL_FROM) — notifications stay in-app only" });
  const driver = env.STORAGE_DRIVER || "local";
  if (driver === "s3" && (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY)) issues.push({ level: "error", message: "STORAGE_DRIVER=s3 needs S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY" });
  if (driver !== "local" && driver !== "s3") issues.push({ level: "error", message: `Unknown STORAGE_DRIVER "${driver}" (use local or s3)` });
  if (!env.MFA_ENCRYPTION_KEY || env.MFA_ENCRYPTION_KEY.length < 32) issues.push({ level: env.REQUIRE_STAFF_MFA === "true" ? "error" : "warn", message: "MFA_ENCRYPTION_KEY is missing or shorter than 32 characters — two-step verification is unavailable" });
  if (prod && env.REQUIRE_STAFF_MFA !== "true") issues.push({ level: "warn", message: "REQUIRE_STAFF_MFA is not enabled — staff accounts can use the dashboard without two-step verification" });
  if (prod && env.SEED_ADMIN_PASSWORD && /change-me/i.test(env.SEED_ADMIN_PASSWORD)) issues.push({ level: "warn", message: "SEED_ADMIN_PASSWORD still has the example value — change the admin password after the first sign-in" });
  return issues;
}
