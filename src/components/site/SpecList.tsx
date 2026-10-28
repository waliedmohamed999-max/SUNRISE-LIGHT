import type { QuotationItem } from "@prisma/client";
import { getDict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

interface Snapshot {
  template: { nameAr: string; nameEn: string; version: number; dielineValidated: boolean };
  dimensionsMm: { length: number; width: number; height: number };
  material: { nameAr: string; nameEn: string; factoryApproved: boolean } | null;
  printOption: string | null;
  finishing: { nameAr: string; nameEn: string }[];
  surfaces: Record<string, { background: string | null; elements: number }>;
}

/** Frozen specification of a quotation item, as submitted. */
export function SpecList({ item, locale }: { item: QuotationItem; locale: Locale }) {
  const t = getDict(locale);
  const s = item.specSnapshot as unknown as Snapshot;
  const ar = locale === "ar";
  const colors = Object.values(s.surfaces ?? {}).map((x) => x.background).filter(Boolean) as string[];
  const rows: [string, React.ReactNode][] = [
    [t.quote.packagingType, `${ar ? s.template.nameAr : s.template.nameEn} (v${s.template.version})`],
    [t.quote.dims, <span key="d" className="num">{`${s.dimensionsMm.length} × ${s.dimensionsMm.width} × ${s.dimensionsMm.height} mm`}</span>],
    [t.quote.material, s.material ? (ar ? s.material.nameAr : s.material.nameEn) : "—"],
    [t.quote.quantity, <span key="q" className="num">{item.quantity.toLocaleString("en")}</span>],
    [t.quote.printing, <span key="pr" dir="auto">{item.printingRequirements || "—"}</span>],
    [t.quote.finishing, s.finishing.map((f) => (ar ? f.nameAr : f.nameEn)).join("، ") || "—"],
  ];
  return (
    <dl className="divide-y divide-navy/8 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2">
          <dt className="text-ink-500">{k}</dt>
          <dd className="text-end font-medium text-navy">{v}</dd>
        </div>
      ))}
      {colors.length > 0 && (
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-ink-500">{t.quote.colors}</dt>
          <dd className="flex gap-1">
            {[...new Set(colors)].map((c) => (
              <span key={c} title={c} className="size-4 rounded border border-black/10" style={{ background: c }} />
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
