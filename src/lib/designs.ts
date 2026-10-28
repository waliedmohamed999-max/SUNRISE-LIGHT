import "server-only";
import { db } from "./db";
import { HttpError, type SessionUser } from "./auth";
import { can } from "./rbac";
import { designDocumentSchema, referencedAssetIds, type DesignDocument } from "@/design/document";
import { getEngine, hasErrors, validateDimensions } from "@/packaging/engine";

/**
 * Server-side validation of a design document: schema, template/version,
 * manufacturing limits, material compatibility and asset ownership.
 */
export async function validateDesignForOwner(raw: unknown, ownerId: string, opts: { requireEnabled?: boolean } = {}) {
  const doc: DesignDocument = designDocumentSchema.parse(raw);
  const template = await db.packagingTemplate.findUnique({
    where: { code: doc.templateCode },
    include: { versions: true, materialRules: { include: { material: true } } },
  });
  if (!template || (opts.requireEnabled && !template.isEnabled)) throw new HttpError(422, "template_unavailable");
  const version = template.versions.find((v) => v.version === doc.templateVersion);
  if (!version) throw new HttpError(422, "template_version_unknown");

  const issues = validateDimensions(getEngine(template.engineKey), doc.dimensions, version);
  if (hasErrors(issues)) throw new HttpError(422, "invalid_dimensions", issues.map((i) => i.message.en).join("; "));

  if (doc.materialCode && !template.materialRules.some((r) => r.material.code === doc.materialCode)) {
    throw new HttpError(422, "material_incompatible");
  }

  const assetIds = referencedAssetIds(doc);
  if (assetIds.length) {
    const owned = await db.uploadedAsset.count({ where: { id: { in: assetIds }, ownerId } });
    if (owned !== assetIds.length) throw new HttpError(422, "asset_not_owned");
  }
  return { doc, template, version };
}

/** Load a design the user may access: the owner, or staff with quotation access. */
export async function loadDesignFor(user: SessionUser, id: string, mode: "read" | "write") {
  const design = await db.designProject.findFirst({ where: { id, deletedAt: null } });
  if (!design) throw new HttpError(404, "not_found");
  const isOwner = design.ownerId === user.id;
  if (mode === "write" && !isOwner) throw new HttpError(404, "not_found");
  if (mode === "read" && !isOwner && !can(user.role, "rfq.view")) throw new HttpError(404, "not_found");
  return design;
}

export async function assertThumbnailOwned(assetId: string | null | undefined, ownerId: string) {
  if (!assetId) return null;
  const a = await db.uploadedAsset.findFirst({ where: { id: assetId, ownerId, kind: "PREVIEW" } });
  if (!a) throw new HttpError(422, "thumbnail_invalid");
  return a.id;
}
