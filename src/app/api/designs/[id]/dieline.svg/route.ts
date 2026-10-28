import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadDesignFor } from "@/lib/designs";
import { designDocumentSchema } from "@/design/document";
import { getEngine } from "@/packaging/engine";
import { dielineToSvg } from "@/packaging/svg";

/** Server-generated SVG dieline preview for a design (or a specific frozen version via ?version=). */
export const GET = api<{ id: string }>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser();
  const design = await loadDesignFor(user, id, "read");
  const versionId = req.nextUrl.searchParams.get("version");
  const raw = versionId ? (await db.designVersion.findFirstOrThrow({ where: { id: versionId, projectId: design.id } })).document : design.document;
  const doc = designDocumentSchema.parse(raw);
  const template = await db.packagingTemplate.findUniqueOrThrow({ where: { code: doc.templateCode }, include: { versions: true } });
  const version = template.versions.find((v) => v.version === doc.templateVersion);
  const svg = dielineToSvg(getEngine(template.engineKey).dieline(doc.dimensions), {
    title: `${template.nameEn} ${doc.dimensions.length}x${doc.dimensions.width}x${doc.dimensions.height} mm`,
    locale: req.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en",
    validated: version?.dielineValidated ?? false,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="dieline-${template.code}-${doc.dimensions.length}x${doc.dimensions.width}x${doc.dimensions.height}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
});
