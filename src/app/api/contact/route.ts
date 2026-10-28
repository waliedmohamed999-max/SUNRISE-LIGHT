import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { notify, staffRecipients } from "@/lib/notifications";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export const POST = api(
  async (req) => {
    const b = await parseJson(req, schema);
    const m = await db.contactMessage.create({ data: { name: b.name, email: b.email, phone: b.phone || null, message: b.message } });
    await notify({
      type: "contact.message",
      title: `Contact: ${b.name}`,
      body: b.message.slice(0, 300),
      link: "/ar/admin/messages",
      userIds: await staffRecipients(["SUPER_ADMIN", "FACTORY_MANAGER", "SALES"]),
      emails: process.env.SALES_TEAM_EMAIL ? [process.env.SALES_TEAM_EMAIL] : [],
    });
    return ok({ id: m.id }, 201);
  },
  { rate: { key: "contact", limit: 5, windowMs: 60 * 60 * 1000 } },
);
