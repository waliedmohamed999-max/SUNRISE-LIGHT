import type { Prisma, QuotationStatus } from "@prisma/client";

export const RFQ_STATUSES: QuotationStatus[] = ["NEW", "TECHNICAL_REVIEW", "PRICING", "QUOTE_SENT", "REVISION_REQUESTED", "APPROVED", "REJECTED", "CANCELLED"];

export interface RfqFilterParams {
  q?: string;
  status?: string;
  assignee?: string;
  mine?: string;
}

/** Shared by the admin quotation list and its CSV export. */
export function rfqWhere(sp: RfqFilterParams, userId: string) {
  const status = RFQ_STATUSES.includes(sp.status as QuotationStatus) ? (sp.status as QuotationStatus) : undefined;
  const q = sp.q?.trim().slice(0, 100);
  const where: Prisma.QuotationRequestWhereInput = {
    ...(status && { status }),
    ...(sp.mine && { assignedToId: userId }),
    ...(sp.assignee === "none" ? { assignedToId: null } : sp.assignee ? { assignedToId: sp.assignee } : {}),
    ...(q && {
      OR: [
        { rfqNumber: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    }),
  };
  return { where, status, q };
}

/** CSV with a UTF-8 BOM (Excel opens Arabic correctly); cells that could run as formulas are neutralised. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    // phone numbers and signed numbers ("+966…", "-12") are data, not formulas
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-][\d\s]+$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
