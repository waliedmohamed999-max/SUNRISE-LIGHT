import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { AccountNav } from "@/components/site/AccountNav";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/account`);
  const t = getDict(locale);
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
      <aside>
        <p className="text-xs font-bold tracking-wide text-ink-500 uppercase">{t.account.title}</p>
        <p className="mt-1 truncate text-lg font-bold text-navy">{user.name}</p>
        <AccountNav unread={unread} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
