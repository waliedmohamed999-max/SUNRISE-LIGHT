import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/site/AccountActions";
import { PasswordForm } from "@/components/site/PasswordForm";

export default async function ProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const user = (await getCurrentUser())!;
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id }, include: { company: true } });
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold text-navy">{t.account.profile}</h1>
      <Card className="p-6 sm:p-8">
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            locale: user.locale,
            city: profile?.city ?? "",
            address: profile?.address ?? "",
            companyName: profile?.company?.name ?? "",
            crNumber: profile?.company?.crNumber ?? "",
            vatNumber: profile?.company?.vatNumber ?? "",
          }}
        />
      </Card>
      <h2 className="mt-10 mb-4 text-lg font-bold text-navy">{locale === "ar" ? "كلمة المرور" : "Password"}</h2>
      <Card className="p-6 sm:p-8">
        <PasswordForm />
      </Card>
    </section>
  );
}
