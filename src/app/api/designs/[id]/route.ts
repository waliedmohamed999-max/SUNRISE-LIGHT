import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { HttpError, requireUser } from "@/lib/auth";
import { assertThumbnailOwned, loadDesignFor, validateDesignForOwner } from "@/lib/designs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  document: z.unknown().optional(),
  thumbnailAssetId: z.string().max(40).nullish(),
  /** true = also store an immutable version snapshot (explicit "Save") */
  snapshot: z.boolean().optional(),
});

export const GET = api<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const design = await loadDesignFor(user, id, "read");
  return ok({ design: { id: design.id, name: design.name, status: design.status, document: design.document, updatedAt: design.updatedAt } });
});

export const PATCH = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const design = await loadDesignFor(user, id, "write");
  const body = await parseJson(req, patchSchema);

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  let doc = null;
  if (body.document !== undefined) {
    const v = await validateDesignForOwner(body.document, user.id);
    doc = v.doc;
    data.document = v.doc;
    data.templateId = v.template.id;
    data.templateVersionId = v.version.id;
  }
  if (body.thumbnailAssetId) data.thumbnailAssetId = await assertThumbnailOwned(body.thumbnailAssetId, user.id);
  if (!Object.keys(data).length) throw new HttpError(400, "nothing_to_update");

  await db.$transaction(async (tx) => {
    await tx.designProject.update({ where: { id: design.id }, data });
    if (body.snapshot && doc) {
      const last = await tx.designVersion.findFirst({ where: { projectId: design.id }, orderBy: { versionNo: "desc" }, select: { versionNo: true } });
      await tx.designVersion.create({ data: { projectId: design.id, versionNo: (last?.versionNo ?? 0) + 1, document: doc, note: "save" } });
    }
  });
  return ok({ ok: true });
});

export const DELETE = api<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const design = await loadDesignFor(user, id, "write");
  // Soft delete: designs referenced by quotation requests must remain available to the factory.
  await db.designProject.update({ where: { id: design.id }, data: { deletedAt: new Date() } });
  return ok({ ok: true });
});
