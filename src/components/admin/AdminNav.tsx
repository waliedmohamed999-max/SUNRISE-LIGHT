"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { BoxIcon, cx, FactoryIcon, LayersIcon, PenIcon, SettingsIcon, ShieldIcon, UserIcon, BellIcon, GridIcon, PaletteIcon, CubeIcon, LockIcon } from "@/components/ui";

export type AdminPerms = Record<"quotes" | "templates" | "categories" | "materials" | "customers" | "content" | "users", boolean>;
export type AdminBadges = { quotes: number; messages: number; templates: number };

type NavItem = { href: string; label: string; Icon: (p: { className?: string }) => React.ReactNode; show: boolean; exact?: boolean; badge?: number; warn?: boolean };

export function AdminNav({ perms, badges }: { perms: AdminPerms; badges: AdminBadges }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const path = usePathname();
  const b = `/${locale}/admin`;
  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: ar ? "العمليات" : "Operations",
      items: [
        { href: b, label: t.admin.overview, Icon: GridIcon, show: true, exact: true },
        { href: `${b}/quotes`, label: t.admin.quotes, Icon: BoxIcon, show: perms.quotes, badge: badges.quotes },
        { href: `${b}/designs`, label: ar ? "تصاميم العملاء" : "Customer designs", Icon: PaletteIcon, show: perms.customers },
        { href: `${b}/customers`, label: t.admin.customers, Icon: UserIcon, show: perms.customers },
        { href: `${b}/messages`, label: t.admin.messages, Icon: BellIcon, show: perms.customers, badge: badges.messages },
      ],
    },
    {
      label: ar ? "الكتالوج" : "Catalogue",
      items: [
        { href: `${b}/categories`, label: ar ? "الفئات" : "Categories", Icon: CubeIcon, show: perms.categories },
        { href: `${b}/templates`, label: t.admin.templates, Icon: LayersIcon, show: perms.templates, badge: badges.templates, warn: true },
        { href: `${b}/materials`, label: t.admin.materials, Icon: SettingsIcon, show: perms.materials },
      ],
    },
    {
      label: ar ? "الموقع" : "Website",
      items: [
        { href: `${b}/settings`, label: ar ? "إعدادات الشركة" : "Company settings", Icon: FactoryIcon, show: perms.content },
        { href: `${b}/content`, label: t.admin.content, Icon: PenIcon, show: perms.content },
      ],
    },
    {
      label: ar ? "الإدارة" : "Administration",
      items: [
        { href: `${b}/users`, label: t.admin.users, Icon: ShieldIcon, show: perms.users },
        { href: `${b}/audit`, label: t.admin.audit, Icon: LayersIcon, show: perms.users },
        { href: `${b}/system`, label: ar ? "حالة النظام" : "System status", Icon: LockIcon, show: perms.users },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length);

  return (
    <nav aria-label={t.admin.title} className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:gap-4">
      {groups.map((g) => (
        <div key={g.label} className="flex gap-1 lg:flex-col">
          <p className="hidden px-3 pb-1 text-[10px] font-bold tracking-wider text-ink-500/80 uppercase lg:block">{g.label}</p>
          {g.items.map(({ href, label, Icon, exact, badge, warn }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "bg-navy text-white shadow-sm" : "text-ink-500 hover:bg-paper-200 hover:text-navy")}
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className={cx("num min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold", active ? "bg-white text-navy" : warn ? "bg-warn/15 text-warn" : "bg-sun text-white")}>{badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
