"use client";

import { useI18n } from "@/i18n/client";
import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState title={t.common.notFound} body={t.common.notFoundBody} action={<LinkButton href={`/${locale}`}>{t.common.backHome}</LinkButton>} />
    </div>
  );
}
