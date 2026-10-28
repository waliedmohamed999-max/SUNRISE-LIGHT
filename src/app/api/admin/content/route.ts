import { z } from "zod";
import { api, clientIp, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const contentSchema = z.object({
  type: z.literal("content"),
  entries: z.array(z.object({ key: z.string().regex(/^[a-z0-9._-]{2,80}$/), valueAr: z.string().max(5000), valueEn: z.string().max(5000) })).max(100),
});
const faqSchema = z.object({
  type: z.literal("faq"),
  id: z.string().max(40).optional(),
  delete: z.boolean().optional(),
  questionAr: z.string().trim().max(500).default(""),
  questionEn: z.string().trim().max(500).default(""),
  answerAr: z.string().trim().max(4000).default(""),
  answerEn: z.string().trim().max(4000).default(""),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
const portfolioSchema = z.object({
  type: z.literal("portfolio"),
  id: z.string().max(40).optional(),
  delete: z.boolean().optional(),
  titleAr: z.string().trim().max(200).default(""),
  titleEn: z.string().trim().max(200).default(""),
  descriptionAr: z.string().trim().max(2000).default(""),
  descriptionEn: z.string().trim().max(2000).default(""),
  imageUrl: z.string().trim().url().max(500).nullable().or(z.literal("")).default(null),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});
const schema = z.discriminatedUnion("type", [contentSchema, faqSchema, portfolioSchema]);

/** Website content management: key/value copy, FAQ and portfolio entries. */
export const POST = api(async (req) => {
  const user = await requirePermission("content.manage");
  const body = await parseJson(req, schema);

  if (body.type === "content") {
    await db.$transaction(body.entries.map((e) => db.websiteContent.upsert({ where: { key: e.key }, update: { valueAr: e.valueAr, valueEn: e.valueEn }, create: e })));
  } else if (body.type === "faq") {
    const { type: _t, id, delete: del, ...data } = body;
    if (id && del) await db.faqItem.delete({ where: { id } });
    else if (id) await db.faqItem.update({ where: { id }, data });
    else await db.faqItem.create({ data });
  } else {
    const { type: _t, id, delete: del, ...rest } = body;
    const data = { ...rest, imageUrl: rest.imageUrl || null };
    if (id && del) await db.portfolioItem.delete({ where: { id } });
    else if (id) await db.portfolioItem.update({ where: { id }, data });
    else await db.portfolioItem.create({ data });
  }
  await audit({ actorId: user.id, action: `content.${body.type}`, entity: "website_content", ip: clientIp(req) });
  revalidatePath("/", "layout");
  return ok({ ok: true });
});
