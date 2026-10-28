"use client";

import { Button, DownloadIcon } from "@/components/ui";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <DownloadIcon className="size-4" />
      {label}
    </Button>
  );
}
