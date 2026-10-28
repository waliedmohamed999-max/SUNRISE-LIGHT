import { api, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadDesignFor } from "@/lib/designs";

export const POST = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const src = await loadDesignFor(user, id, "write");
  const suffix = req.headers.get("accept-language")?.startsWith("ar") ? " (نسخة)" : " (copy)";
  const copy = await db.$transaction(async (tx) => {
    const d = await tx.designProject.create({
      data: {
        ownerId: user.id,
        name: `${src.name}${suffix}`.slice(0, 120),
        templateId: src.templateId,
        templateVersionId: src.templateVersionId,
        document: src.document ?? {},
        thumbnailAssetId: src.thumbnailAssetId,
      },
    });
    await tx.designVersion.create({ data: { projectId: d.id, versionNo: 1, document: src.document ?? {}, note: `duplicated from ${src.id}` } });
    return d;
  });
  return ok({ design: { id: copy.id } }, 201);
});
