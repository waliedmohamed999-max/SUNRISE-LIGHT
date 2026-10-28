import { z } from "zod";
import { api, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertThumbnailOwned, validateDesignForOwner } from "@/lib/designs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  document: z.unknown(),
  thumbnailAssetId: z.string().max(40).nullish(),
});

export const GET = api(async () => {
  const user = await requireUser();
  const designs = await db.designProject.findMany({
    where: { ownerId: user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, updatedAt: true, thumbnailAssetId: true, template: { select: { nameAr: true, nameEn: true } } },
  });
  return ok({ designs });
});

export const POST = api(
  async (req) => {
    const user = await requireUser();
    const body = await parseJson(req, createSchema);
    const { doc, template, version } = await validateDesignForOwner(body.document, user.id, { requireEnabled: true });
    const thumbnailAssetId = await assertThumbnailOwned(body.thumbnailAssetId, user.id);
    const design = await db.$transaction(async (tx) => {
      const d = await tx.designProject.create({
        data: { ownerId: user.id, name: body.name, templateId: template.id, templateVersionId: version.id, document: doc, thumbnailAssetId },
      });
      await tx.designVersion.create({ data: { projectId: d.id, versionNo: 1, document: doc, note: "created" } });
      return d;
    });
    return ok({ design: { id: design.id } }, 201);
  },
  { rate: { key: "design-create", limit: 60, windowMs: 60 * 60 * 1000 } },
);
