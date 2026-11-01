import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";
import { activeShare } from "@/lib/shares";
import { ShareViewer, type ShareSpec } from "@/components/site/ShareViewer";

// private by link: never indexed, and the address is not passed on to other sites
export const metadata: Metadata = { title: "Sunrise Light 3D", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedDesign({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const share = await activeShare(token);
  if (!share) notFound();
  await db.designShare.update({ where: { id: share.id }, data: { views: { increment: 1 } } });
  return <ShareViewer token={share.token} spec={share.spec as unknown as ShareSpec} locale={locale} />;
}
