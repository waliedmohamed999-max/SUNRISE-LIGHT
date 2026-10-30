import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { mfaAvailable } from "@/lib/totp";
import { staffMfaRequired } from "@/lib/mfa-policy";
import { getCurrentUser } from "@/lib/auth";
import { can, STAFF_ROLES } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { Badge, Card } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";

type Check = { label: string; ok: boolean | null; detail: string };

const mb = (b: number) => `${(b / 1_048_576).toFixed(1)} MB`;

export default async function AdminSystem({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "user.manage")) notFound();

  const t0 = performance.now();
  const [{ version }] = await db.$queryRaw<{ version: string }[]>`SELECT version()`;
  const dbMs = Math.round(performance.now() - t0);

  const [customers, staff, templates, validated, materials, approvedMaterials, designs, rfqs, assets, notif, failed, contact, pricingActive] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: { in: STAFF_ROLES }, isActive: true } }),
    db.packagingTemplate.count({ where: { isEnabled: true } }),
    db.packagingTemplate.count({ where: { isEnabled: true, currentVersion: { dielineValidated: true } } }),
    db.materialType.count({ where: { isAvailable: true } }),
    db.materialType.count({ where: { isAvailable: true, factoryApproved: true } }),
    db.designProject.count({ where: { deletedAt: null } }),
    db.quotationRequest.count(),
    db.uploadedAsset.aggregate({ _count: true, _sum: { sizeBytes: true } }),
    db.notification.groupBy({ by: ["channel", "status"], _count: true }),
    db.notification.findMany({ where: { channel: "EMAIL", status: { in: ["FAILED", "SKIPPED"] } }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, type: true, recipient: true, status: true, error: true, createdAt: true } }),
    db.websiteContent.findMany({ where: { key: { in: ["contact.phone", "contact.email", "contact.address"] } }, select: { key: true, valueAr: true, valueEn: true } }),
    db.pricingRule.count({ where: { isActive: true } }),
  ]);

  const env = process.env;
  // admins still signing in with the password from the seed configuration
  const admins = await db.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true }, select: { email: true, passwordHash: true } });
  const seedPassword = env.SEED_ADMIN_PASSWORD;
  const weakAdmins = seedPassword ? (await Promise.all(admins.map(async (a) => ((await verifyPassword(seedPassword, a.passwordHash)) ? a.email : null)))).filter(Boolean) : [];
  const emailOn = !!env.RESEND_API_KEY && !!env.EMAIL_FROM;
  const storage = env.STORAGE_DRIVER || "local";
  const appUrl = env.APP_URL ?? "";
  const contactFilled = contact.filter((c) => c.valueAr.trim() || c.valueEn.trim()).length;
  const emailCount = (s: string) => notif.filter((n) => n.channel === "EMAIL" && n.status === s).reduce((a, n) => a + n._count, 0);

  const staffMfa = await db.user.groupBy({ by: ["totpEnabledAt"], where: { role: { in: STAFF_ROLES }, isActive: true }, _count: true });
  const staffTotal = staffMfa.reduce((a, g) => a + g._count, 0);
  const staffWithMfa = staffMfa.filter((g) => g.totpEnabledAt).reduce((a, g) => a + g._count, 0);
  const checks: Check[] = [
    {
      label: ar ? "التحقق بخطوتين لفريق المصنع" : "Staff two-step verification",
      ok: !mfaAvailable() ? false : staffWithMfa === staffTotal ? true : null,
      detail: !mfaAvailable()
        ? ar ? "غير متاح — MFA_ENCRYPTION_KEY غير مهيأ" : "Unavailable — MFA_ENCRYPTION_KEY not set"
        : `${staffWithMfa} / ${staffTotal} ${ar ? "حساب مفعّل" : "accounts enabled"} · ${staffMfaRequired() ? (ar ? "إلزامي" : "required") : ar ? "اختياري (REQUIRE_STAFF_MFA)" : "optional (REQUIRE_STAFF_MFA)"}`,
    },
    {
      label: ar ? "كلمة مرور المدير" : "Admin password",
      ok: weakAdmins.length === 0,
      detail: weakAdmins.length
        ? ar ? `${weakAdmins.join("، ")} ما زال يستخدم كلمة المرور الأولية من ملف الإعداد — غيّرها من «حسابي»` : `${weakAdmins.join(", ")} still uses the seed password — change it from “My account”`
        : ar ? "لا يوجد مدير يستخدم كلمة المرور الأولية" : "No admin uses the seed password",
    },
    { label: ar ? "قاعدة البيانات" : "Database", ok: true, detail: `${version.split(" ").slice(0, 2).join(" ")} · ${dbMs} ms` },
    {
      label: ar ? "البريد الإلكتروني" : "Email delivery",
      ok: emailOn,
      detail: emailOn ? `Resend · ${env.EMAIL_FROM}` : ar ? "غير مهيأ — الإشعارات تُحفظ داخل المنصة فقط (RESEND_API_KEY / EMAIL_FROM)" : "Not configured — notifications stay in-app only (RESEND_API_KEY / EMAIL_FROM)",
    },
    {
      label: ar ? "تخزين الملفات" : "File storage",
      ok: storage === "local" ? null : true,
      detail: storage === "local" ? (ar ? `محلي (${env.STORAGE_DIR || "./storage"}) — مناسب لخادم واحد؛ يُنصح بتخزين S3 خاص للإنتاج` : `Local (${env.STORAGE_DIR || "./storage"}) — fine for one server; a private S3 bucket is recommended for production`) : `S3 · ${env.S3_BUCKET ?? "—"}${env.S3_ENDPOINT ? ` · ${URL.canParse(env.S3_ENDPOINT) ? new URL(env.S3_ENDPOINT).host : env.S3_ENDPOINT}` : ""}`,
    },
    { label: ar ? "رابط الموقع" : "Site URL", ok: appUrl.startsWith("https://") ? true : appUrl ? null : false, detail: appUrl || (ar ? "APP_URL غير محدد" : "APP_URL not set") },
    { label: ar ? "اعتماد مخططات القص" : "Dieline validation", ok: validated === templates ? true : validated > 0 ? null : false, detail: `${validated} / ${templates} ${ar ? "قالب مفعّل" : "enabled templates"}` },
    { label: ar ? "اعتماد الخامات من المصنع" : "Factory-approved materials", ok: approvedMaterials === materials ? true : approvedMaterials > 0 ? null : false, detail: `${approvedMaterials} / ${materials}` },
    { label: ar ? "بيانات التواصل في الموقع" : "Contact details on the site", ok: contactFilled === 3 ? true : contactFilled ? null : false, detail: `${contactFilled} / 3 ${ar ? "(الهاتف، البريد، العنوان)" : "(phone, email, address)"}` },
    { label: ar ? "التسعير الآلي" : "Automatic pricing", ok: null, detail: pricingActive ? ar ? "مفعّل — قائمة أسعار المصنع" : "On — factory price list" : ar ? "غير مفعّل — التسعير يدوي من فريق المبيعات؛ يُفعَّل من صفحة «التسعير التلقائي»" : "Off — sales price manually; enable it on the Automatic pricing page" },
  ];

  const counts: [string, string | number][] = [
    [ar ? "العملاء" : "Customers", customers],
    [ar ? "فريق المصنع النشط" : "Active staff", staff],
    [ar ? "قوالب مفعّلة" : "Enabled templates", templates],
    [ar ? "خامات متاحة" : "Available materials", materials],
    [ar ? "تصاميم" : "Designs", designs],
    [ar ? "طلبات أسعار" : "Quotation requests", rfqs],
    [ar ? "ملفات مرفوعة" : "Uploaded files", `${assets._count} · ${mb(assets._sum.sizeBytes ?? 0)}`],
    [ar ? "بريد مُرسل / متخطى / فاشل" : "Email sent / skipped / failed", `${emailCount("SENT")} / ${emailCount("SKIPPED")} / ${emailCount("FAILED")}`],
  ];

  const icon = (ok: boolean | null) => (ok === true ? { tone: "ok" as const, text: ar ? "جاهز" : "Ready" } : ok === false ? { tone: "danger" as const, text: ar ? "مطلوب" : "Required" } : { tone: "warn" as const, text: ar ? "مراجعة" : "Review" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{ar ? "حالة النظام" : "System status"}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          {ar
            ? "قراءة مباشرة لإعدادات الخادم والبيانات. البنود باللون الأحمر أو البرتقالي يجب مراجعتها قبل التشغيل الفعلي للإنتاج."
            : "A live read of server settings and data. Items in red or orange must be reviewed before going into production."}
        </p>
      </div>

      <Card className="divide-y divide-navy/8">
        {checks.map((c) => {
          const s = icon(c.ok);
          return (
            <div key={c.label} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <Badge tone={s.tone}>{s.text}</Badge>
              <span className="w-56 text-sm font-medium text-navy">{c.label}</span>
              <span className="min-w-0 flex-1 text-sm break-words text-ink-500">{c.detail}</span>
            </div>
          );
        })}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map(([k, v]) => (
          <div key={k} className="rounded-[var(--radius-card)] border border-navy/8 bg-white p-5">
            <p className="text-xs text-ink-500">{k}</p>
            <p className="num mt-2 text-xl font-bold text-navy">{v}</p>
          </div>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold text-navy">{ar ? "رسائل بريد لم تُرسل" : "Emails not delivered"}</h2>
        {failed.length === 0 ? (
          <p className="text-sm text-ink-500">{ar ? "لا يوجد." : "None."}</p>
        ) : (
          <ul className="divide-y divide-navy/8 text-sm">
            {failed.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Badge tone={n.status === "FAILED" ? "danger" : "neutral"}>{n.status}</Badge>
                <code className="text-xs text-ink-500">{n.type}</code>
                <span className="flex-1 truncate text-ink" dir="ltr">
                  {n.recipient ?? "—"}
                </span>
                {n.error && <span className="max-w-xs truncate text-xs text-danger">{n.error}</span>}
                <span className="num text-xs text-ink-500">{fmtDate(n.createdAt, locale, true)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-500">
        {ar ? "بيئة التشغيل" : "Runtime"}: Node {process.version} · {env.NODE_ENV}
      </p>
    </div>
  );
}
