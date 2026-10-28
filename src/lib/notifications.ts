import "server-only";
import { db } from "./db";

/**
 * Notifications are always recorded in-app. Email is sent only when a provider
 * is configured (RESEND_API_KEY + EMAIL_FROM); otherwise the email record is
 * stored with status SKIPPED so nothing silently pretends to have been sent.
 */
const emailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
}

interface NotifyArgs {
  type: string;
  title: string;
  body: string;
  link?: string;
  userIds?: string[];
  emails?: string[];
}

export async function notify({ type, title, body, link, userIds = [], emails = [] }: NotifyArgs) {
  if (userIds.length) {
    await db.notification.createMany({
      data: userIds.map((userId) => ({ userId, channel: "IN_APP" as const, type, title, body, link, status: "SENT" as const })),
    });
  }
  for (const recipient of new Set(emails.filter(Boolean))) {
    const record = await db.notification.create({
      data: { recipient, channel: "EMAIL", type, title, body, link, status: emailConfigured() ? "PENDING" : "SKIPPED", error: emailConfigured() ? null : "email provider not configured" },
    });
    if (!emailConfigured()) continue;
    try {
      const url = link ? `${process.env.APP_URL ?? ""}${link}` : "";
      await sendEmail(recipient, title, url ? `${body}\n\n${url}` : body);
      await db.notification.update({ where: { id: record.id }, data: { status: "SENT" } });
    } catch (e) {
      await db.notification.update({ where: { id: record.id }, data: { status: "FAILED", error: String(e).slice(0, 500) } });
    }
  }
}

export async function staffRecipients(roles: ("SUPER_ADMIN" | "FACTORY_MANAGER" | "SALES" | "TECH_REVIEWER")[]) {
  const users = await db.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
  return users.map((u) => u.id);
}
