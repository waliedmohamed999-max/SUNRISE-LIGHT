import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (!can(user.role, "admin.access")) notFound();
  const t = getDict(locale);
  const perms = {
    quotes: can(user.role, "rfq.view"),
    templates: can(user.role, "template.manage") || can(user.role, "template.validate"),
    materials: can(user.role, "material.manage"),
    customers: can(user.role, "customer.view"),
    content: can(user.role, "content.manage"),
    users: can(user.role, "user.manage"),
  };
  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col bg-paper-200/50 lg:flex-row">
      <aside className="border-b border-navy/8 bg-white lg:w-60 lg:shrink-0 lg:border-e lg:border-b-0">
        <div className="hidden px-5 pt-6 lg:block">
          <p className="text-xs font-bold tracking-wide text-ink-500 uppercase">{t.admin.title}</p>
          <p className="mt-1 truncate text-sm font-semibold text-navy">{user.name}</p>
          <p className="text-xs text-kraft">{t.roles[user.role]}</p>
        </div>
        <AdminNav perms={perms} />
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
