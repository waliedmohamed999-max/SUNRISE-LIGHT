import "server-only";
import type { Prisma, QuotationStatus } from "@prisma/client";
import { HttpError } from "./auth";
import { notify } from "./notifications";
import { getDict } from "@/i18n/dictionaries";

type Tx = Prisma.TransactionClient;

/** Atomically allocate the next sequential number for a yearly series, e.g. SL-RFQ-2026-00042. */
export async function nextNumber(tx: Tx, series: "RFQ" | "Q") {
  const year = new Date().getFullYear();
  const key = `${series}-${year}`;
  const row = await tx.counter.upsert({ where: { key }, create: { key, value: 1 }, update: { value: { increment: 1 } } });
  return `SL-${series}-${year}-${String(row.value).padStart(5, "0")}`;
}

export async function transition(tx: Tx, args: { requestId: string; from: QuotationStatus; to: QuotationStatus; allowed: Record<QuotationStatus, QuotationStatus[]>; actorId: string; note?: string }) {
  if (!args.allowed[args.from].includes(args.to)) throw new HttpError(409, "invalid_transition", `${args.from} → ${args.to}`);
  // Optimistic concurrency: only move if nobody changed the status meanwhile
  const res = await tx.quotationRequest.updateMany({ where: { id: args.requestId, status: args.from }, data: { status: args.to } });
  if (res.count !== 1) throw new HttpError(409, "status_changed");
  await tx.quotationStatusHistory.create({ data: { requestId: args.requestId, fromStatus: args.from, toStatus: args.to, changedById: args.actorId, note: args.note } });
}

export async function notifyCustomerStatus(req: { id: string; rfqNumber: string; customerId: string; email: string }, status: QuotationStatus, locale: "ar" | "en") {
  const t = getDict(locale);
  const title = locale === "ar" ? `تحديث طلب ${req.rfqNumber}` : `Update on ${req.rfqNumber}`;
  const body = locale === "ar" ? `حالة طلبك الآن: ${t.status[status]}` : `Your request status is now: ${t.status[status]}`;
  await notify({ type: "rfq.status", title, body, link: `/${locale}/account/quotes/${req.id}`, userIds: [req.customerId], emails: [req.email] });
}
