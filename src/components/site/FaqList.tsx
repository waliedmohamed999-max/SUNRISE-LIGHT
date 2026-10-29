import { cx } from "@/components/ui";

/** Editorial FAQ accordion: numbered questions in display type, native <details> (works without JavaScript). */
export function FaqList({ items, className }: { items: { id: string; q: string; a: string }[]; className?: string }) {
  return (
    <div className={cx("border-b border-dashed border-cork", className)}>
      {items.map((f, i) => (
        <details key={f.id} className="group border-t border-dashed border-cork" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-start gap-5 py-6 [&::-webkit-details-marker]:hidden">
            <span className="serif num w-8 shrink-0 pt-1.5 text-sm text-cream/35 group-open:text-ember">{String(i + 1).padStart(2, "0")}</span>
            <span className="display flex-1 text-[22px] leading-snug text-cream/80 transition group-open:text-cream group-hover:text-cream sm:text-[26px]">{f.q}</span>
            <span aria-hidden className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-cream/20 text-lg text-cream/70 transition group-open:rotate-45 group-open:border-ember group-open:bg-ember group-open:text-white">
              +
            </span>
          </summary>
          <p className="max-w-3xl pb-7 ps-[3.25rem] pe-14 text-[15px] leading-relaxed text-cream/65">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
