/**
 * Parametric packaging engine — shared types.
 * All lengths are millimetres. Dieline coordinates: x → right, y → down,
 * viewed from the printed (outside) face of the flat sheet.
 */

export type Dimensions = { length: number; width: number; height: number };

/**
 * Printable outer surfaces of a closed box. Image conventions (viewed from outside):
 *  front  — up = box top, right = +x            back   — up = box top, right = −x
 *  right  — up = box top, right = −z            left   — up = box top, right = +z
 *  top    — seen from above, front edge at the bottom of the image, right = +x
 *  bottom — seen from below, front edge at the top of the image,   right = +x
 * (x = length axis, y = height axis, z = width axis, +z = front)
 */
export type SurfaceKey = "front" | "back" | "left" | "right" | "top" | "bottom";
export const SURFACE_KEYS: SurfaceKey[] = ["front", "back", "left", "right", "top", "bottom"];

export type Pt = [number, number];
export type Rotation = 0 | 90 | 180 | 270;

/** Where a region of a surface's artwork is printed on a dieline panel. */
export interface ArtMapping {
  surface: SurfaceKey;
  /** Source rectangle inside the surface, in mm */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Clockwise rotation applied to the source when it is laid onto the panel */
  rotation: Rotation;
}

export type PanelKind = "face" | "flap" | "glue" | "inner";

export interface DielinePanel {
  id: string;
  label: { ar: string; en: string };
  kind: PanelKind;
  /** Axis-aligned bounding rectangle of the panel (art is laid into this) */
  rect: { x: number; y: number; w: number; h: number };
  /** Outline polygon (clockwise) */
  points: Pt[];
  art?: ArtMapping;
}

export interface Dieline {
  width: number;
  height: number;
  panels: DielinePanel[];
  cuts: [Pt, Pt][];
  folds: [Pt, Pt][];
}

export interface SurfaceSpec {
  key: SurfaceKey;
  label: { ar: string; en: string };
  /** Surface size in mm (u × v) */
  w: number;
  h: number;
}

export type ValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: { ar: string; en: string };
};

export interface DimensionLimits {
  minLengthMm: number;
  maxLengthMm: number;
  minWidthMm: number;
  maxWidthMm: number;
  minHeightMm: number;
  maxHeightMm: number;
}

/** closed/mailer/tuck have a lid; "open" has no top (trays); "bag" is open with handles. */
export type BoxStyle = "closed" | "mailer" | "tuck" | "open" | "bag";

/** Styles whose top surface does not exist. */
export const OPEN_TOP: BoxStyle[] = ["open", "bag"];

export interface PackagingEngine {
  key: string;
  /** Geometry formula revision; bump whenever generated geometry changes */
  geometryRevision: number;
  /** How the 3D preview animates the opening */
  boxStyle: BoxStyle;
  surfaces(d: Dimensions): SurfaceSpec[];
  dieline(d: Dimensions): Dieline;
  /** Engine-specific geometric sanity checks (beyond min/max limits) */
  validate(d: Dimensions): ValidationIssue[];
}
