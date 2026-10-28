"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { BellIcon, BoxIcon, cx, LayersIcon, PenIcon, UserIcon } from "@/components/ui";

export function AccountNav({ unread }: { unread: number }) {
  const { t, locale } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const b = `/${locale}/account`;
  const items = [
    { href: b, label: t.account.notifications, Icon: BellIcon, exact: true, badge: unread },
    { href: `${b}/designs`, label: t.account.designs, Icon: LayersIcon },
    { href: `/${locale}/studio`, label: t.account.newDesign, Icon: PenIcon },
    { href: `${b}/quotes`, label: t.account.quotes, Icon: BoxIcon },
    { href: `${b}/profile`, label: t.account.profile, Icon: UserIcon },
  ];
  return (
    <nav aria-label={t.account.title} className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, Icon, exact, badge }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-navy text-white" : "text-ink-500 hover:bg-white hover:text-navy")}>
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {!!badge && <span className="num rounded-full bg-sun px-2 text-xs font-bold text-navy">{badge}</span>}
          </Link>
        );
      })}
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push(`/${locale}`);
          router.refresh();
        }}
        className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink-500 hover:text-danger"
      >
        {t.nav.logout}
      </button>
    </nav>
  );
}
