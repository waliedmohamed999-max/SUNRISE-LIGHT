/**
 * Server-side password rules (NIST SP 800-63B style: length + blocklist, no composition rules).
 * Returns an error code, or null when the password is acceptable.
 */
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "11111111", "00000000",
  "qwerty123", "qwertyuiop", "1q2w3e4r", "1qaz2wsx", "iloveyou", "admin123", "administrator", "welcome1", "welcome123",
  "letmein1", "abc12345", "abcd1234", "aa123456", "sunrise123", "sunriselight", "changeme", "change-me", "change-me-now-123",
]);

export function passwordProblem(password: string, opts: { email?: string; minLength?: number } = {}): string | null {
  const min = opts.minLength ?? 8;
  if (password.length < min) return "password_too_short";
  if (password.length > 200) return "password_too_long";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "password_too_common";
  const local = opts.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "password_contains_email";
  return null;
}

export const PASSWORD_MESSAGES: Record<string, { ar: string; en: string }> = {
  password_too_short: { ar: "كلمة المرور قصيرة جدًا", en: "The password is too short" },
  password_too_common: { ar: "كلمة المرور شائعة وسهلة التخمين — اختر كلمة أطول وأقل شيوعًا", en: "This password is too common — choose a longer, less common one" },
  password_contains_email: { ar: "لا تستخدم اسم بريدك داخل كلمة المرور", en: "Don't use your email name inside the password" },
};
