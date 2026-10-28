"use client";

import { useRouter } from "next/navigation";

export function HandledToggle({ id, handled, label }: { id: string; handled: boolean; label: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs text-ink-500">
      <input
        type="checkbox"
        checked={handled}
        onChange={async () => {
          await fetch("/api/admin/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, handled: !handled }) });
          router.refresh();
        }}
      />
      {label}
    </label>
  );
}
