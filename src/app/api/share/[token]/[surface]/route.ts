import { api } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { activeShare } from "@/lib/shares";
import { storage } from "@/lib/storage";

/** Public, by unguessable link: one watermarked face image of a shared design. */
export const GET = api<{ token: string; surface: string }>(
  async (_req, { params }) => {
    const { token, surface } = await params;
    const share = await activeShare(token);
    const key = share && Object.hasOwn(share.surfaces as object, surface) ? (share.surfaces as Record<string, string>)[surface] : null;
    if (!key) throw new HttpError(404, "not_found");
    const data = await storage.get(key);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(data.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  },
  { rate: { key: "share-view", limit: 600, windowMs: 10 * 60 * 1000 } },
);
