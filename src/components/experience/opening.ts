import { clamp, lerp, ramp, smooth } from "./scroll";
import type { CameraPose } from "./story";
import type { Dimensions } from "@/packaging/types";

/**
 * The film that plays once when the homepage opens, on its own clock (seconds), before the scroll story:
 * a turntable of the range in a black showroom → a vortex into a ball → the logo → the ball drops and becomes the box.
 * Scrolling away skips it, so it never holds the page hostage.
 */
export const OPENING = {
  turn: [1.0, 5.9],
  gather: [5.6, 7.2],
  merge: [7.2, 7.7],
  logo: [7.7, 9.1],
  drop: [9.1, 9.9],
  land: [9.9, 10.35],
  end: 10.7,
} as const;

export const opening = { t: 0 };

export const openingDone = () => opening.t >= OPENING.end;
export const skipOpening = () => void (opening.t = OPENING.end);
export const resetOpening = () => void (opening.t = 0);

export interface OpeningProduct {
  engine: string;
  dims: Dimensions;
}
const p = (engine: string, length: number, width: number, height: number): OpeningProduct => ({ engine, dims: { length, width, height } });

/** One of each product, by department; every department fills the same arc of the turntable. */
export const DEPARTMENTS: { ar: string; en: string; products: OpeningProduct[] }[] = [
  { ar: "كراتين الشحن", en: "Shipping cartons", products: [p("rsc", 300, 200, 200), p("rsc", 450, 350, 350), p("rsc", 260, 175, 300)] },
  { ar: "البيتزا والوجبات", en: "Pizza & meal boxes", products: [p("clamshell", 120, 120, 90), p("pizza", 330, 330, 40), p("clamshell", 230, 180, 70)] },
  { ar: "الحلويات والتمور", en: "Sweets & dates", products: [p("mailer", 300, 200, 70), p("telescope", 250, 250, 120), p("drawer", 240, 160, 50)] },
  { ar: "علب الهدايا", en: "Gift boxes", products: [p("drawer", 100, 80, 40), p("telescope", 250, 200, 100), p("telescope", 320, 240, 100)] },
  { ar: "العطور والتجميل", en: "Perfume & beauty", products: [p("ste", 50, 50, 130), p("ste", 65, 65, 140), p("ste", 30, 30, 95)] },
  { ar: "الأكياس الورقية", en: "Paper bags", products: [p("bag", 200, 90, 250), p("bag", 260, 120, 330), p("bag", 220, 130, 260)] },
  { ar: "الأكواب الورقية", en: "Paper cups", products: [p("cup", 90, 60, 112), p("cup", 90, 62, 135), p("cup", 62, 45, 60)] },
  { ar: "الاستيكر والملصقات", en: "Stickers & labels", products: [p("round", 50, 1, 1), p("sheet", 148, 1, 210), p("sheet", 90, 1, 50)] },
];

const SLOT = (OPENING.turn[1] - OPENING.turn[0]) / DEPARTMENTS.length;

/** Turntable progress in departments: it pauses on each one, then moves on. */
const turnAt = (t: number) => Math.max(0, (t - OPENING.turn[0]) / SLOT);

/** Turntable angle: one stepped turn showing each department's middle product at the front. */
export function turntableAngle(t: number) {
  const x = turnAt(t);
  const step = Math.floor(x);
  const eased = step + smooth(clamp(((x % 1) - 0.35) / 0.65));
  return -(eased + 1 / 3) * ((Math.PI * 2) / DEPARTMENTS.length);
}

/** The department on stage and how visible its title is (0..1); null outside the turntable. */
export function departmentAt(t: number) {
  if (t < OPENING.turn[0] - 0.3 || t > OPENING.gather[0] + 0.35) return null;
  const x = turnAt(t) + 0.3;
  const index = Math.min(DEPARTMENTS.length - 1, Math.floor(x));
  const local = x - index;
  return { index, opacity: clamp(Math.min(local * 6, (1 - local) * 6 + (index === DEPARTMENTS.length - 1 ? 3 : 0))) * (1 - ramp(t, OPENING.gather[0], OPENING.gather[0] + 0.35)) };
}

const backOut = (t: number) => {
  const c = 1.70158;
  const x = clamp(t) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

/** Hero carton grows out of the landed ball. */
export const openingCartonScale = () => (openingDone() ? 1 : opening.t < OPENING.land[0] ? 0 : backOut((opening.t - OPENING.land[0]) / (OPENING.land[1] - OPENING.land[0])));

/** Measurement brackets and chapter text wait for the carton. */
export const openingOverlay = () => ramp(opening.t, OPENING.land[1] - 0.05, OPENING.end);

/** Low showroom view, pushing in slowly, settling on the scroll story's first pose as the ball lands. */
export function openingCamera(pose: CameraPose): CameraPose {
  if (openingDone()) return pose;
  const t = opening.t;
  const push = ramp(t, 0, OPENING.merge[1]);
  const start: CameraPose = { pos: [0, lerp(4.6, 3.1, push), lerp(21, 15.5, push)], target: [0, lerp(0.7, 1.7, push), 0] };
  const k = ramp(t, OPENING.drop[0], OPENING.land[1]);
  // small jolt when the ball hits the floor
  const hit = clamp(1 - (t - OPENING.drop[1]) / 0.35);
  const jolt = t > OPENING.drop[1] ? Math.sin(t * 70) * 0.035 * hit : 0;
  return {
    pos: [lerp(start.pos[0], pose.pos[0], k), lerp(start.pos[1], pose.pos[1], k) + jolt, lerp(start.pos[2], pose.pos[2], k)],
    target: [lerp(start.target[0], pose.target[0], k), lerp(start.target[1], pose.target[1], k), lerp(start.target[2], pose.target[2], k)],
  };
}
