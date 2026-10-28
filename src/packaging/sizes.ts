import type { Dimensions } from "./types";

/**
 * Common market sizes (inner dimensions, mm) per template — approximate references to start from,
 * not factory specifications. Templates without a list get S / M / L derived from their default.
 */
export interface SizePreset {
  ar: string;
  en: string;
  dims: Dimensions;
}
const d = (length: number, width: number, height: number): Dimensions => ({ length, width, height });

export const SIZE_PRESETS: Record<string, SizePreset[]> = {
  "pizza-box": [
    { ar: '8" صغير', en: '8" small', dims: d(210, 210, 40) },
    { ar: '10" وسط', en: '10" medium', dims: d(260, 260, 40) },
    { ar: '12" كبير', en: '12" large', dims: d(310, 310, 40) },
    { ar: '14" عائلي', en: '14" family', dims: d(360, 360, 45) },
    { ar: '16" جامبو', en: '16" jumbo', dims: d(410, 410, 50) },
  ],
  "cake-box": [
    { ar: '6" (6–8 أشخاص)', en: '6" (6–8 people)', dims: d(170, 170, 110) },
    { ar: '8" (10–12 شخص)', en: '8" (10–12 people)', dims: d(220, 220, 120) },
    { ar: '10" (16–20 شخص)', en: '10" (16–20 people)', dims: d(270, 270, 130) },
    { ar: '12" (24+ شخص)', en: '12" (24+ people)', dims: d(320, 320, 140) },
  ],
  "shoe-box": [
    { ar: "أطفال", en: "Kids", dims: d(250, 160, 90) },
    { ar: "حريمي", en: "Women", dims: d(300, 180, 100) },
    { ar: "رجالي", en: "Men", dims: d(330, 200, 120) },
    { ar: "بوت", en: "Boots", dims: d(360, 260, 130) },
  ],
  "shipping-carton": [
    { ar: "صغير S", en: "Small", dims: d(300, 200, 150) },
    { ar: "وسط M", en: "Medium", dims: d(400, 300, 250) },
    { ar: "كبير L", en: "Large", dims: d(500, 400, 350) },
    { ar: "كبير جداً XL", en: "X-large", dims: d(600, 400, 400) },
  ],
  "mailer-box": [
    { ar: "صغير (إكسسوارات)", en: "Small (accessories)", dims: d(220, 160, 60) },
    { ar: "وسط (ملابس خفيفة)", en: "Medium (light apparel)", dims: d(300, 220, 100) },
    { ar: "كبير", en: "Large", dims: d(400, 300, 120) },
  ],
  "burger-box": [
    { ar: "برجر عادي", en: "Single", dims: d(110, 110, 80) },
    { ar: "دبل", en: "Double", dims: d(130, 130, 95) },
  ],
  "perfume-box": [
    { ar: "30 مل", en: "30 ml", dims: d(45, 45, 100) },
    { ar: "50 مل", en: "50 ml", dims: d(55, 55, 120) },
    { ar: "100 مل", en: "100 ml", dims: d(65, 65, 140) },
  ],
  "paper-bag": [
    { ar: "صغير", en: "Small", dims: d(180, 80, 220) },
    { ar: "وسط", en: "Medium", dims: d(260, 120, 330) },
    { ar: "كبير", en: "Large", dims: d(320, 120, 420) },
  ],
  "takeaway-bag": [
    { ar: "وجبة فردية", en: "Single meal", dims: d(220, 130, 260) },
    { ar: "وجبتين", en: "Two meals", dims: d(260, 160, 300) },
    { ar: "عائلي", en: "Family", dims: d(320, 200, 330) },
  ],
  "coffee-box": [
    { ar: "250 جم", en: "250 g", dims: d(100, 65, 190) },
    { ar: "500 جم", en: "500 g", dims: d(120, 80, 230) },
    { ar: "كبسولات ×10", en: "Capsules ×10", dims: d(110, 55, 120) },
  ],
  "dates-box": [
    { ar: "250 جم", en: "250 g", dims: d(140, 100, 40) },
    { ar: "500 جم", en: "500 g", dims: d(200, 140, 45) },
    { ar: "1 كجم", en: "1 kg", dims: d(260, 180, 55) },
  ],
};

export function sizePresetsFor(code: string, defaults: Dimensions): SizePreset[] {
  const list = SIZE_PRESETS[code];
  if (list) return list;
  const scale = (k: number) => d(Math.round(defaults.length * k), Math.round(defaults.width * k), Math.round(defaults.height * k));
  return [
    { ar: "صغير", en: "Small", dims: scale(0.75) },
    { ar: "قياسي", en: "Standard", dims: scale(1) },
    { ar: "كبير", en: "Large", dims: scale(1.3) },
  ];
}

/** Practical guidance per box structure, shown next to the material choice. */
export const ENGINE_TIPS: Record<string, { ar: string; en: string }> = {
  rsc: { ar: "للشحن الخفيف يكفي كرتون مموج بموجة B أو C، وللأحمال الثقيلة والتصدير يُفضَّل جداران (BC).", en: "B or C flute suits light shipping; choose double wall (BC) for heavy loads and export." },
  mailer: { ar: "موجة E تعطي حواف أنظف وطباعة أدق لصناديق التجارة الإلكترونية؛ جرّب طباعة داخلية لتجربة فتح مميزة.", en: "E flute gives cleaner edges and sharper print on mailers; try inside print for a better unboxing." },
  rte: { ar: "علب المنتجات تُصنع عادة من كرتون أبيض أو دوبلكس؛ اترك مساحة على الظهر للبيانات والباركود.", en: "Product cartons are usually white board or duplex; keep space on the back for data and barcode." },
  ste: { ar: "مناسبة للعطور والتجميل؛ البصمة والكفراج يبرزان على الكرتون الأبيض أو الأسود الناعم.", en: "Ideal for perfume and cosmetics; foil and embossing stand out on white or soft-touch black." },
  pizza: { ar: "موجة E مع طبقة مقاومة للدهون؛ أضف فتحات تهوية للحفاظ على القرمشة.", en: "E flute with a grease-resistant coating; add vent holes to keep the crust crisp." },
  clamshell: { ar: "استخدم كرتوناً آمناً للأغذية، ويفضّل مقاوماً للدهون للبرجر والمقليات.", en: "Use food-safe board, preferably grease-resistant for burgers and fried food." },
  tray: { ar: "الصواني المفتوحة تحتاج زوايا قوية؛ موجة B مناسبة للفواكه والمخبوزات.", en: "Open trays need strong corners; B flute suits produce and bakery." },
  telescope: { ar: "للهدايا الفاخرة استخدم كرتوناً مقوّى صلباً مع غلاف مطبوع، وأضف شريطة أو إسفنجاً داخلياً.", en: "For luxury gifts use rigid board with a printed wrap; add a ribbon or foam insert." },
  drawer: { ar: "الدرج يمنح تجربة فتح فاخرة؛ أضف شريطة سحب وإسفنجاً داخلياً لتثبيت المنتج.", en: "A drawer gives a premium reveal; add a pull ribbon and a foam insert to hold the product." },
  bag: { ar: "اختر وزن الورق حسب الحمولة، والمقابض المبرومة للاستخدام اليومي أو الشريط للهدايا.", en: "Choose paper weight for the load; twisted handles for everyday use, ribbon for gifts." },
};
