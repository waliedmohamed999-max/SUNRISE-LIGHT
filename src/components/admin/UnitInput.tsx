"use client";

import { useEffect, useState } from "react";
import { cx, inputClass } from "@/components/ui";

/**
 * Number field for prices and quantities: keeps what is typed, reports a number (or null when empty)
 * and always shows its unit inside the field (ر.س / م², قطعة, % …) so every figure says what it is.
 */
export function UnitInput({
  value,
  onChange,
  label,
  unit,
  className,
  placeholder,
  integer,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  label: string;
  unit?: string;
  className?: string;
  placeholder?: string;
  integer?: boolean;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    if ((text === "" ? null : Number(text)) !== (value ?? null)) setText(value == null ? "" : String(value));
    // only external changes resync the text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cx("relative", className)}>
      <input
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        dir="ltr"
        aria-label={unit ? `${label} (${unit})` : label}
        placeholder={placeholder ?? "0"}
        className={cx(inputClass, "num py-1.5 pl-2 text-sm")}
        style={{ paddingRight: unit ? `${0.6 + unit.length * 0.42}rem` : "0.5rem" }}
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(integer ? /[^\d]/g : /[^\d.]/g, "");
          setText(raw);
          onChange(raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null);
        }}
      />
      {unit && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] font-medium whitespace-nowrap text-ink-500">
          {unit}
        </span>
      )}
    </div>
  );
}
