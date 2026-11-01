import { randomBytes } from "node:crypto";
import { api, clientIp, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { HttpError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadDesignFor } from "@/lib/designs";
import { can } from "@/lib/rbac";
import { shareExpiry } from "@/lib/shares";
import { storage } from "@/lib/storage";
import { inspectImage, UploadRejected } from "@/lib/upload-security";
import { watermarkPng } from "@/lib/watermark";
import { designDocumentSchema } from "@/design/document";
import { getEngine } from "@/packaging/engine";

const MAX_FACE_BYTES = 10 * 1024 * 1024;
const MAX_BODY_BYTES = 70 * 1024 * 1024;

const storedKeys = (surfaces: unknown) => Object.values((surfaces ?? {}) as Record<string, string>);

async function removeFiles(keys: string[]) {
  await Promise.all(keys.map((k) => storage.remove(k).catch(() => undefined)));
}

/**
 * Create or refresh the design's public 3D link. The browser sends each face as a flat PNG; the server burns the
 * watermark in, and only those images are ever served to the link's visitors (never the design document or logo files).
 */
export const POST = api<{ id: string }>(
  async (req, { params }) => {
    const { id } = await params;
    const user = await requireUser();
    const design = await loadDesignFor(user, id, "write");
    const len = Number(req.headers.get("content-length") || 0);
    // a body without a declared size could not be refused before it is read into memory
    if (!len) throw new HttpError(411, "length_required");
    if (len > MAX_BODY_BYTES) throw new HttpError(413, "too_large");

    const doc = designDocumentSchema.parse(design.document);
    const template = await db.packagingTemplate.findUniqueOrThrow({ where: { id: design.templateId }, select: { engineKey: true, nameAr: true, nameEn: true } });
    const material = doc.materialCode ? await db.materialType.findUnique({ where: { code: doc.materialCode }, select: { colorHex: true } }) : null;
    const form = await req.formData();

    const previous = await db.designShare.findUnique({ where: { projectId: design.id } });
    const prefix = `shares/${design.id}/${randomBytes(8).toString("hex")}`;
    const surfaces: Record<string, string> = {};
    for (const { key } of getEngine(template.engineKey).surfaces(doc.dimensions)) {
      const file = form.get(key);
      if (!(file instanceof File)) throw new HttpError(400, "face_missing");
      let inspected;
      try {
        inspected = inspectImage(Buffer.from(await file.arrayBuffer()), MAX_FACE_BYTES);
      } catch (e) {
        if (e instanceof UploadRejected) throw new HttpError(422, e.code);
        throw e;
      }
      if (inspected.mime !== "image/png") throw new HttpError(422, "face_must_be_png");
      const storageKey = `${prefix}/${key}.png`;
      await storage.put(storageKey, await watermarkPng(inspected.data));
      surfaces[key] = storageKey;
    }

    const spec = {
      name: design.name,
      engineKey: template.engineKey,
      nameAr: template.nameAr,
      nameEn: template.nameEn,
      dimensions: doc.dimensions,
      materialColor: material?.colorHex ?? "#FBF9F5",
      insideColor: doc.interior ?? null,
      addons: doc.finishingCodes,
    };
    // an open link keeps its address when it is refreshed; a stopped or expired one is never revived
    const token = previous && !previous.revokedAt && previous.expiresAt > new Date() ? previous.token : randomBytes(24).toString("base64url");
    const expiresAt = shareExpiry();
    await db.designShare.upsert({
      where: { projectId: design.id },
      create: { projectId: design.id, token, createdById: user.id, spec, surfaces, expiresAt },
      update: { token, spec, surfaces, expiresAt, revokedAt: null, createdById: user.id },
    });
    if (previous) await removeFiles(storedKeys(previous.surfaces));
    await audit({ actorId: user.id, action: "design.share", entity: "design_project", entityId: design.id, ip: clientIp(req) });
    return ok({ token, expiresAt });
  },
  { rate: { key: "design-share", limit: 30, windowMs: 10 * 60 * 1000 } },
);

/** Stop the link immediately and remove its images. */
export const DELETE = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  // the owner, or the factory staff who oversee customer designs
  const design = await loadDesignFor(user, id, can(user.role, "customer.view") ? "read" : "write");
  const share = await db.designShare.findUnique({ where: { projectId: design.id } });
  if (share && !share.revokedAt) {
    await db.designShare.update({ where: { id: share.id }, data: { revokedAt: new Date(), surfaces: {} } });
    await removeFiles(storedKeys(share.surfaces));
    await audit({ actorId: user.id, action: "design.unshare", entity: "design_project", entityId: design.id, ip: clientIp(req) });
  }
  return ok({ ok: true });
});
