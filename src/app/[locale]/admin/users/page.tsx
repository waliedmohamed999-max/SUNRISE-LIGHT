import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can, STAFF_ROLES } from "@/lib/rbac";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsers({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = (await getCurrentUser())!;
  if (!can(user.role, "user.manage")) notFound();
  const t = getDict(locale);
  const users = await db.user.findMany({ where: { role: { in: STAFF_ROLES } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true, totpEnabledAt: true } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t.admin.users}</h1>
      <UsersManager users={users.map(({ totpEnabledAt, ...u }) => ({ ...u, mfa: !!totpEnabledAt }))} currentUserId={user.id} />
    </div>
  );
}
