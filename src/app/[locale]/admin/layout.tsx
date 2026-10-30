import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { AdminNav } from "@/components/admin/AdminNav";
import { staffMfaRequired } from "@/lib/mfa-policy";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (!can(user.role, "admin.access")) notFound();
  // policy: staff must protect their account with two-step verification before using the dashboard
  if (staffMfaRequired() && !user.mfaEnabled) redirect(`/${locale}/account/profile?mfa=required#mfa`);
  const t = getDict(locale);
  const perms = {
    quotes: can(user.role, "rfq.view"),
    pricing: can(user.role, "pricing.manage"),
    templates: can(user.role, "template.manage") || can(user.role, "template.validate"),
    categories: can(user.role, "template.manage"),
    materials: can(user.role, "material.manage"),
    customers: can(user.role, "customer.view"),
    content: can(user.role, "content.manage"),
    users: can(user.role, "user.manage"),
  };
  // sidebar counters: new requests, unhandled messages, templates whose dieline is not yet validated
  const [quotes, messages, templates] = await Promise.all([
    perms.quotes ? db.quotationRequest.count({ where: { status: "NEW" } }) : 0,
    perms.customers ? db.contactMessage.count({ where: { handled: false } }) : 0,
    perms.templates ? db.packagingTemplate.count({ where: { isEnabled: true, currentVersion: { dielineValidated: false } } }) : 0,
  ]);
  return (
    <div className="theme-light flex min-h-[calc(100dvh-4.5rem)] flex-col bg-paper lg:flex-row">
      <aside className="border-b border-navy/8 bg-white lg:sticky lg:top-[4.5rem] lg:h-[calc(100dvh-4.5rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-e lg:border-b-0">
        <div className="hidden items-center gap-3 px-5 pt-6 pb-2 lg:flex">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">{user.name.trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">{user.name}</p>
            <p className="text-xs text-sun">{t.roles[user.role]}</p>
            <Link href={`/${locale}/account/profile`} className="text-[11px] text-ink-500 underline-offset-4 hover:text-navy hover:underline">
              {locale === "ar" ? "حسابي وكلمة المرور" : "My account & password"}
            </Link>
          </div>
        </div>
        <AdminNav perms={perms} badges={{ quotes, messages, templates }} />
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
