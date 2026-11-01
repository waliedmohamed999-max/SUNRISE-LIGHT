import type { BoxOpening } from "./BoxModel";

// kept apart from the 3D model so pages can decide on their buttons without loading three.js
const OPENINGS: Record<string, BoxOpening> = { rsc: "flaps", telescope: "lift", drawer: "slide", mailer: "hinge", pizza: "hinge", clamshell: "hinge", rte: "hinge", ste: "hinge" };

export const openingFor = (engineKey: string): BoxOpening | null => OPENINGS[engineKey] ?? null;

const LABELS: Record<BoxOpening, { open: [string, string]; close: [string, string] }> = {
  hinge: { open: ["فتح الغطاء", "Open lid"], close: ["إغلاق الغطاء", "Close lid"] },
  flaps: { open: ["فتح القلابات", "Open flaps"], close: ["إغلاق القلابات", "Close flaps"] },
  lift: { open: ["رفع الغطاء", "Lift lid"], close: ["إغلاق الغطاء", "Close lid"] },
  slide: { open: ["سحب الدرج", "Pull drawer"], close: ["إغلاق الدرج", "Close drawer"] },
};

export const openingLabel = (kind: BoxOpening, isOpen: boolean, locale: string) => LABELS[kind][isOpen ? "close" : "open"][locale === "ar" ? 0 : 1];
