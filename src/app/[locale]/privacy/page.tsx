import type { Metadata } from "next";
import { getDict } from "@/i18n/dictionaries";
import { getContent } from "@/lib/content";
import type { Locale } from "@/i18n/config";
import { TextPage } from "@/components/site/TextPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).pages.privacyTitle, alternates: { canonical: `/${locale}/privacy` } };
}

const BODY = {
  ar: `نجمع البيانات التي تقدّمها عند إنشاء الحساب وطلب عروض الأسعار (الاسم، البريد، الجوال، الشركة، عنوان التسليم) لغرض معالجة طلباتك والتواصل معك.

تُخزَّن الشعارات والملفات التي ترفعها بشكل خاص، ولا يطّلع عليها إلا أنت وفريق المصنع المخوّل بمعالجة طلبك.

لا نبيع بياناتك لأطراف ثالثة. يمكنك طلب تصحيح بياناتك أو حذفها عبر صفحة التواصل.

نستخدم ملفات تعريف ارتباط ضرورية فقط لتسجيل الدخول وحفظ اللغة المفضلة.`,
  en: `We collect the information you provide when creating an account and requesting quotations (name, email, mobile, company, delivery address) to process your requests and contact you.

Logos and files you upload are stored privately and are only accessible to you and to factory staff authorised to process your request.

We do not sell your data to third parties. You can request correction or deletion of your data through the contact page.

We use only essential cookies for sign-in and to remember your preferred language.`,
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  // approved text from Admin → Website content ("privacy.body") replaces the built-in draft and its review notice
  const approved = (await getContent(locale))("privacy.body").trim();
  return <TextPage locale={locale} title={t.pages.privacyTitle} crumb={t.pages.privacyTitle} body={approved || BODY[locale]} notice={approved ? undefined : t.pages.legalDraft} />;
}
