"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { BoxIcon, cx, FactoryIcon, LayersIcon, PenIcon, SettingsIcon, ShieldIcon, UserIcon, BellIcon, GridIcon } from "@/components/ui";

export function AdminNav({ perms }: { perms: Record<"quotes" | "templates" | "materials" | "customers" | "content" | "users", boolean> }) {
  const { t, locale } = useI18n();
  const path = usePathname();
  const b = `/${locale}/admin`;
  const items = [
    { href: b, label: t.admin.overview, Icon: GridIcon, show: true, exact: true },
    { href: `${b}/quotes`, label: t.admin.quotes, Icon: BoxIcon, show: perms.quotes },
    { href: `${b}/templates`, label: t.admin.templates, Icon: LayersIcon, show: perms.templates },
    { href: `${b}/materials`, label: t.admin.materials, Icon: SettingsIcon, show: perms.materials },
    { href: `${b}/customers`, label: t.admin.customers, Icon: UserIcon, show: perms.customers },
    { href: `${b}/messages`, label: t.admin.messages, Icon: BellIcon, show: perms.customers },
    { href: `${b}/content`, label: t.admin.content, Icon: PenIcon, show: perms.content },
    { href: `${b}/users`, label: t.admin.users, Icon: ShieldIcon, show: perms.users },
    { href: `${b}/audit`, label: t.admin.audit, Icon: FactoryIcon, show: perms.users },
  ].filter((i) => i.show);
  return (
    <nav aria-label={t.admin.title} className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
      {items.map(({ href, label, Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-navy text-white" : "text-ink-500 hover:bg-paper-200 hover:text-navy")}>
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
