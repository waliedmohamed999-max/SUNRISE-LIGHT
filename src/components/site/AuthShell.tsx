import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import { Logo } from "./Logo";

/** Stacked isometric cartons in brand colours (pure SVG, no photography). */
function CartonStack() {
  const box = (x: number, y: number, s: number, top: string, left: string, right: string, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0-30 52 0 0 30-52 0z" fill={top} />
      <path d="M-52 0 0 30v60l-52-30z" fill={left} />
      <path d="M52 0 0 30v60l52-30z" fill={right} />
      {/* tape line on the lid */}
      <path d="M-26-15 26 15" stroke="rgb(0 0 0 / 0.12)" strokeWidth="4" />
    </g>
  );
  return (
    <svg viewBox="0 0 400 320" className="h-auto w-full max-w-md" aria-hidden>
      <ellipse cx="200" cy="292" rx="150" ry="18" fill="rgb(0 0 0 / 0.18)" />
      {box(140, 190, 1.15, "#E2B57E", "#B9874F", "#9C6E3D", "a")}
      {box(262, 205, 0.95, "#F07A55", "#D9542E", "#B9431F", "b")}
      {box(196, 98, 1, "#FFFFFF", "#DADDF0", "#BFC3E0", "c")}
      {/* logo dot on the white box */}
      <circle cx="214" cy="160" r="9" fill="#EA5B32" opacity="0.9" />
    </svg>
  );
}

export function AuthShell({ title, subtitle, aside, points, locale, children }: { title: string; subtitle?: string; aside: string; points: string[]; locale: Locale; children: React.ReactNode }) {
  return (
    <div className="theme-light grid min-h-[calc(100dvh-4.5rem)] bg-paper lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-[#2F357C] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <div aria-hidden className="absolute -end-32 -top-32 size-96 rounded-full bg-[#EA5B32]/25 blur-3xl" />
        <Logo locale={locale} variant="dark" className="relative h-14 w-auto self-start" />
        <div className="relative flex justify-center py-6">
          <CartonStack />
        </div>
        <div className="relative space-y-6">
          <p className="max-w-lg text-[28px] leading-snug font-semibold">{aside}</p>
          <ul className="space-y-3 text-sm text-white/85">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#EA5B32] text-xs font-bold text-white">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* form */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Logo locale={locale} variant="light" className="mb-8 h-12 w-auto lg:hidden" />
          <div className="rounded-3xl border border-navy/8 bg-white p-7 shadow-[0_20px_60px_-30px_rgb(47_53_124/0.35)] sm:p-9">
            <h1 className="text-2xl font-bold text-navy">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
            <div className="mt-7">
              <Suspense>{children}</Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
