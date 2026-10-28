"use client";

import { useI18n } from "@/i18n/client";
import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState title={t.common.error} action={<Button onClick={reset}>{t.common.retry}</Button>} />
    </div>
  );
}
