import { z } from "zod";

export const materialSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
  nameAr: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  kind: z.enum(["KRAFT", "WHITE", "CORRUGATED", "DUPLEX", "OTHER"]),
  thickness: z.string().trim().max(120),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  printableSides: z.string().trim().max(60),
  limitationsAr: z.string().trim().max(1000),
  limitationsEn: z.string().trim().max(1000),
  isAvailable: z.boolean(),
  factoryApproved: z.boolean(),
  finishingIds: z.array(z.string().max(40)),
});
