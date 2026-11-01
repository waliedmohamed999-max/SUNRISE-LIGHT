import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { activeShare, isExpiredShare, purgeExpiredShares } from "@/lib/shares";
import { buttonClass } from "@/components/ui";
import Link from "next/link";
import { ShareViewer, type ShareSpec } from "@/components/site/ShareViewer";

// private by link: never indexed, and the address is not passed on to other sites
export const metadata: Metadata = { title: "Sunrise Light 3D", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedDesign({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const share = await activeShare(token);
  if (!share) {
    if (!(await isExpiredShare(token))) notFound();
    await purgeExpiredShares();
    const ar = locale === "ar";
    return (
      <main className="grid min-h-[70dvh] place-items-center bg-[#050505] px-4 py-16 text-center text-cream">
        <div className="max-w-md">
          <h1 className="display text-3xl text-[#E2BC6B]">{ar ? "انتهت صلاحية الرابط" : "This link has expired"}</h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/70">
            {ar ? "روابط المعاينة ثلاثية الأبعاد تعمل لمدة 10 أيام. اطلب من صاحب التصميم إرسال رابط جديد." : "3D preview links work for 10 days. Ask the design's owner to send a new link."}
          </p>
          <Link href={`/${locale}/contact`} className={buttonClass("outline", "md", "mt-8")}>
            {ar ? "تواصل معنا" : "Contact us"}
          </Link>
        </div>
      </main>
    );
  }
  await db.designShare.update({ where: { id: share.id }, data: { views: { increment: 1 } } });
  return <ShareViewer token={share.token} spec={share.spec as unknown as ShareSpec} locale={locale} />;
}
