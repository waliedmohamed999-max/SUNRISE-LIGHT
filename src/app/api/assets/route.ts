import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { api, clientIp, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { inspectImage, UploadRejected } from "@/lib/upload-security";
import { audit } from "@/lib/audit";
import { watermarkPng } from "@/lib/watermark";

const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024;
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg" } as const;

export const POST = api(
  async (req) => {
    const user = await requireUser();
    const len = Number(req.headers.get("content-length") || 0);
    // a body without a declared size could not be refused before it is read into memory
    if (!len) throw new HttpError(411, "length_required");
    if (len > MAX_BYTES + 64 * 1024) throw new HttpError(413, "too_large");

    const form = await req.formData();
    const file = form.get("file");
    const kind = form.get("kind") === "PREVIEW" ? "PREVIEW" : "LOGO";
    if (!(file instanceof File)) throw new HttpError(400, "file_missing");

    let inspected;
    try {
      inspected = inspectImage(Buffer.from(await file.arrayBuffer()), MAX_BYTES);
    } catch (e) {
      if (e instanceof UploadRejected) throw new HttpError(422, e.code);
      throw e;
    }
    if (kind === "PREVIEW" && inspected.mime !== "image/png") throw new HttpError(422, "preview_must_be_png");

    // saved previews of a design always carry the logo watermark; clean output exists only in the dashboard
    const stored = kind === "PREVIEW" ? await watermarkPng(inspected.data) : inspected.data;
    const storageKey = `${user.id}/${kind.toLowerCase()}/${nanoid(21)}.${EXT[inspected.mime]}`;
    await storage.put(storageKey, stored);
    const asset = await db.uploadedAsset.create({
      data: {
        ownerId: user.id,
        kind,
        mime: inspected.mime,
        sizeBytes: stored.length,
        width: inspected.width,
        height: inspected.height,
        sha256: createHash("sha256").update(stored).digest("hex"),
        storageKey,
        originalName: (file.name || "upload").replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 120),
      },
      select: { id: true, mime: true, width: true, height: true, originalName: true },
    });
    if (kind === "LOGO") await audit({ actorId: user.id, action: "asset.upload", entity: "asset", entityId: asset.id, meta: { mime: asset.mime }, ip: clientIp(req) });
    return ok({ asset }, 201);
  },
  { rate: { key: "upload", limit: 60, windowMs: 10 * 60 * 1000 } },
);

export const GET = api(async (req) => {
  const user = await requireUser();
  const kind = req.nextUrl.searchParams.get("kind") === "PREVIEW" ? "PREVIEW" : "LOGO";
  const assets = await db.uploadedAsset.findMany({
    where: { ownerId: user.id, kind },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, mime: true, width: true, height: true, originalName: true },
  });
  return ok({ assets });
});
