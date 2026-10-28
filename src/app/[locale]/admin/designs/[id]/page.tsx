import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { Locale } from "@/i18n/config";
import { designDocumentSchema, COATING_LABELS, FINISH_LABELS, type Finish } from "@/design/document";

const FACE_LABELS: Record<string, { ar: string; en: string }> = {
  front: { ar: "الأمامي", en: "Front" },
  back: { ar: "الخلفي", en: "Back" },
  left: { ar: "الأيسر", en: "Left" },
  right: { ar: "الأيمن", en: "Right" },
  top: { ar: "العلوي", en: "Top" },
  bottom: { ar: "السفلي", en: "Bottom" },
};
import { Badge, Card } from "@/components/ui";
import { fmtDate, StatusBadge } from "@/components/site/StatusBadge";
import { AdminDesignViewer, JsonDownload } from "@/components/admin/AdminQuotePanel";

export default async function AdminDesign({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const ar = locale === "ar";
  const user = (await getCurrentUser())!;
  if (!can(user.role, "customer.view")) notFound();
  const d = await db.designProject.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, phone: true } },
      template: { select: { code: true, engineKey: true, nameAr: true, nameEn: true } },
      templateVersion: { select: { version: true, dielineValidated: true } },
      versions: { orderBy: { versionNo: "desc" }, take: 20, select: { id: true, versionNo: true, note: true, createdAt: true } },
      quotationItems: { select: { request: { select: { id: true, rfqNumber: true, status: true, createdAt: true } } } },
    },
  });
  if (!d || d.deletedAt) notFound();
  const parsed = designDocumentSchema.safeParse(d.document);
  const doc = parsed.success ? parsed.data : null;
  const [material, finishings] = await Promise.all([
    doc?.materialCode ? db.materialType.findUnique({ where: { code: doc.materialCode }, select: { nameAr: true, nameEn: true, colorHex: true } }) : null,
    doc?.finishingCodes.length ? db.finishingOption.findMany({ where: { code: { in: doc.finishingCodes } }, select: { nameAr: true, nameEn: true } }) : [],
  ]);
  const faces = doc ? Object.entries(doc.surfaces).filter(([, s]) => s.background || s.fill || s.elements.length) : [];
  const elementFinishes = doc ? [...new Set(Object.values(doc.surfaces).flatMap((s) => s.elements.map((e) => e.finish).filter((f): f is Finish => !!f && f !== "none")))] : [];

  const rows: [string, React.ReactNode][] = doc
    ? [
        [ar ? "المنتج" : "Product", `${ar ? d.template.nameAr : d.template.nameEn} (v${d.templateVersion.version})`],
        [ar ? "المقاسات" : "Dimensions", <span key="d" className="num">{`${doc.dimensions.length} × ${doc.dimensions.width} × ${doc.dimensions.height} mm`}</span>],
        [ar ? "الخامة" : "Material", material ? (ar ? material.nameAr : material.nameEn) : "—"],
        [ar ? "الكمية المتوقعة" : "Expected quantity", doc.quantity ? <span key="q" className="num">{doc.quantity.toLocaleString("en")}</span> : "—"],
        [ar ? "التشطيب" : "Finishing", finishings.map((f) => (ar ? f.nameAr : f.nameEn)).join("، ") || "—"],
        [ar ? "تشطيبات العناصر" : "Element finishes", elementFinishes.map((f) => FINISH_LABELS[f][locale]).join("، ") || "—"],
        [ar ? "أوجه مصممة" : "Designed faces", <span key="f" className="num">{faces.length}</span>],
        [ar ? "المخطط" : "Dieline", d.templateVersion.dielineValidated ? (ar ? "معتمد هندسيًا" : "Validated") : ar ? "غير معتمد بعد" : "Not validated yet"],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/${locale}/admin/designs`} className="text-xs text-ink-500 hover:text-navy">
            {ar ? "→ تصاميم العملاء" : "← Customer designs"}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-navy">{d.name}</h1>
          <p className="num mt-1 text-xs text-ink-500">
            {ar ? "آخر تعديل" : "Updated"} {fmtDate(d.updatedAt, locale, true)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={d.status === "SUBMITTED" ? "ok" : "neutral"}>{d.status === "SUBMITTED" ? (ar ? "مُرسل في طلب سعر" : "Submitted") : ar ? "مسودة" : "Draft"}</Badge>
          {doc && <JsonDownload doc={doc} name={d.name} label={ar ? "ملف التصميم JSON" : "Design JSON"} />}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          {doc ? (
            <AdminDesignViewer doc={doc} engineKey={d.template.engineKey} materialColor={material?.colorHex ?? "#C9A06B"} previewAssetId={d.thumbnailAssetId} />
          ) : (
            <p className="p-6 text-sm text-danger">{ar ? "ملف التصميم غير صالح ولا يمكن عرضه." : "The design document is invalid and cannot be displayed."}</p>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-navy">{ar ? "العميل" : "Customer"}</h2>
            <p className="text-sm font-medium text-ink">{d.owner.name}</p>
            <p className="text-xs text-ink-500" dir="ltr">
              {d.owner.email}
              {d.owner.phone ? ` · ${d.owner.phone}` : ""}
            </p>
            <Link href={`/${locale}/admin/customers/${d.owner.id}`} className="mt-2 inline-block text-xs font-medium text-sun hover:underline">
              {ar ? "ملف العميل" : "Customer profile"}
            </Link>
          </Card>
          <Card className="p-6">
            <h2 className="mb-3 font-semibold text-navy">{ar ? "المواصفات" : "Specification"}</h2>
            <dl className="divide-y divide-navy/8 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-end text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {faces.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {faces.map(([k, s]) => (
                  <li key={k} className="flex items-center gap-2 rounded-lg bg-paper px-2 py-1.5">
                    <span className="size-4 shrink-0 rounded border border-black/10" style={{ background: s.background ?? material?.colorHex ?? "#C9A06B" }} />
                    <span className="flex-1 truncate text-ink">{FACE_LABELS[k]?.[locale] ?? k}</span>
                    <span className="num text-ink-500">{s.elements.length}</span>
                    {s.coating && s.coating !== "none" && <span className="text-ink-500">{COATING_LABELS[s.coating][locale]}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 font-semibold text-navy">{ar ? "طلبات الأسعار المرتبطة" : "Linked quotation requests"}</h2>
          {d.quotationItems.length === 0 ? (
            <p className="text-sm text-ink-500">{ar ? "لم يُرسل هذا التصميم في طلب سعر بعد." : "This design has not been submitted yet."}</p>
          ) : (
            <ul className="divide-y divide-navy/8">
              {d.quotationItems.map(({ request: r }) => (
                <li key={r.id}>
                  <Link href={`/${locale}/admin/quotes/${r.id}`} className="flex items-center gap-3 py-2.5 hover:text-sun-600">
                    <span className="num flex-1 text-sm font-semibold text-navy">{r.rfqNumber}</span>
                    <span className="num text-xs text-ink-500">{fmtDate(r.createdAt, locale)}</span>
                    <StatusBadge status={r.status} locale={locale} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="mb-3 font-semibold text-navy">{ar ? "الإصدارات المحفوظة" : "Saved versions"}</h2>
          {d.versions.length === 0 ? (
            <p className="text-sm text-ink-500">—</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.versions.map((v) => (
                <li key={v.id} className="flex justify-between gap-4">
                  <span className="text-ink">
                    v{v.versionNo} {v.note && <span className="text-ink-500">— {v.note}</span>}
                  </span>
                  <span className="num text-xs text-ink-500">{fmtDate(v.createdAt, locale, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
