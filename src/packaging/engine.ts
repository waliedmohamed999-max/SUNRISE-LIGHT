import { shippingCarton } from "./templates/shipping-carton";
import { mailerBox } from "./templates/mailer-box";
import { foldingCarton } from "./templates/folding-carton";
import { pizzaBox } from "./templates/pizza-box";
import { paperBag } from "./templates/paper-bag";
import { foodTray } from "./templates/food-tray";
import { clamshell, drawerBox, straightTuck, telescopeBox } from "./templates/more-engines";
import type { DimensionLimits, Dimensions, PackagingEngine, ValidationIssue } from "./types";

export const ENGINES: Record<string, PackagingEngine> = {
  [shippingCarton.key]: shippingCarton,
  [mailerBox.key]: mailerBox,
  [foldingCarton.key]: foldingCarton,
  [pizzaBox.key]: pizzaBox,
  [paperBag.key]: paperBag,
  [foodTray.key]: foodTray,
  [straightTuck.key]: straightTuck,
  [telescopeBox.key]: telescopeBox,
  [drawerBox.key]: drawerBox,
  [clamshell.key]: clamshell,
};

export function getEngine(key: string): PackagingEngine {
  const engine = ENGINES[key];
  if (!engine) throw new Error(`Unknown packaging engine: ${key}`);
  return engine;
}

const AXES = [
  { k: "length", min: "minLengthMm", max: "maxLengthMm", ar: "الطول", en: "Length" },
  { k: "width", min: "minWidthMm", max: "maxWidthMm", ar: "العرض", en: "Width" },
  { k: "height", min: "minHeightMm", max: "maxHeightMm", ar: "الارتفاع", en: "Height" },
] as const;

/** Validate dimensions against template limits and engine geometry rules. */
export function validateDimensions(engine: PackagingEngine, d: Dimensions, limits: DimensionLimits): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const a of AXES) {
    const v = d[a.k];
    if (!Number.isFinite(v) || v <= 0) {
      issues.push({ level: "error", code: `dim.${a.k}.invalid`, message: { ar: `${a.ar} يجب أن يكون رقماً موجباً`, en: `${a.en} must be a positive number` } });
      continue;
    }
    if (v < limits[a.min]) {
      issues.push({
        level: "error",
        code: `dim.${a.k}.min`,
        message: { ar: `${a.ar} أقل من الحد الأدنى (${limits[a.min]} مم)`, en: `${a.en} is below the minimum (${limits[a.min]} mm)` },
      });
    }
    if (v > limits[a.max]) {
      issues.push({
        level: "error",
        code: `dim.${a.k}.max`,
        message: { ar: `${a.ar} أكبر من الحد الأقصى (${limits[a.max]} مم)`, en: `${a.en} is above the maximum (${limits[a.max]} mm)` },
      });
    }
  }
  if (issues.some((i) => i.level === "error")) return issues;
  return [...issues, ...engine.validate(d)];
}

export const hasErrors = (issues: ValidationIssue[]) => issues.some((i) => i.level === "error");
