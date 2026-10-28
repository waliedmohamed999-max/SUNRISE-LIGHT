import type { Locale } from "./config";

/**
 * Packaging reference content for the homepage guide. These are general industry reference
 * values, not factory specifications — availability is confirmed by the factory per quotation.
 */
export interface Flute {
  code: string;
  thicknessMm: number;
  wall: 1 | 2;
  name: string;
  use: string;
}
export interface GuideItem {
  title: string;
  body: string;
  tag?: string;
}

interface Guide {
  eyebrow: string;
  title: string;
  intro: string;
  note: string;
  tabs: { flutes: string; boards: string; print: string; colour: string; finishes: string; addons: string };
  fluteHead: { code: string; thickness: string; use: string };
  flutes: Flute[];
  boards: GuideItem[];
  print: GuideItem[];
  colour: GuideItem[];
  finishes: (GuideItem & { swatch: string })[];
  addons: GuideItem[];
}

const ar: Guide = {
  eyebrow: "دليل الكرتون",
  title: "كل ما تختاره في عبوتك",
  intro: "من نوع الموجة إلى طريقة الطباعة والتشطيب: مرجع سريع لتختار بثقة قبل أن تطلب عرض السعر.",
  note: "القيم مرجعية تقريبية شائعة في صناعة التغليف؛ الخامات والتشطيبات المتاحة فعلياً يؤكدها المصنع في عرض السعر.",
  tabs: { flutes: "أنواع الموجة", boards: "الخامات", print: "طرق الطباعة", colour: "الألوان", finishes: "التشطيبات", addons: "إضافات الهيكل" },
  fluteHead: { code: "الموجة", thickness: "السماكة التقريبية", use: "الاستخدام الشائع" },
  flutes: [
    { code: "F", thicknessMm: 0.8, wall: 1, name: "موجة دقيقة جداً", use: "علب منتجات فاخرة وطباعة عالية الدقة" },
    { code: "E", thicknessMm: 1.5, wall: 1, name: "موجة رقيقة", use: "علب التجزئة، صناديق البيتزا والتجارة الإلكترونية" },
    { code: "B", thicknessMm: 3, wall: 1, name: "موجة متوسطة", use: "كراتين شحن خفيفة ومتوسطة، صواني" },
    { code: "C", thicknessMm: 4, wall: 1, name: "موجة عالية", use: "كراتين الشحن والتخزين" },
    { code: "BC", thicknessMm: 7, wall: 2, name: "جداران", use: "أحمال ثقيلة، تصدير، تكديس مرتفع" },
  ],
  boards: [
    { title: "كرافت لاينر", body: "بطانة بنية من ألياف بكر، قوية ومقاومة للتمزق — الأكثر شيوعاً لكراتين الشحن.", tag: "مموج" },
    { title: "تست لاينر", body: "بطانة من ألياف معاد تدويرها، اقتصادية ومناسبة للاستخدامات العامة.", tag: "مموج" },
    { title: "وايت توب", body: "بطانة بيضاء السطح تعطي ألواناً أنقى عند الطباعة على الكرتون المموج.", tag: "مموج" },
    { title: "دوبلكس", body: "كرتون مقوّى بوجه أبيض وظهر رمادي، شائع لعلب المنتجات والأدوية والأغذية الجافة.", tag: "كرتون مقوّى" },
    { title: "كرتون أبيض صلب (SBS)", body: "أبيض من الوجهين، سطح فاخر للطباعة الدقيقة والتشطيبات.", tag: "كرتون مقوّى" },
    { title: "ورق كرافت", body: "ورق بني أو أبيض للأكياس، يُختار وزنه حسب الحمولة.", tag: "أكياس" },
  ],
  print: [
    { title: "فلكسو", body: "طباعة مباشرة على الكرتون المموج بألواح مرنة؛ اقتصادية للكميات الكبيرة والتصاميم البسيطة.", tag: "1–4 ألوان" },
    { title: "أوفست / ليثو لاميناشن", body: "طباعة أوفست على ورق يُلصق فوق الكرتون، لصور وتدرجات عالية الدقة.", tag: "جودة فوتوغرافية" },
    { title: "رقمية", body: "بدون ألواح طباعة، مناسبة للكميات الصغيرة والنماذج والتصاميم المتعددة.", tag: "كميات صغيرة" },
  ],
  colour: [
    { title: "CMYK", body: "الألوان الأربعة القياسية لطباعة الصور والتدرجات الكاملة.", tag: "كامل الألوان" },
    { title: "ألوان خاصة (Pantone)", body: "لون محدد مسبقاً لمطابقة هوية علامتك بدقة أعلى من المزج الرباعي.", tag: "مطابقة الهوية" },
    { title: "أبيض على كرافت", body: "طبقة حبر أبيض تحت الألوان أو كتصميم مستقل على الكرتون البني.", tag: "كرافت" },
    { title: "طباعة داخلية", body: "طباعة على الوجه الداخلي لتجربة فتح مميزة.", tag: "تجربة الفتح" },
    { title: "بروفة لون", body: "نموذج معتمد قبل التشغيل الكامل، لأن الألوان على الشاشة تقريبية.", tag: "قبل الإنتاج" },
  ],
  finishes: [
    { title: "البصمة (فويل)", body: "ذهبي أو فضي بالضغط الحراري على الشعار أو النص.", tag: "قالب بصمة", swatch: "bg-[linear-gradient(135deg,#8a6420,#f3d58a_45%,#a87a2a_60%,#e8c46a)]" },
    { title: "الكفراج البارز", body: "نقش مرتفع يُلمس، بقالب ضغط.", tag: "قالب كفراج", swatch: "bg-[#c79a6b] shadow-[inset_3px_3px_0_rgba(255,255,255,0.45),inset_-3px_-3px_0_rgba(0,0,0,0.35)]" },
    { title: "الكفراج الغائر", body: "نقش منخفض داخل السطح.", tag: "قالب كفراج", swatch: "bg-[#c79a6b] shadow-[inset_-3px_-3px_0_rgba(255,255,255,0.4),inset_3px_3px_0_rgba(0,0,0,0.4)]" },
    { title: "يو في موضعي", body: "لمعة شفافة على أجزاء محددة فوق سطح مطفي.", tag: "تباين لمعة", swatch: "bg-[linear-gradient(135deg,#2a1a10,#5a3a26_40%,#ffffff_50%,#5a3a26_60%,#2a1a10)]" },
    { title: "سلوفان مطفي / لامع", body: "طبقة حماية تمنح السطح ملمساً مطفياً أو لمعة واضحة.", tag: "حماية", swatch: "bg-[linear-gradient(135deg,#3a2a1c,#6b5040)]" },
    { title: "سلوفان ناعم الملمس", body: "ملمس مخملي فاخر يُشعر بالجودة.", tag: "فاخر", swatch: "bg-[#2f241c]" },
  ],
  addons: [
    { title: "شباك شفاف", body: "فتحة مقصوصة بغطاء PET لإظهار المنتج.", tag: "عرض المنتج" },
    { title: "مقابض", body: "فتحات مقابض في الكرتون أو مقابض ورقية للأكياس.", tag: "حمل" },
    { title: "فواصل وحوامل داخلية", body: "تقسيمات تثبّت المنتجات وتحميها أثناء الشحن.", tag: "حماية" },
    { title: "شريط فتح سريع", body: "شريط تمزيق يسهّل فتح صناديق التجارة الإلكترونية.", tag: "تجربة الفتح" },
    { title: "فتحات تهوية", body: "لصناديق البيتزا والأغذية الساخنة والمنتجات الطازجة.", tag: "أغذية" },
    { title: "قص بأشكال خاصة", body: "حواف وفتحات ونوافذ بأشكال مخصّصة بقالب قص.", tag: "قالب قص" },
  ],
};

const en: Guide = {
  eyebrow: "Carton guide",
  title: "Everything you choose in your box",
  intro: "From flute to print method and finish — a quick reference so you can choose with confidence before requesting a quote.",
  note: "Values are typical industry references; the materials and finishes actually available are confirmed by the factory in your quotation.",
  tabs: { flutes: "Flute types", boards: "Materials", print: "Print methods", colour: "Colour", finishes: "Finishes", addons: "Structural add-ons" },
  fluteHead: { code: "Flute", thickness: "Approx. thickness", use: "Typical use" },
  flutes: [
    { code: "F", thicknessMm: 0.8, wall: 1, name: "Extra-fine flute", use: "Premium product boxes, high-detail print" },
    { code: "E", thicknessMm: 1.5, wall: 1, name: "Fine flute", use: "Retail boxes, pizza boxes, e-commerce mailers" },
    { code: "B", thicknessMm: 3, wall: 1, name: "Medium flute", use: "Light-to-medium shipping cartons, trays" },
    { code: "C", thicknessMm: 4, wall: 1, name: "Tall flute", use: "Shipping and storage cartons" },
    { code: "BC", thicknessMm: 7, wall: 2, name: "Double wall", use: "Heavy loads, export, high stacking" },
  ],
  boards: [
    { title: "Kraft liner", body: "Brown virgin-fibre liner, strong and tear-resistant — the most common for shipping cartons.", tag: "Corrugated" },
    { title: "Test liner", body: "Recycled-fibre liner, economical for general use.", tag: "Corrugated" },
    { title: "White-top liner", body: "White-surfaced liner for cleaner colours on corrugated.", tag: "Corrugated" },
    { title: "Duplex board", body: "Paperboard with a white face and grey back, common for product, pharma and dry-food cartons.", tag: "Paperboard" },
    { title: "Solid bleached board (SBS)", body: "White on both sides — a premium surface for fine print and finishes.", tag: "Paperboard" },
    { title: "Kraft paper", body: "Brown or white paper for bags, weight chosen to suit the load.", tag: "Bags" },
  ],
  print: [
    { title: "Flexo", body: "Printed directly on corrugated with flexible plates; economical for large runs and simple designs.", tag: "1–4 colours" },
    { title: "Offset / litho-lam", body: "Offset-printed sheet laminated onto board, for photographic images and gradients.", tag: "Photographic quality" },
    { title: "Digital", body: "No plates — suited to short runs, prototypes and many design versions.", tag: "Short runs" },
  ],
  colour: [
    { title: "CMYK", body: "The four process colours for full-colour images and gradients.", tag: "Full colour" },
    { title: "Spot colours (Pantone)", body: "A pre-mixed ink for closer brand-colour matching than process colour.", tag: "Brand match" },
    { title: "White on kraft", body: "A white ink layer under colours, or as a design of its own on brown board.", tag: "Kraft" },
    { title: "Inside print", body: "Printing on the inner face for a memorable unboxing.", tag: "Unboxing" },
    { title: "Colour proof", body: "An approved sample before the full run, because on-screen colour is approximate.", tag: "Before production" },
  ],
  finishes: [
    { title: "Hot foil", body: "Gold or silver pressed onto your logo or text with heat.", tag: "Foil die", swatch: "bg-[linear-gradient(135deg,#8a6420,#f3d58a_45%,#a87a2a_60%,#e8c46a)]" },
    { title: "Embossing", body: "Raised relief you can feel, formed with a press die.", tag: "Emboss die", swatch: "bg-[#c79a6b] shadow-[inset_3px_3px_0_rgba(255,255,255,0.45),inset_-3px_-3px_0_rgba(0,0,0,0.35)]" },
    { title: "Debossing", body: "Recessed relief pressed into the surface.", tag: "Emboss die", swatch: "bg-[#c79a6b] shadow-[inset_-3px_-3px_0_rgba(255,255,255,0.4),inset_3px_3px_0_rgba(0,0,0,0.4)]" },
    { title: "Spot UV", body: "Clear gloss on selected areas over a matte surface.", tag: "Gloss contrast", swatch: "bg-[linear-gradient(135deg,#2a1a10,#5a3a26_40%,#ffffff_50%,#5a3a26_60%,#2a1a10)]" },
    { title: "Matte / gloss lamination", body: "A protective film with a matte feel or a clear shine.", tag: "Protection", swatch: "bg-[linear-gradient(135deg,#3a2a1c,#6b5040)]" },
    { title: "Soft-touch lamination", body: "A velvety, premium feel in the hand.", tag: "Premium", swatch: "bg-[#2f241c]" },
  ],
  addons: [
    { title: "Window patch", body: "A die-cut opening with PET film to show the product.", tag: "Product display" },
    { title: "Handles", body: "Hand holes in cartons, or paper handles for bags.", tag: "Carrying" },
    { title: "Inserts & partitions", body: "Dividers that hold and protect products in transit.", tag: "Protection" },
    { title: "Tear strip", body: "A zip strip for easy opening of e-commerce boxes.", tag: "Unboxing" },
    { title: "Vent holes", body: "For pizza boxes, hot food and fresh produce.", tag: "Food" },
    { title: "Custom die-cut shapes", body: "Custom edges, openings and windows cut with a die.", tag: "Cutting die" },
  ],
};

export const getGuide = (l: Locale) => (l === "ar" ? ar : en);
