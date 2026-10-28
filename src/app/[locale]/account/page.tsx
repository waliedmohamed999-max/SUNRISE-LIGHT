import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { cx, EmptyState } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";
import { MarkReadButton } from "@/components/site/AccountActions";

export default async function AccountHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = notifications.some((n) => !n.readAt);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy">{t.account.notifications}</h1>
        {unread && <MarkReadButton />}
      </div>
      {notifications.length === 0 ? (
        <EmptyState title={t.account.noNotifications} />
      ) : (
        <ul className="divide-y divide-navy/8 rounded-[var(--radius-card)] border border-navy/8 bg-white">
          {notifications.map((n) => {
            const inner = (
              <>
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-sun")} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">{n.title}</span>
                  <span className="mt-0.5 block text-sm text-ink-500">{n.body}</span>
                </span>
                <span className="num shrink-0 text-xs text-ink-500">{fmtDate(n.createdAt, locale, true)}</span>
              </>
            );
            return (
              <li key={n.id}>
                {n.link?.startsWith("/") ? (
                  <Link href={n.link} className="flex gap-3 px-5 py-4 hover:bg-paper/60">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-5 py-4">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
