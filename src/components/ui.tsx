import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
// Editorial controls: one filled pill (bark), outlined ghost buttons with a cream hairline
const variants: Record<Variant, string> = {
  primary: "rounded-[36px] bg-btn text-btn-fg hover:bg-btn-hover",
  accent: "rounded-[36px] bg-ember text-white hover:brightness-110",
  outline: "rounded-[22.5px] border border-cream/80 bg-transparent text-cream hover:bg-cream hover:text-walnut",
  ghost: "rounded-[22.5px] text-cream/80 hover:text-cream hover:bg-cream/5",
  danger: "rounded-[22.5px] border border-danger/70 text-danger hover:bg-danger hover:text-walnut",
};
const sizes = { sm: "h-9 px-4 text-xs gap-1.5", md: "h-11 px-6 text-sm gap-2", lg: "h-13 px-7 text-sm gap-2.5" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cx(
    "btn inline-flex items-center justify-center font-medium tracking-normal transition-colors disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap",
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({ variant = "primary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-[var(--radius-card)] border border-navy/8 bg-white shadow-[var(--shadow-card)]", className)} {...rest} />;
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "sun" | "ok" | "warn" | "danger" | "navy"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-paper-200 text-ink-500",
    sun: "bg-sun-100 text-sun-600",
    ok: "bg-ok/10 text-ok",
    warn: "bg-warn/10 text-warn",
    danger: "bg-danger/10 text-danger",
    navy: "bg-navy text-white",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "warn" | "danger" | "ok"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-navy/10 bg-navy-100/50 text-navy",
    warn: "border-warn/25 bg-warn/8 text-warn",
    danger: "border-danger/25 bg-danger/8 text-danger",
    ok: "border-ok/25 bg-ok/8 text-ok",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

// Inputs: bottom border only, 0 radius (select/textarea get a faint fill so they read as fields)
export const inputClass =
  "w-full rounded-none border-0 border-b border-cream/40 bg-cream/[0.03] px-2 py-2.5 text-sm text-cream placeholder:text-cream/35 transition focus:border-cream focus:bg-cream/[0.06] focus:outline-none disabled:opacity-50";

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cx("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-navy/15 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-paper-200 text-kraft">{icon ?? <BoxIcon className="size-7" />}</div>
      <p className="font-semibold text-navy">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, body, center }: { eyebrow?: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="eyebrow mb-4 text-xs font-medium text-cream/60">{eyebrow}</p>}
      <h2 className="text-[29px] leading-[1.05] font-medium text-cream md:text-[41px] md:leading-[0.95]">{title}</h2>
      {body && <p className="mt-5 text-base leading-relaxed text-cream/65">{body}</p>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-navy-300 rtl:rotate-180">›</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-navy">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-navy">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Editorial page header (same language as the homepage chapters): eyebrow, large display title, glow. */
export function PageHeader({ title, body, crumbs, actions, eyebrow }: { title: string; body?: string; crumbs?: { label: string; href?: string }[]; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="relative overflow-hidden border-b border-dashed border-cork">
      <div aria-hidden className="pointer-events-none absolute -end-48 -top-32 size-[520px] rounded-full bg-ember/12 blur-[130px]" />
      <div className="relative px-4 pt-14 pb-16 sm:px-8 lg:pt-20">
        {crumbs && (
          <nav aria-label="breadcrumb" className="eyebrow text-[11px] font-medium text-cream/45">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((it, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>/</span>}
                  {it.href ? (
                    <Link href={it.href} className="hover:text-cream">
                      {it.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-cream/75">
                      {it.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-4xl">
            {eyebrow && <p className="eyebrow text-xs font-medium text-ember">{eyebrow}</p>}
            <h1 className="display mt-4 text-[48px] leading-[0.92] text-cream sm:text-[72px] lg:text-[88px]">{title}</h1>
            {body && <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-cream/65">{body}</p>}
          </div>
          {actions}
        </div>
      </div>
    </header>
  );
}

/* ── Icons (stroke, 24px grid) ─────────────────────────── */
type IconProps = { className?: string };
const icon = (d: ReactNode) =>
  function Icon({ className }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cx("size-5 shrink-0", className)} aria-hidden>
        {d}
      </svg>
    );
  };

export const BoxIcon = icon(<><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>);
export const MailerIcon = icon(<><path d="M3 9h18v10H3z" /><path d="M3 9l3-4h12l3 4" /><path d="M9 13h6" /></>);
export const CartonIcon = icon(<><path d="M7 3h10v18H7z" /><path d="M7 7h10M10 3v4" /></>);
export const CupIcon = icon(<><path d="M6 6h12l-1.5 14h-9z" /><path d="M5 6h14M8 3h8" /></>);
export const BagIcon = icon(<><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const GiftIcon = icon(<><path d="M4 10h16v11H4zM3 7h18v3H3zM12 7v14" /><path d="M12 7c-2-3-5-3-5-1s5 1 5 1 5 1 5-1-3-2-5 1" /></>);
export const FoodIcon = icon(<><path d="M4 11h16l-2 9H6z" /><path d="M7 11V8a5 5 0 0 1 10 0v3" /></>);
export const SparkIcon = icon(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>);
export const RulerIcon = icon(<><path d="m3 17 14-14 4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></>);
export const LayersIcon = icon(<><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>);
export const TextIcon = icon(<><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>);
export const UploadIcon = icon(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>);
export const PaletteIcon = icon(<><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 4 0 5-2a9 9 0 0 0-7-11z" /><circle cx="7.5" cy="11" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="15.5" cy="8.5" r="1" /></>);
export const UndoIcon = icon(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>);
export const RedoIcon = icon(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></>);
export const SaveIcon = icon(<><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></>);
export const ResetIcon = icon(<><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v4h4" /></>);
export const EyeIcon = icon(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const DownloadIcon = icon(<><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>);
export const TrashIcon = icon(<><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>);
export const CopyIcon = icon(<><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>);
export const CheckIcon = icon(<path d="m5 12 5 5 9-10" />);
export const ArrowIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const MenuIcon = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const XIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const CubeIcon = icon(<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>);
export const FlatIcon = icon(<><path d="M3 8h6v8H3zM9 8h6v8H9zM15 8h6v8h-6zM9 4h6v4M9 16h6v4" /></>);
export const PenIcon = icon(<><path d="m4 20 4-1 11-11-3-3L5 16z" /><path d="m14 6 3 3" /></>);
export const ZoomInIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v6M8 11h6" /></>);
export const ZoomOutIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M8 11h6" /></>);
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const BellIcon = icon(<><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>);
export const ShieldIcon = icon(<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>);
export const FactoryIcon = icon(<><path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17z" /><path d="M7 17h2M12 17h2M17 17h2" /></>);
export const TruckIcon = icon(<><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>);
export const SettingsIcon = icon(<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /></>);
export const RotateIcon = icon(<><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>);
export const LockIcon = icon(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const GridIcon = icon(<><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" /></>);
export const AlignCenterIcon = icon(<><path d="M12 3v18M7 7h10v4H7zM5 14h14v4H5z" /></>);
export const AlignMiddleIcon = icon(<><path d="M3 12h18M7 7h4v10H7zM14 5h4v14h-4z" /></>);
export const UpIcon = icon(<path d="m6 15 6-6 6 6" />);
export const DownIcon = icon(<path d="m6 9 6 6 6-6" />);
