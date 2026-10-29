"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Alert, buttonClass, cx, inputClass, Spinner } from "@/components/ui";
import { telUrl, whatsappUrl, type SiteInfo } from "@/lib/site-settings";

const ProductStage = dynamic(() => import("@/components/three/ProductStage"), { ssr: false });

/** Contact hero: editorial headline, one-tap actions and the live 3D carton (same stage as the homepage). */
export function ContactHero({ info }: { info: SiteInfo }) {
  const { locale, t } = useI18n();
  const ar = locale === "ar";
  const actions = [
    info.phone && telUrl(info.phone) ? { href: telUrl(info.phone)!, label: ar ? "اتصل الآن" : "Call now", primary: true } : null,
    whatsappUrl(info.whatsapp) ? { href: whatsappUrl(info.whatsapp)!, label: ar ? "واتساب" : "WhatsApp", external: true } : null,
    info.email2 || info.email ? { href: `mailto:${info.email2 || info.email}`, label: ar ? "راسلنا بالبريد" : "Email us" } : null,
    { href: "#contact-form", label: ar ? "أرسل رسالة" : "Send a message" },
  ].filter(Boolean) as { href: string; label: string; primary?: boolean; external?: boolean }[];

  return (
    <section className="relative z-20 overflow-hidden bg-walnut" aria-labelledby="contact-title">
      <div aria-hidden className="pointer-events-none absolute -start-40 top-20 size-[520px] rounded-full bg-ember/15 blur-[120px]" />
      <div className="relative grid min-h-[calc(88dvh-4.5rem)] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <nav aria-label={ar ? "مسار الصفحة" : "Breadcrumb"} className="eyebrow flex items-center gap-2 text-[11px] font-medium text-cream/45">
            <Link href={`/${locale}`} className="hover:text-cream">
              {t.common.breadcrumbHome}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-cream/75">{t.nav.contact}</span>
          </nav>
          <p className="eyebrow mt-10 text-xs font-medium text-ember">{t.brand.name}</p>
          <h1 id="contact-title" className="display mt-4 text-[56px] leading-[0.9] sm:text-[88px] lg:text-[104px]">
            {t.pages.contactTitle}
          </h1>
          <p className="display mt-6 max-w-xl text-[22px] leading-snug text-cream/80 sm:text-[28px]">{ar ? "فريق كامل… يعمل من أجل خدمتكم." : "A complete team… working to serve you."}</p>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-cream/60">
            {ar
              ? "اسألنا عن الخامات والمقاسات والطباعة، أو أرسل فكرة عبوتك ونساعدك في تحويلها إلى تصميم جاهز للتصنيع."
              : "Ask us about materials, sizes and printing, or send us your packaging idea and we will help turn it into a production-ready design."}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {actions.map((a) => (
              <a key={a.label} href={a.href} {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={buttonClass(a.primary ? "primary" : "outline", "md")}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
        <ProductStage kind="rsc" presenting className="relative h-[46vh] min-h-[320px] lg:h-[66vh]" />
      </div>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const { locale } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard unavailable (insecure context) */
        }
      }}
      className="eyebrow shrink-0 rounded-full border border-cream/20 px-3 py-1.5 text-[10px] font-medium text-cream/70 transition hover:border-cream/50 hover:text-cream"
    >
      {done ? (locale === "ar" ? "تم النسخ" : "Copied") : locale === "ar" ? "نسخ" : "Copy"}
    </button>
  );
}

/** Numbered contact channels (only what the factory has filled in) and the location card. */
export function ContactChannels({ info }: { info: SiteInfo }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const rows = [
    { label: ar ? "الهاتف" : "Phone", value: info.phone, href: telUrl(info.phone), ltr: true, action: ar ? "اتصل" : "Call" },
    { label: ar ? "هاتف إضافي" : "Second phone", value: info.phone2, href: telUrl(info.phone2), ltr: true, action: ar ? "اتصل" : "Call" },
    { label: "WhatsApp", value: info.whatsapp, href: whatsappUrl(info.whatsapp), ltr: true, action: ar ? "محادثة" : "Chat", external: true },
    { label: ar ? "البريد العام" : "General email", value: info.email, href: info.email ? `mailto:${info.email}` : null, ltr: true, action: ar ? "راسلنا" : "Write" },
    { label: ar ? "المبيعات وعروض الأسعار" : "Sales & quotations", value: info.email2, href: info.email2 ? `mailto:${info.email2}` : null, ltr: true, action: ar ? "راسلنا" : "Write" },
    { label: ar ? "ساعات العمل" : "Working hours", value: info.hours, href: null, ltr: false, action: "" },
  ].filter((r) => r.value);

  return (
    <section className="relative z-20 bg-walnut" aria-labelledby="channels-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="grid gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="eyebrow text-xs font-medium text-cream/60">{ar ? "قنوات التواصل" : "Ways to reach us"}</p>
          <h2 id="channels-title" className="display mt-4 text-[41px] leading-[0.9] sm:text-[56px]">
            {ar ? "نحن على بُعد رسالة" : "One message away"}
          </h2>
          <ol className="mt-12">
            {rows.map((r, i) => (
              <li key={r.label} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-cork py-5 last:border-b">
                <span className="serif num w-8 shrink-0 text-sm text-cream/35">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-[10px] font-medium text-cream/45">{r.label}</p>
                  {r.href ? (
                    <a href={r.href} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} dir={r.ltr ? "ltr" : undefined} className={cx("display mt-1 block text-[22px] leading-tight text-cream transition hover:text-ember sm:text-[30px]", r.ltr && "num text-start whitespace-nowrap rtl:text-end")}>
                      {r.value}
                    </a>
                  ) : (
                    <p className="display mt-1 text-[22px] leading-snug whitespace-pre-line text-cream sm:text-[26px]">{r.value}</p>
                  )}
                </div>
                {r.href && (
                  // under the value on small screens, beside it from sm up
                  <div className="flex w-full items-center gap-2 ps-[3.25rem] sm:w-auto sm:ps-0">
                    {r.ltr && <CopyButton value={r.value} />}
                    <a href={r.href} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="eyebrow shrink-0 text-[11px] font-medium text-ember hover:underline">
                      {r.action} {ar ? "←" : "→"}
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {info.social.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-4 text-xs font-medium text-cream/50">{ar ? "تابعنا" : "Follow us"}</p>
              <ul className="flex flex-wrap gap-2">
                {info.social.map((s) => (
                  <li key={s.key}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="block rounded-[22.5px] border border-cream/30 px-4 py-2 text-xs font-medium text-cream/80 transition hover:bg-cream hover:text-walnut">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* location */}
        {info.address && (
          <div className="lg:pt-24">
            <div className="overflow-hidden rounded-[12px] border border-cream/10 bg-bark/40">
              <LocationArt />
              <div className="space-y-4 p-6">
                <p className="eyebrow text-[10px] font-medium text-cream/45">{ar ? "مقرّنا" : "Our office"}</p>
                <p className="display text-[24px] leading-snug text-cream">{info.address}</p>
                {info.map && (
                  <a href={info.map} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
                    {ar ? "افتح الموقع في الخرائط" : "Open in Maps"}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Abstract street grid with a pin (no third-party map embed: keeps the strict CSP and visitors' privacy). */
function LocationArt() {
  return (
    <svg viewBox="0 0 400 220" className="block h-56 w-full" aria-hidden>
      <rect width="400" height="220" fill="#1a110b" />
      <g stroke="#3a2a1d" strokeWidth="10" strokeLinecap="round">
        <path d="M-10 70 L410 40" />
        <path d="M-10 160 L410 185" />
        <path d="M90 -10 L130 230" />
        <path d="M280 -10 L250 230" />
      </g>
      <g stroke="#2a1d14" strokeWidth="4">
        <path d="M-10 115 L410 110" />
        <path d="M190 -10 L200 230" />
        <path d="M340 -10 L360 230" />
        <path d="M30 -10 L40 230" />
      </g>
      <circle cx="198" cy="112" r="46" fill="#EA5B32" opacity="0.12" />
      <circle cx="198" cy="112" r="24" fill="#EA5B32" opacity="0.18" />
      <path d="M198 82c-12 0-21 9-21 21 0 16 21 33 21 33s21-17 21-33c0-12-9-21-21-21z" fill="#EA5B32" />
      <circle cx="198" cy="103" r="7" fill="#100904" />
    </svg>
  );
}

const TOPICS = [
  { key: "quote", ar: "طلب عرض سعر", en: "Quotation" },
  { key: "service", ar: "استفسار عن خدمة", en: "Service question" },
  { key: "design", ar: "مساعدة في التصميم", en: "Design help" },
  { key: "partnership", ar: "شراكة وتوريد", en: "Partnership" },
  { key: "other", ar: "أخرى", en: "Other" },
] as const;

/** Contact form in the editorial style: topic chips, fields, success state. */
export function ContactFormPanel() {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["key"]>("quote");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error" | "rate">("idle");
  const field = cx(inputClass, "bg-bark/40");

  return (
    <section id="contact-form" className="relative z-20 scroll-mt-24 bg-walnut" aria-labelledby="form-title">
      <div className="rule mx-4 sm:mx-8" />
      <div className="grid gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="eyebrow text-xs font-medium text-cream/60">{ar ? "رسالة مباشرة" : "Direct message"}</p>
          <h2 id="form-title" className="display mt-4 text-[41px] leading-[0.9] sm:text-[56px]">
            {t.pages.contactForm}
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-cream/60">
            {ar
              ? "تصل رسالتك مباشرة إلى فريق المبيعات في لوحة المصنع. لطلب سعر لعبوة مصممة، الأسرع أن تصممها في الاستوديو ثم ترسل طلب عرض السعر من حسابك."
              : "Your message goes straight to the sales team's dashboard. For a quotation on a designed box, the fastest route is to design it in the studio and send the request from your account."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/studio`} className={buttonClass("outline", "sm")}>
              {t.home.ctaDesign}
            </Link>
            <Link href={`/${locale}/quote`} className={buttonClass("ghost", "sm")}>
              {t.nav.quote}
            </Link>
          </div>
        </div>

        <div className="rounded-[12px] border border-cream/10 bg-bark/35 p-6 sm:p-8">
          {state === "ok" ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-ember text-2xl text-white" aria-hidden>
                ✓
              </span>
              <p className="display mt-6 text-[28px]">{ar ? "وصلت رسالتك" : "Message received"}</p>
              <p className="mt-3 text-sm text-cream/60">{t.pages.contactSent}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href={`/${locale}/services`} className={buttonClass("outline", "sm")}>
                  {t.nav.services}
                </Link>
                <button type="button" onClick={() => setState("idle")} className={buttonClass("ghost", "sm")}>
                  {ar ? "رسالة أخرى" : "Another message"}
                </button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setState("busy");
                const body = { ...Object.fromEntries(new FormData(e.currentTarget)), topic };
                const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
                setState(res?.ok ? "ok" : res?.status === 429 ? "rate" : "error");
              }}
            >
              <fieldset>
                <legend className="eyebrow mb-3 text-[11px] font-medium text-cream/55">{ar ? "موضوع الرسالة" : "Topic"}</legend>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((tp) => (
                    <button
                      key={tp.key}
                      type="button"
                      aria-pressed={topic === tp.key}
                      onClick={() => setTopic(tp.key)}
                      className={cx("rounded-[22.5px] border px-4 py-2 text-xs font-medium transition", topic === tp.key ? "border-ember bg-ember text-white" : "border-cream/25 text-cream/75 hover:border-cream/50")}
                    >
                      {tp[locale]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-cream/80">{t.pages.name}</span>
                  <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={field} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-cream/80">
                    {t.pages.phone} <span className="text-cream/40">({t.common.optional})</span>
                  </span>
                  <input name="phone" type="tel" dir="ltr" maxLength={30} autoComplete="tel" className={field} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-cream/80">{t.pages.email}</span>
                <input name="email" type="email" required dir="ltr" maxLength={200} autoComplete="email" className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-cream/80">{t.pages.message}</span>
                <textarea
                  name="message"
                  rows={6}
                  required
                  minLength={5}
                  maxLength={4000}
                  placeholder={ar ? "مثال: نحتاج 2000 علبة كرافت لمطعم بمقاس 20×15×8 سم مع طباعة الشعار بلون واحد" : "e.g. we need 2,000 kraft boxes for a restaurant, 20×15×8 cm, one-colour logo print"}
                  className={cx(field, "placeholder:text-cream/30")}
                />
              </label>
              {/* honeypot */}
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {state === "error" && <Alert tone="danger">{t.common.error}</Alert>}
              {state === "rate" && <Alert tone="warn">{ar ? "محاولات كثيرة، حاول لاحقًا." : "Too many attempts, try later."}</Alert>}
              <button type="submit" disabled={state === "busy"} className={buttonClass("primary", "lg", "w-full")}>
                {state === "busy" && <Spinner />}
                {ar ? "إرسال الرسالة" : "Send message"}
              </button>
              <p className="text-center text-[11px] text-cream/40">
                {ar ? "نستخدم بياناتك للرد على رسالتك فقط." : "We only use your details to reply to your message."}{" "}
                <Link href={`/${locale}/privacy`} className="underline underline-offset-4 hover:text-cream">
                  {t.pages.privacyTitle}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
