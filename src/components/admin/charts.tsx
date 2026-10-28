import Link from "next/link";
import { cx } from "@/components/ui";

/** Daily counts as thin bars (single series, brand navy). Hover shows the day and value. */
export function DailyBars({ data, locale, label }: { data: { day: Date; n: number }[]; locale: "ar" | "en"; label: string }) {
  const W = 600;
  const H = 150;
  const pad = { t: 10, b: 22, x: 4 };
  const max = Math.max(1, ...data.map((d) => d.n));
  const step = (W - pad.x * 2) / data.length;
  const bw = Math.max(3, step - 2); // 2px gap between bars
  const y = (n: number) => pad.t + (H - pad.t - pad.b) * (1 - n / max);
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short" });
  const ticks = [0, Math.floor(data.length / 2), data.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" role="img" aria-label={label} preserveAspectRatio="none">
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="currentColor" className="text-navy/10" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={0} x2={W} y1={H - pad.b} y2={H - pad.b} stroke="currentColor" className="text-navy/25" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const x = pad.x + i * step + (step - bw) / 2;
          const top = y(d.n);
          const h = H - pad.b - top;
          return (
            <g key={i} className="group">
              <title>{`${fmt.format(d.day)}: ${d.n}`}</title>
              {/* hit target taller than the mark */}
              <rect x={pad.x + i * step} y={pad.t} width={step} height={H - pad.t - pad.b} fill="transparent" />
              {d.n > 0 && <path d={`M${x},${H - pad.b} V${top + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, bw / 2)},-${Math.min(4, h)} H${x + bw - Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, h)} V${H - pad.b} Z`} className="fill-navy transition group-hover:fill-sun" />}
            </g>
          );
        })}
      </svg>
      {/* time runs left to right in both languages, matching the bars */}
      <div dir="ltr" className="mt-1 flex justify-between text-[10px] text-ink-500">
        {ticks.map((i) => (
          <span key={i} className="num">
            {fmt.format(data[i].day)}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Ranked horizontal bars with the value at the end (labels in ink, bar carries magnitude). */
export function RankBars({ rows, empty }: { rows: { label: string; n: number; href?: string; hint?: string }[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const body = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{r.label}</span>
              <span className="num shrink-0 font-semibold text-navy">{r.n}</span>
            </div>
            <div className="h-2 rounded-full bg-navy/6">
              <div className="h-2 rounded-full bg-navy transition group-hover:bg-sun" style={{ width: r.n ? `${Math.max(2, (r.n / max) * 100)}%` : 0 }} />
            </div>
          </>
        );
        return (
          <li key={r.label} title={r.hint ?? `${r.label}: ${r.n}`} className="group">
            {r.href ? (
              <Link href={r.href} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Big number tile with an optional delta against the previous period. */
export function StatTile({ label, value, sub, delta, href, tone }: { label: string; value: string | number; sub?: string; delta?: number | null; href?: string; tone?: "warn" }) {
  const inner = (
    <>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={cx("num mt-2 text-3xl font-bold", tone === "warn" ? "text-warn" : "text-navy")}>{value}</p>
      <p className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
        {delta != null && Number.isFinite(delta) && (
          <span className={cx("num rounded-full px-1.5 py-0.5 font-semibold", delta >= 0 ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}%
          </span>
        )}
        {sub}
      </p>
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-navy/8 bg-white p-5 transition hover:shadow-[var(--shadow-card)]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
