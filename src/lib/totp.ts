import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Two-step verification with time-based one-time passwords (RFC 6238: HMAC-SHA1, 6 digits, 30 s),
 * compatible with Google Authenticator, Microsoft Authenticator, 1Password, etc.
 * Secrets are stored encrypted (AES-256-GCM) with MFA_ENCRYPTION_KEY.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function totpAt(secretB32: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secretB32)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Returns the matching time step (current ±1 for clock drift) or null.
 * Steps at or before `lastStep` are refused, so an observed code cannot be replayed.
 */
export function verifyTotp(secretB32: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (lastStep !== null && s <= lastStep) continue;
    const expected = Buffer.from(totpAt(secretB32, s));
    if (timingSafeEqual(expected, Buffer.from(c))) return s;
  }
  return null;
}

export function otpauthUri(secretB32: string, account: string, issuer = "Sunrise Light") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/* ───────── secret encryption at rest ───────── */

function key(): Buffer | null {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) return null;
  // any sufficiently long string works; it is stretched to 32 bytes
  return createHash("sha256").update(raw).digest();
}

export const mfaAvailable = () => key() !== null;

export function sealSecret(plain: string): string {
  const k = key();
  if (!k) throw new Error("MFA_ENCRYPTION_KEY is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function openSecret(sealed: string): string {
  const k = key();
  if (!k) throw new Error("MFA_ENCRYPTION_KEY is not configured");
  const [v, iv, tag, enc] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("bad sealed secret");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
}
