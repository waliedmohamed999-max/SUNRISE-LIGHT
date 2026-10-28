import { CH, lerp, ramp, window4 } from "./scroll";
import type { Dimensions } from "@/packaging/types";

/**
 * The homepage story, as pure functions of scroll position `s` (in screens).
 * The 3D scene and the DOM overlays both read these, so they never drift apart.
 */

export const BASE_DIMS: Dimensions = { length: 300, width: 200, height: 120 };
export const RESIZED_DIMS: Dimensions = { length: 440, width: 200, height: 220 };

/** Scene units per millimetre (shared by the carton and the ground). */
export const MM = 0.0085;

/** 1 = folded box, 0 = flat blank. Unfolds and refolds inside the "unfold" chapter. */
export function foldAt(s: number) {
  const [a, b] = CH.unfold;
  const open = ramp(s, a + 0.25, a + 0.95);
  const close = ramp(s, b - 0.55, b - 0.05);
  return 1 - open + close;
}

/** Live dimensions: length grows first, then height. */
export function dimsAt(s: number): Dimensions {
  const [a, b] = CH.resize;
  const mid = (a + b) / 2;
  return {
    length: Math.round(lerp(BASE_DIMS.length, RESIZED_DIMS.length, ramp(s, a + 0.15, mid))),
    width: BASE_DIMS.width,
    height: Math.round(lerp(BASE_DIMS.height, RESIZED_DIMS.height, ramp(s, mid, b - 0.15))),
  };
}

/** Kraft → full-colour print. */
export const printAt = (s: number) => ramp(s, CH.print[0] + 0.2, CH.print[0] + 0.85);

/** Technical cut/fold lines, visible while the blank is flat. */
export const linesAt = (s: number) => window4(s, CH.unfold[0] + 0.55, CH.unfold[0] + 0.95, CH.unfold[1] - 0.6, CH.unfold[1] - 0.35);

/** Intro: cutting mat and measurement brackets. */
export const matAt = (s: number) => 1 - ramp(s, 0.45, 1.1);

/** Corrugated board macro (cross-section sample). */
export const macroAt = (s: number) => window4(s, CH.macro[0] - 0.1, CH.macro[0] + 0.35, CH.macro[1] - 0.35, CH.macro[1] + 0.05);

/** Finishes lab (foil / emboss / spot UV) and its three stages. */
export const finishAt = (s: number) => window4(s, CH.finish[0] - 0.1, CH.finish[0] + 0.35, CH.finish[1] - 0.35, CH.finish[1] + 0.05);
export function finishStageAt(s: number) {
  const [a, b] = CH.finish;
  const span = (b - a) / 3;
  const i = Math.min(2, Math.max(0, Math.floor((s - a) / span)));
  return { index: i, local: Math.min(1, Math.max(0, (s - a - i * span) / span)), span };
}

/** Hero carton presence: away during the finishes lab, the macro, the blueprint and the light word chapter. */
export const cartonAt = (s: number) => 1 - Math.max(finishAt(s), macroAt(s), ramp(s, CH.blueprint[0] - 0.1, CH.blueprint[0] + 0.3));

/** Which feature panel (0..2) is active. */
export function featureAt(s: number) {
  const [a, b] = CH.features;
  const span = (b - a) / 3;
  const i = Math.min(2, Math.max(0, Math.floor((s - a) / span)));
  return { index: i, span, start: a + i * span };
}

/** Dimension annotations around the carton during the feature panels. */
export const annotationsAt = (s: number) => window4(s, CH.features[0] + 0.15, CH.features[0] + 0.5, CH.features[1] - 0.4, CH.features[1] - 0.1);

/** Other products joining the carton. */
export const familyAt = (s: number) => window4(s, CH.family[0] + 0.1, CH.family[0] + 0.8, CH.family[1] - 0.3, CH.family[1] + 0.1);

/** Whole 3D scene fades out as regular page content begins. */
export const sceneAt = (s: number) => 1 - ramp(s, CH.word[1] - 0.2, CH.word[1] + 0.6);

type RGB = [number, number, number];
const WALNUT: RGB = [0x10, 0x09, 0x04];
const CREAM: RGB = [0xf3, 0xe4, 0xcf];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Daylight section for the giant word: walnut → cream → walnut. */
export const lightAt = (s: number) => window4(s, CH.word[0] + 0.15, CH.word[0] + 0.6, CH.word[1] + 0.2, CH.word[1] + 0.6);
export const backgroundAt = (s: number): RGB => mix(WALNUT, CREAM, lightAt(s));

export interface CameraPose {
  pos: [number, number, number];
  target: [number, number, number];
}

const POSES: { at: number; pose: CameraPose }[] = [
  { at: 0.0, pose: { pos: [0.0, 7.2, 0.01], target: [0, 0, 0] } }, // top-down on the mat
  { at: 0.9, pose: { pos: [0.0, 6.4, 1.2], target: [0, 0, 0] } },
  { at: 1.8, pose: { pos: [5.9, 3.1, 7.3], target: [0, -0.15, 0] } }, // 3/4 hero
  { at: 2.5, pose: { pos: [4.6, 3.6, 6.2], target: [0, 0, 0] } },
  // straight overhead along z only, so the long blank reads horizontally (no camera roll)
  { at: 3.05, pose: { pos: [0, 13.2, -1.299], target: [0, 0, -1.3] } },
  { at: 3.45, pose: { pos: [0, 13.2, -1.299], target: [0, 0, -1.3] } },
  { at: 3.95, pose: { pos: [-5.6, 3.0, 6.6], target: [0, 0.2, 0] } }, // other side, folded again
  { at: 5.2, pose: { pos: [7.4, 4.0, 9.4], target: [0, -0.6, 0] } }, // resized, above the counter
  { at: 6.3, pose: { pos: [-5.2, 2.8, 7.4], target: [0, 0.3, 0] } }, // printing
  // finishes lab: square-on to the printed panel, drifting slowly
  { at: 6.9, pose: { pos: [0.5, 0.35, 4.4], target: [0, 0.05, 0] } },
  { at: 8.3, pose: { pos: [-0.5, 0.2, 4.0], target: [0, 0.05, 0] } },
  // macro: low and close along the corrugated edge
  { at: 9.0, pose: { pos: [1.6, 0.45, 2.4], target: [0, 0.05, 0] } },
  { at: 9.7, pose: { pos: [-1.0, 0.3, 1.7], target: [0, 0.02, 0] } },
  // features: carton on one side of the frame, frosted panel on the other
  { at: 10.2, pose: { pos: [6.8, 3.4, 8.2], target: [-1.6, 0.2, 0] } },
  { at: 12.5, pose: { pos: [-6.2, 3.8, 8.6], target: [-1.6, 0.2, 0] } },
  { at: 13.3, pose: { pos: [0.0, 3.6, 11.5], target: [0, 0.2, 0] } }, // family line-up
  { at: 14.0, pose: { pos: [0.0, 3.6, 11.5], target: [0, 0.2, 0] } },
  { at: 14.6, pose: { pos: [0.0, 7.5, 9.0], target: [0, 7.0, 0] } }, // tilt up: products leave the frame
  { at: 18.5, pose: { pos: [0.0, 7.5, 9.0], target: [0, 7.0, 0] } },
];

export function cameraAt(s: number): CameraPose {
  let i = 0;
  while (i < POSES.length - 2 && s > POSES[i + 1].at) i++;
  const a = POSES[i];
  const b = POSES[i + 1];
  const t = ramp(s, a.at, b.at);
  return {
    pos: [lerp(a.pose.pos[0], b.pose.pos[0], t), lerp(a.pose.pos[1], b.pose.pos[1], t), lerp(a.pose.pos[2], b.pose.pos[2], t)],
    target: [lerp(a.pose.target[0], b.pose.target[0], t), lerp(a.pose.target[1], b.pose.target[1], t), lerp(a.pose.target[2], b.pose.target[2], t)],
  };
}

/** Slow turntable rotation of the hero carton, paused while flat. */
export const spinAt = (s: number) => s * 0.55 * foldAt(s);

/** Floor height: the carton is centred on the origin, so the floor sits under its current height. */
export const groundAt = (s: number) => (-dimsAt(s).height * MM) / 2;
