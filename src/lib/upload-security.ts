import DOMPurify from "isomorphic-dompurify";

export type AllowedMime = "image/png" | "image/jpeg" | "image/svg+xml";

export interface InspectedImage {
  mime: AllowedMime;
  width: number;
  height: number;
  data: Buffer;
}

export class UploadRejected extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_PIXELS = 60_000_000;

function pngSize(buf: Buffer) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG) || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf: Buffer) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const MAX_SVG_SIDE = 20_000;
const clampSide = (n: number) => Math.min(MAX_SVG_SIDE, Math.max(1, Math.round(n)));

function svgSize(svg: string) {
  const vb = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (vb) return { width: clampSide(+vb[1]), height: clampSide(+vb[2]) };
  const w = svg.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
  const h = svg.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  if (w && h) return { width: clampSide(+w[1]), height: clampSide(+h[1]) };
  return { width: 512, height: 512 };
}

/** Strip scripts, event handlers, foreign objects and external references from an SVG. */
export function sanitizeSvg(raw: string): string {
  if (/<!ENTITY|<!DOCTYPE/i.test(raw)) throw new UploadRejected("svg_doctype");
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "iframe", "embed", "object", "use", "a", "animate", "set"],
    FORBID_ATTR: ["href", "xlink:href", "src", "action", "formaction"],
  });
  if (!/^\s*<svg[\s>]/i.test(clean)) throw new UploadRejected("svg_invalid");
  if (/url\(\s*['"]?\s*(?!#)/i.test(clean) || /@import/i.test(clean)) throw new UploadRejected("svg_external_ref");
  return clean.includes("xmlns=") ? clean : clean.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/**
 * Validate an upload by its actual bytes (the declared MIME type and file name are not trusted).
 */
export function inspectImage(data: Buffer, maxBytes: number): InspectedImage {
  if (data.length === 0) throw new UploadRejected("empty");
  if (data.length > maxBytes) throw new UploadRejected("too_large");

  const png = pngSize(data);
  if (png) {
    if (!png.width || !png.height) throw new UploadRejected("invalid_dimensions");
    if (png.width * png.height > MAX_PIXELS) throw new UploadRejected("too_many_pixels");
    return { mime: "image/png", ...png, data };
  }
  const jpg = jpegSize(data);
  if (jpg) {
    if (!jpg.width || !jpg.height) throw new UploadRejected("invalid_dimensions");
    if (jpg.width * jpg.height > MAX_PIXELS) throw new UploadRejected("too_many_pixels");
    return { mime: "image/jpeg", ...jpg, data };
  }
  const head = data.subarray(0, 1024).toString("utf8").replace(/^﻿/, "").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--")) {
    const clean = sanitizeSvg(data.toString("utf8"));
    return { mime: "image/svg+xml", ...svgSize(clean), data: Buffer.from(clean, "utf8") };
  }
  throw new UploadRejected("unsupported_type");
}
