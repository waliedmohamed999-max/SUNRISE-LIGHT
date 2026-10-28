"use client";

/** Procedural workbench surfaces for the opening shot (no photographs). */

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 7) {
  const img = ctx.getImageData(0, 0, w, h);
  let s = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s % 100) / 100 - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Warm wood table top with long grain streaks. */
export function woodCanvas(w = 2048, h = 1024) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#7a4e2c";
  ctx.fillRect(0, 0, w, h);
  let s = 19;
  const rnd = () => ((s = (s * 16807) % 2147483647) % 10000) / 10000;
  for (let i = 0; i < 260; i++) {
    const y = rnd() * h;
    const amp = 2 + rnd() * 10;
    const freq = 0.002 + rnd() * 0.006;
    ctx.strokeStyle = rnd() > 0.5 ? `rgba(40,20,8,${0.08 + rnd() * 0.18})` : `rgba(210,150,95,${0.05 + rnd() * 0.12})`;
    ctx.lineWidth = 1 + rnd() * 4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const yy = y + Math.sin(x * freq + i) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  noise(ctx, w, h, 10);
  return c;
}

/**
 * Self-healing cutting mat, `wMm` × `hMm`, 10 mm grid, 50 mm major lines,
 * centimetre numbers along two edges.
 */
export function precisionMatCanvas(wMm = 900, hMm = 600, pxPerMm = 2.4) {
  const w = Math.round(wMm * pxPerMm);
  const h = Math.round(hMm * pxPerMm);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2f6a4c");
  g.addColorStop(1, "#285c41");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 9);

  const margin = 20 * pxPerMm;
  for (let mm = 0; mm <= wMm - 40; mm += 10) {
    const x = margin + mm * pxPerMm;
    const major = mm % 50 === 0;
    ctx.strokeStyle = major ? "rgba(235,245,225,0.55)" : "rgba(235,245,225,0.28)";
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, h - margin);
    ctx.stroke();
    if (mm % 100 === 0) {
      ctx.fillStyle = "rgba(235,245,225,0.75)";
      ctx.font = `500 ${7 * pxPerMm}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(mm / 10), x, margin - 6 * pxPerMm);
    }
  }
  for (let mm = 0; mm <= hMm - 40; mm += 10) {
    const y = margin + mm * pxPerMm;
    const major = mm % 50 === 0;
    ctx.strokeStyle = major ? "rgba(235,245,225,0.55)" : "rgba(235,245,225,0.28)";
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
    if (mm % 100 === 0) {
      ctx.fillStyle = "rgba(235,245,225,0.75)";
      ctx.font = `500 ${7 * pxPerMm}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(mm / 10), margin - 9 * pxPerMm, y + 2.5 * pxPerMm);
    }
  }
  // 45° guide lines, as on real mats
  ctx.strokeStyle = "rgba(235,245,225,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, h - margin);
  ctx.lineTo(margin + (h - 2 * margin), margin);
  ctx.stroke();
  return c;
}
