import type { Dieline } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Vector dieline preview (mm units). Cut = solid red, crease = dashed blue, glue = hatched.
 * This is a visual preview, not a production cutting file.
 */
export function dielineToSvg(d: Dieline, opts: { title?: string; locale?: "ar" | "en"; validated?: boolean } = {}): string {
  const m = 20;
  const W = d.width + m * 2;
  const H = d.height + m * 2 + 14;
  const loc = opts.locale ?? "en";
  const r = (n: number) => Math.round(n * 100) / 100;
  const line = ([a, b]: [number, number][]) => `M${r(a[0] + m)} ${r(a[1] + m)}L${r(b[0] + m)} ${r(b[1] + m)}`;

  const glue = d.panels
    .filter((p) => p.kind === "glue")
    .map((p) => `<polygon points="${p.points.map((q) => `${r(q[0] + m)},${r(q[1] + m)}`).join(" ")}" fill="url(#hatch)"/>`)
    .join("");
  const labels = d.panels
    .filter((p) => p.kind === "face" || p.kind === "flap")
    .map((p) => {
      const cx = p.rect.x + p.rect.w / 2 + m;
      const cy = p.rect.y + p.rect.h / 2 + m;
      const size = Math.max(4, Math.min(p.rect.w, p.rect.h) / 8);
      return `<text x="${r(cx)}" y="${r(cy)}" font-size="${r(size)}" text-anchor="middle" dominant-baseline="middle" fill="#6b7a8a" font-family="Inter, Arial, sans-serif">${esc(p.label[loc])}</text>`;
    })
    .join("");
  const note =
    opts.validated === true
      ? loc === "ar" ? "قالب معتمد من المصنع" : "Factory-validated template"
      : loc === "ar" ? "معاينة تقريبية — تتطلب مراجعة فنية قبل الإنتاج" : "Approximate preview — requires technical review before production";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${r(W)}mm" height="${r(H)}mm" viewBox="0 0 ${r(W)} ${r(H)}">
<title>${esc(opts.title ?? "Dieline preview")}</title>
<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#B78B59" stroke-width="1"/></pattern></defs>
<rect width="100%" height="100%" fill="#ffffff"/>
${glue}
<g id="cut" fill="none" stroke="#d62828" stroke-width="0.35">${d.cuts.map((c) => `<path d="${line(c)}"/>`).join("")}</g>
<g id="crease" fill="none" stroke="#1d6fd6" stroke-width="0.35" stroke-dasharray="3 2">${d.folds.map((c) => `<path d="${line(c)}"/>`).join("")}</g>
<g id="labels">${labels}</g>
<text x="${m}" y="${r(H - 6)}" font-size="5" fill="#14283F" font-family="Inter, Arial, sans-serif">${esc(note)} · ${r(d.width)} × ${r(d.height)} mm</text>
</svg>`;
}
