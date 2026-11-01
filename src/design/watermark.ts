import { loadImage } from "./render";

/** Copy of a rendered canvas with the logo tiled across it, for images a customer downloads from the studio. */
export async function watermarkedCopy(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const logo = await loadImage("/brand/logo.png");
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const w = Math.max(out.width, out.height) * 0.26;
  const h = (w * logo.naturalHeight) / logo.naturalWidth;
  const reach = Math.hypot(out.width, out.height);
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((-26 * Math.PI) / 180);
  for (let y = -reach; y < reach; y += h * 2.6) {
    for (let x = -reach; x < reach; x += w * 1.3) ctx.drawImage(logo, x, y, w, h);
  }
  ctx.restore();
  return out;
}
