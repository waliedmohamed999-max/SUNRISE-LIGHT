import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient | typeof db;

export async function audit(
  entry: { actorId?: string | null; action: string; entity: string; entityId?: string | null; meta?: Prisma.InputJsonValue; ip?: string },
  tx: Tx = db,
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      meta: entry.meta ?? {},
      ip: entry.ip,
    },
  });
}
