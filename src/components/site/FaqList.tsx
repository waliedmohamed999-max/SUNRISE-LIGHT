import { cx } from "@/components/ui";

export function FaqList({ items, className }: { items: { id: string; q: string; a: string }[]; className?: string }) {
  return (
    <div className={cx("divide-y divide-navy/8 rounded-[var(--radius-card)] border border-navy/8 bg-white", className)}>
      {items.map((f) => (
        <details key={f.id} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy">
            {f.q}
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-200 text-lg transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 leading-relaxed text-ink-500">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
