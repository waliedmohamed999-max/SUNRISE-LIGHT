import qrcode from "qrcode-generator";

/*
 * Print codes drawn as vectors: QR (any text / URL, UTF-8 so Arabic works) and EAN-13 retail barcodes.
 */

export type CodeKind = "qr" | "ean13";

/** QR module matrix (true = dark), error correction M. */
export function qrMatrix(value: string): boolean[][] {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
  const q = qrcode(0, "M");
  q.addData(value || " ", "Byte");
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

/* ── EAN-13 ── */

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13CheckDigit(first12: string): number {
  const sum = [...first12].reduce((s, ch, i) => s + Number(ch) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

/** Normalise user input to a valid 13-digit EAN (12 digits → check digit added). Returns null if invalid. */
export function normaliseEan13(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12) return digits + ean13CheckDigit(digits);
  if (digits.length === 13 && ean13CheckDigit(digits.slice(0, 12)) === Number(digits[12])) return digits;
  return null;
}

/** 95-module bar pattern ("1" = bar) for a valid EAN-13. */
export function ean13Pattern(code: string): string {
  const parity = PARITY[Number(code[0])];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L : G)[Number(code[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[Number(code[i])];
  return bits + "101";
}

/** Draw a code centred on the origin inside a w×h box (pixels). */
export function drawCode(ctx: CanvasRenderingContext2D, kind: CodeKind, value: string, w: number, h: number, color: string, background: string | null) {
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = color;
  if (kind === "qr") {
    const m = qrMatrix(value);
    const quiet = 2;
    const n = m.length + quiet * 2;
    const cell = Math.min(w, h) / n;
    const ox = (w - cell * n) / 2 + quiet * cell;
    const oy = (h - cell * n) / 2 + quiet * cell;
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.4, cell + 0.4);
  } else {
    const code = normaliseEan13(value);
    if (!code) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, w / 120);
      ctx.strokeRect(0, 0, w, h);
      ctx.font = `600 ${h * 0.14}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EAN-13 ?", w / 2, h / 2);
      ctx.restore();
      return;
    }
    const bits = ean13Pattern(code);
    const total = bits.length + 18; // quiet zones (11 left incl. first digit, 7 right)
    const mod = w / total;
    const x0 = 11 * mod;
    const textH = h * 0.16;
    const barH = h - textH;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== "1") continue;
      const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      ctx.fillRect(x0 + i * mod, 0, mod + 0.3, guard ? barH + textH * 0.5 : barH);
    }
    ctx.font = `500 ${textH * 0.95}px Inter, Arial, sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    const ty = h - textH * 0.08;
    ctx.fillText(code[0], x0 - 6 * mod, ty);
    ctx.fillText(code.slice(1, 7), x0 + 24 * mod, ty);
    ctx.fillText(code.slice(7), x0 + 70 * mod, ty);
  }
  ctx.restore();
}
