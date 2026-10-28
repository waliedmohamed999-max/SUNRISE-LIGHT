"use client";

import { useState } from "react";

/** Native share sheet where available, otherwise copies the page link. */
export function ShareButton({ label, copied }: { label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ url, title: document.title });
          else {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 2500);
          }
        } catch {
          /* user dismissed the share sheet */
        }
      }}
      className="btn rounded-[22.5px] border border-cream/60 px-4 py-2 text-[11px] font-medium text-cream transition hover:bg-cream hover:text-walnut"
    >
      {done ? copied : label}
    </button>
  );
}
