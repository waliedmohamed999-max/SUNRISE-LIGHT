"use client";

import { createContext, useContext } from "react";
import type { CatalogFinishing, CatalogMaterial, CatalogTemplate } from "@/lib/catalog";
import type { DesignDocument, DesignElement } from "@/design/document";
import type { ImageMap } from "@/design/render";
import type { Dimensions, PackagingEngine, SurfaceKey, SurfaceSpec, ValidationIssue } from "@/packaging/types";
import type { Dict } from "@/i18n/dictionaries";

export interface UploadedAssetInfo {
  id: string;
  mime: "image/png" | "image/jpeg" | "image/svg+xml";
  width: number;
  height: number;
  originalName: string;
}

export interface StudioApi {
  t: Dict;
  locale: "ar" | "en";
  catalog: { templates: CatalogTemplate[]; materials: CatalogMaterial[]; finishings: CatalogFinishing[] };
  template: CatalogTemplate;
  engine: PackagingEngine;
  doc: DesignDocument;
  update: (recipe: (d: DesignDocument) => DesignDocument, coalesceKey?: string) => void;
  specs: SurfaceSpec[];
  spec: SurfaceSpec;
  surfaceKey: SurfaceKey;
  setSurfaceKey: (k: SurfaceKey) => void;
  printable: (k: SurfaceKey) => boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selected: DesignElement | null;
  material: CatalogMaterial | null;
  compatibleMaterials: CatalogMaterial[];
  unit: "mm" | "cm";
  setUnit: (u: "mm" | "cm") => void;
  dimIssues: ValidationIssue[];
  applyDims: (d: Dimensions) => void;
  switchTemplate: (code: string) => void;
  addText: () => void;
  updateElement: (id: string, patch: Partial<DesignElement>, coalesceKey?: string) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElement: (id: string, dir: 1 | -1) => void;
  centerElement: (id: string, axis: "x" | "y") => void;
  placeElement: (id: string, col: 0 | 1 | 2, row: 0 | 1 | 2) => void;
  moveElementToSurface: (id: string, target: SurfaceKey) => void;
  applyElementToAllSurfaces: (id: string) => void;
  copySurface: (target: SurfaceKey | "all") => void;
  uploads: UploadedAssetInfo[];
  uploading: boolean;
  uploadError: string | null;
  uploadLogo: (file: File) => void;
  placeAsset: (a: UploadedAssetInfo) => void;
  addIcon: (icon: import("@/design/icons").IconKey, color: string) => void;
  isLoggedIn: boolean;
  requireLogin: () => void;
  images: ImageMap;
  maxUploadMb: number;
}

export const StudioContext = createContext<StudioApi | null>(null);

export function useStudio(): StudioApi {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio outside StudioContext");
  return ctx;
}
