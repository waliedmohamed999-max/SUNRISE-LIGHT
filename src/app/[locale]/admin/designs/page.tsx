import Link from "next/link";
import { notFound } from "next/navigation";
import type { DesignStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { Badge, buttonClass, EmptyState, inputClass } from "@/components/ui";
import { fmtDate } from "@/components/site/StatusBadge";

const PAGE = 24;

export default async function AdminDesigns({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string; template?: string; status?: string; page?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "customer.view")) notFound();

  const q = sp.q?.trim().slice(0, 100);
  const status = sp.status === "DRAFT" || sp.status === "SUBMITTED" ? (sp.status as DesignStatus) : undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.DesignProjectWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(sp.template && { template: { code: sp.template } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { owner: { name: { contains: q, mode: "insensitive" } } },
        { owner: { email: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };
  const [rows, total, templates] = await Promise.all([
    db.designProject.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        thumbnailAssetId: true,
        owner: { select: { id: true, name: true, email: true } },
        template: { select: { nameAr: true, nameEn: true } },
        _count: { select: { versions: true, quotationItems: true } },
      },
    }),
    db.designProject.count({ where }),
    db.packagingTemplate.findMany({ where: { designs: { some: { deletedAt: null } } }, orderBy: { sortOrder: "asc" }, select: { code: true, nameAr: true, nameEn: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => `?${new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{ar ? "تصاميم العملاء" : "Customer designs"}</h1>
        <p className="mt-1 text-sm text-ink-500">{ar ? "كل التصاميم المحفوظة في الاستوديو — للاطلاع والمراجعة قبل طلب السعر." : "Every design saved in the studio — for review before a quotation request."}</p>
      </div>
      <form className="grid gap-2 rounded-[var(--radius-card)] border border-navy/8 bg-white p-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] md:items-center">
        <input name="q" defaultValue={q} placeholder={ar ? "بحث: اسم التصميم، العميل، البريد…" : "Search: design, customer, email…"} className={inputClass} />
        <select name="template" defaultValue={sp.template ?? ""} className={inputClass}>
          <option value="">{ar ? "كل المنتجات" : "All products"}</option>
          {templates.map((t) => (
            <option key={t.code} value={t.code}>
              {ar ? t.nameAr : t.nameEn}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className={inputClass}>
          <option value="">{ar ? "كل الحالات" : "All statuses"}</option>
          <option value="DRAFT">{ar ? "مسودة" : "Draft"}</option>
          <option value="SUBMITTED">{ar ? "مُرسل في طلب سعر" : "Submitted"}</option>
        </select>
        <button className={buttonClass("primary", "md")}>{ar ? "تصفية" : "Filter"}</button>
      </form>
      <p className="num text-xs text-ink-500">
        {total} {ar ? "تصميم" : "designs"}
      </p>
      {rows.length === 0 ? (
        <EmptyState title={ar ? "لا توجد تصاميم مطابقة" : "No matching designs"} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((d) => (
            <li key={d.id} className="overflow-hidden rounded-[var(--radius-card)] border border-navy/8 bg-white transition hover:shadow-[var(--shadow-card)]">
              <Link href={`/${locale}/admin/designs/${d.id}`} className="block">
                <div className="aspect-[4/3] bg-paper">
                  {d.thumbnailAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/assets/${d.thumbnailAssetId}`} alt="" className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-ink-500">{ar ? "بدون معاينة" : "No preview"}</div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-navy">{d.name}</p>
                    <Badge tone={d.status === "SUBMITTED" ? "ok" : "neutral"}>{d.status === "SUBMITTED" ? (ar ? "مُرسل" : "Submitted") : ar ? "مسودة" : "Draft"}</Badge>
                  </div>
                  <p className="truncate text-xs text-ink-500">{ar ? d.template.nameAr : d.template.nameEn}</p>
                  <p className="truncate text-xs text-ink">{d.owner.name}</p>
                  <p className="num flex justify-between text-[11px] text-ink-500">
                    <span>{fmtDate(d.updatedAt, locale)}</span>
                    <span>
                      v{d._count.versions} · {d._count.quotationItems} RFQ
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={qs(page - 1)} className={buttonClass("outline", "sm")}>
              {ar ? "السابق" : "Previous"}
            </Link>
          )}
          <span className="num text-ink-500">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={qs(page + 1)} className={buttonClass("outline", "sm")}>
              {ar ? "التالي" : "Next"}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
