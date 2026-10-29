"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { DesignDocument } from "@/design/document";
import { useAssetImages, useFontsReady } from "@/design/hooks";
import { renderIsoThumbnail, renderSurfaceCanvases } from "@/design/render";
import { getEngine } from "@/packaging/engine";
import type { SurfaceKey } from "@/packaging/types";
import { Spinner } from "@/components/ui";

const BoxViewer = dynamic(() => import("@/components/three/BoxViewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-sun">
      <Spinner />
    </div>
  ),
});

export interface DesignPreviewHandle {
  /** Isometric PNG of the design, rendered without WebGL. */
  isoCanvas: () => HTMLCanvasElement | null;
}

/** Read-only 3D preview of a stored design document. */
export const DesignPreview = forwardRef<DesignPreviewHandle, { doc: DesignDocument; engineKey: string; materialColor: string; textured?: boolean; className?: string; fallback?: React.ReactNode }>(
  function DesignPreview({ doc, engineKey, materialColor, textured = true, className, fallback }, ref) {
    const engine = getEngine(engineKey);
    const specs = useMemo(() => engine.surfaces(doc.dimensions), [engine, doc.dimensions]);
    const { images, version } = useAssetImages(doc);
    const fonts = useFontsReady();
    const canvases = useRef<Record<SurfaceKey, HTMLCanvasElement> | null>(null);
    const [tex, setTex] = useState(0);

    useEffect(() => {
      canvases.current = renderSurfaceCanvases(doc, specs, { materialColor, textured, images, maxPx: 1024 }, canvases.current ?? undefined);
      setTex((v) => v + 1);
    }, [doc, specs, materialColor, textured, images, version, fonts]);

    useImperativeHandle(ref, () => ({
      isoCanvas: () => (canvases.current ? renderIsoThumbnail(doc.dimensions, canvases.current, { width: 960, height: 720, style: engine.boxStyle }) : null),
    }));

    return (
      <div className={className}>
        <BoxViewer className="absolute inset-0" dims={doc.dimensions} boxStyle={engine.boxStyle} canvases={canvases.current} textureVersion={tex} materialColor={materialColor} autoRotate fallback={fallback} />
      </div>
    );
  },
);
