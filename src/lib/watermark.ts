import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OPACITY = 0.24;
let logoFile: Promise<Buffer> | null = null;
const logo = () => (logoFile ??= readFile(path.join(process.cwd(), "public", "brand", "logo.png")));

/**
 * Burns the Sunrise Light logo into an image as a diagonal repeating pattern, on the server,
 * so what customers save or share can never exist without it. Clean output is rendered only in the dashboard.
 */
export async function watermarkPng(input: Buffer, maxSide = 1400): Promise<Buffer> {
  const base = await sharp(input).resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const { width = 0, height = 0 } = await sharp(base).metadata();
  // the tile has to fit inside the image, or sharp refuses to composite it
  const side = Math.max(1, Math.min(width, height));
  const mark = await sharp(await logo())
    .resize({ width: Math.max(24, Math.round(Math.min(side * 0.62, Math.max(width, height) * 0.3))) })
    .ensureAlpha()
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * OPACITY)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
    .png()
    .toBuffer();
  const turned = await sharp(mark)
    .rotate(-26, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(turned).metadata();
  const scale = Math.min(1, side / Math.max(meta.width ?? 1, meta.height ?? 1));
  const tile = scale < 1 ? await sharp(turned).resize({ width: Math.max(1, Math.floor((meta.width ?? 1) * scale)) }).png().toBuffer() : turned;
  return sharp(base).composite([{ input: tile, tile: true }]).png().toBuffer();
}
