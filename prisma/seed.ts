/**
 * Seed reference data. Values marked "system default" are editable placeholders for the
 * factory to confirm — they are NOT verified production capabilities.
 */
import { PrismaClient, type MaterialKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { passwordProblem } from "../src/lib/password-policy";

const db = new PrismaClient();

const SURFACES = [
  { key: "front", nameAr: "الوجه الأمامي", nameEn: "Front" },
  { key: "back", nameAr: "الوجه الخلفي", nameEn: "Back" },
  { key: "left", nameAr: "الجانب الأيسر", nameEn: "Left side" },
  { key: "right", nameAr: "الجانب الأيمن", nameEn: "Right side" },
  { key: "top", nameAr: "الوجه العلوي", nameEn: "Top" },
  { key: "bottom", nameAr: "القاعدة", nameEn: "Bottom" },
];

const CATEGORIES = [
  { slug: "shipping-boxes", nameAr: "كراتين الشحن المموجة", nameEn: "Corrugated Shipping Boxes", status: "ACTIVE", descriptionAr: "كراتين مشقوقة لنقل وتخزين البضائع.", descriptionEn: "Slotted cartons for shipping and storage." },
  { slug: "mailer-boxes", nameAr: "صناديق التجارة الإلكترونية", nameEn: "E-commerce Mailer Boxes", status: "ACTIVE", descriptionAr: "صناديق بغطاء متصل لتجربة فتح مميزة.", descriptionEn: "Lidded mailer boxes for a memorable unboxing." },
  { slug: "folding-cartons", nameAr: "علب المنتجات المطوية", nameEn: "Folding Cartons", status: "ACTIVE", descriptionAr: "علب ورقية للمنتجات الاستهلاكية.", descriptionEn: "Paperboard cartons for retail products." },
  { slug: "gift-boxes", nameAr: "علب الهدايا", nameEn: "Gift Boxes", status: "COMING_SOON", descriptionAr: "", descriptionEn: "" },
  { slug: "food-packaging", nameAr: "تغليف الأغذية", nameEn: "Food Packaging", status: "COMING_SOON", descriptionAr: "", descriptionEn: "" },
  { slug: "paper-cups", nameAr: "الأكواب الورقية", nameEn: "Paper Cups", status: "COMING_SOON", descriptionAr: "", descriptionEn: "" },
  { slug: "paper-bags", nameAr: "الأكياس الورقية", nameEn: "Paper Bags", status: "COMING_SOON", descriptionAr: "", descriptionEn: "" },
  { slug: "custom-packaging", nameAr: "تغليف مخصص", nameEn: "Custom Packaging", status: "COMING_SOON", descriptionAr: "تواصل معنا لمتطلبات خاصة.", descriptionEn: "Contact us for special requirements." },
  { slug: "stickers-labels", nameAr: "الاستيكرات والملصقات", nameEn: "Stickers & Labels", status: "COMING_SOON", descriptionAr: "استيكرات وملصقات مطبوعة بشعارك لإغلاق العلب وتمييز المنتجات.", descriptionEn: "Printed stickers and labels to seal boxes and brand products." },
  { slug: "wrapping-paper", nameAr: "ورق اللف والتغليف", nameEn: "Wrapping Paper", status: "COMING_SOON", descriptionAr: "ورق لف وتغليف مطبوع بشعارك للهدايا والمطاعم والمتاجر.", descriptionEn: "Printed wrapping paper for gifts, restaurants and shops." },
] as const;

const MATERIALS: { code: string; nameAr: string; nameEn: string; kind: MaterialKind; colorHex: string; sortOrder: number }[] = [
  { code: "corrugated-kraft", nameAr: "كرتون مموج كرافت", nameEn: "Corrugated kraft board", kind: "CORRUGATED", colorHex: "#B78B59", sortOrder: 1 },
  { code: "corrugated-white", nameAr: "كرتون مموج أبيض", nameEn: "Corrugated white-top board", kind: "CORRUGATED", colorHex: "#EEEAE2", sortOrder: 2 },
  { code: "kraft-board", nameAr: "كرتون كرافت", nameEn: "Kraft board", kind: "KRAFT", colorHex: "#C49A68", sortOrder: 3 },
  { code: "white-board", nameAr: "كرتون أبيض", nameEn: "White board", kind: "WHITE", colorHex: "#F5F3EE", sortOrder: 4 },
  { code: "duplex-board", nameAr: "كرتون دوبلكس", nameEn: "Duplex board", kind: "DUPLEX", colorHex: "#ECE9E3", sortOrder: 5 },
  { code: "micro-flute", nameAr: "كرتون مموج رقيق (موجة E)", nameEn: "Micro-flute corrugated (E-flute)", kind: "CORRUGATED", colorHex: "#C9A06B", sortOrder: 6 },
  { code: "kraft-paper", nameAr: "ورق كرافت للأكياس", nameEn: "Kraft bag paper", kind: "KRAFT", colorHex: "#B98C5A", sortOrder: 7 },
  { code: "white-kraft-paper", nameAr: "ورق كرافت أبيض", nameEn: "White kraft paper", kind: "WHITE", colorHex: "#F1ECE2", sortOrder: 8 },
  { code: "rigid-board", nameAr: "كرتون مقوّى صلب (للعلب الفاخرة)", nameEn: "Rigid greyboard (luxury boxes)", kind: "OTHER", colorHex: "#2A221C", sortOrder: 9 },
  { code: "cup-board", nameAr: "كرتون أكواب مبطّن", nameEn: "PE-coated cup board", kind: "WHITE", colorHex: "#F6F1E9", sortOrder: 10 },
  { code: "sticker-gloss", nameAr: "ورق استيكر لامع", nameEn: "Gloss sticker paper", kind: "WHITE", colorHex: "#FBFAF7", sortOrder: 11 },
  { code: "sticker-matte", nameAr: "ورق استيكر مطفي", nameEn: "Matte sticker paper", kind: "WHITE", colorHex: "#F2EEE7", sortOrder: 12 },
  { code: "sticker-kraft", nameAr: "استيكر كرافت", nameEn: "Kraft sticker paper", kind: "KRAFT", colorHex: "#C49A68", sortOrder: 13 },
  { code: "wrapping-white", nameAr: "ورق لف أبيض", nameEn: "White wrapping paper", kind: "WHITE", colorHex: "#FAF7F2", sortOrder: 14 },
  { code: "greaseproof-paper", nameAr: "ورق مقاوم للدهون (للأغذية)", nameEn: "Greaseproof food paper", kind: "OTHER", colorHex: "#F3EBDD", sortOrder: 15 },
];

const FINISHINGS = [
  { code: "none", nameAr: "بدون تشطيب", nameEn: "No finishing" },
  { code: "matte-varnish", nameAr: "ورنيش مطفي", nameEn: "Matte varnish" },
  { code: "gloss-varnish", nameAr: "ورنيش لامع", nameEn: "Gloss varnish" },
  { code: "matte-lamination", nameAr: "سلوفان مطفي", nameEn: "Matte lamination" },
  { code: "gloss-lamination", nameAr: "سلوفان لامع", nameEn: "Gloss lamination" },
  { code: "spot-uv", nameAr: "يو في موضعي", nameEn: "Spot UV" },
  { code: "hot-foil", nameAr: "بصمة فويل (ذهبي / فضي)", nameEn: "Hot foil stamping (gold / silver)" },
  { code: "emboss", nameAr: "كفراج بارز", nameEn: "Embossing" },
  { code: "deboss", nameAr: "كفراج غائر", nameEn: "Debossing" },
  { code: "soft-touch", nameAr: "سلوفان ناعم الملمس", nameEn: "Soft-touch lamination" },
  { code: "window-patch", nameAr: "شباك شفاف (PET)", nameEn: "Window patch (PET)" },
  { code: "inside-print", nameAr: "طباعة داخلية", nameEn: "Inside print" },
  { code: "paper-handles", nameAr: "مقابض ورقية مبرومة", nameEn: "Twisted paper handles" },
  { code: "ribbon-handles", nameAr: "مقابض شريط قماش", nameEn: "Ribbon handles" },
  { code: "inserts", nameAr: "حوامل وفواصل داخلية", nameEn: "Inserts & partitions" },
  { code: "foam-insert", nameAr: "إسفنج داخلي مفصّل", nameEn: "Custom foam insert" },
  { code: "satin-ribbon", nameAr: "شريطة ستان", nameEn: "Satin ribbon" },
  { code: "magnetic-closure", nameAr: "إغلاق مغناطيسي", nameEn: "Magnetic closure" },
  { code: "tear-strip", nameAr: "شريط فتح سريع", nameEn: "Tear strip" },
  { code: "vent-holes", nameAr: "فتحات تهوية", nameEn: "Vent holes" },
  { code: "handle-hole", nameAr: "فتحة يد", nameEn: "Hand hole" },
  { code: "grease-resistant", nameAr: "طبقة مقاومة للدهون (للأغذية)", nameEn: "Grease-resistant coating (food)" },
];

const TEMPLATES = [
  {
    code: "shipping-carton",
    engineKey: "rsc",
    category: "shipping-boxes",
    nameAr: "كرتون شحن قياسي",
    nameEn: "Standard shipping carton",
    descriptionAr: "كرتون مشقوق منتظم بأربعة ألسنة علوية وسفلية.",
    descriptionEn: "Regular slotted carton with four top and bottom flaps.",
    limits: [100, 1200, 80, 800, 50, 1000],
    defaults: [300, 200, 120],
    materials: ["corrugated-kraft", "corrugated-white"],
    print: ["none", "1c", "2c", "4c"],
  },
  {
    code: "mailer-box",
    engineKey: "mailer",
    category: "mailer-boxes",
    nameAr: "صندوق تجارة إلكترونية",
    nameEn: "E-commerce mailer box",
    descriptionAr: "صندوق بغطاء متصل ولسان إغلاق أمامي.",
    descriptionEn: "Mailer box with an attached lid and front tuck.",
    limits: [100, 600, 80, 450, 30, 200],
    defaults: [250, 180, 80],
    materials: ["corrugated-kraft", "corrugated-white", "kraft-board"],
    print: ["none", "1c", "2c", "4c"],
  },
  {
    code: "folding-carton",
    engineKey: "rte",
    category: "folding-cartons",
    nameAr: "علبة منتج مطوية",
    nameEn: "Folding product carton",
    descriptionAr: "علبة بإغلاق عكسي علوي وسفلي.",
    descriptionEn: "Reverse tuck end carton.",
    limits: [30, 300, 20, 200, 30, 400],
    defaults: [80, 50, 150],
    materials: ["white-board", "duplex-board", "kraft-board"],
    print: ["none", "1c", "2c", "4c"],
  },
];

const FOOD_AND_BAGS = [
  {
    code: "pizza-box",
    engineKey: "pizza",
    category: "food-packaging",
    nameAr: "صندوق بيتزا",
    nameEn: "Pizza box",
    descriptionAr: "صندوق مموج مربع بغطاء متصل ولسان أمامي وجدران جانبية مزدوجة.",
    descriptionEn: "Square corrugated box with an attached lid, front tuck and double side walls.",
    limits: [200, 500, 200, 500, 30, 70],
    defaults: [330, 330, 40],
    materials: ["micro-flute", "corrugated-kraft", "corrugated-white"],
    print: ["none", "1c", "2c", "4c"],
    openTop: false,
  },
  {
    code: "paper-bag",
    engineKey: "bag",
    category: "paper-bags",
    nameAr: "كيس ورقي بمقابض",
    nameEn: "Paper carrier bag",
    descriptionAr: "كيس بطيّات جانبية وقاع مربع ومقابض ورقية.",
    descriptionEn: "Gusseted bag with a block bottom and paper handles.",
    limits: [120, 500, 60, 200, 150, 500],
    defaults: [260, 120, 330],
    materials: ["kraft-paper", "white-kraft-paper"],
    print: ["none", "1c", "2c", "4c"],
    openTop: true,
  },
  {
    code: "food-tray",
    engineKey: "tray",
    category: "food-packaging",
    nameAr: "صينية تقديم مفتوحة",
    nameEn: "Open food tray",
    descriptionAr: "صينية مفتوحة بزوايا ملصوقة للمخبوزات والفواكه والوجبات.",
    descriptionEn: "Open tray with glued corners for bakery, produce and meals.",
    limits: [100, 600, 80, 400, 30, 200],
    defaults: [300, 200, 80],
    materials: ["micro-flute", "corrugated-kraft", "white-board"],
    print: ["none", "1c", "2c", "4c"],
    openTop: true,
  },
];

/*
 * Template catalogue by industry. Limits are provisional (derived from each default size)
 * and must be confirmed by the factory; every dieline starts as "needs technical review".
 */
type Cat = { code: string; engineKey: string; category: string; nameAr: string; nameEn: string; descAr: string; descEn: string; dims: [number, number, number]; industries: string[]; limits?: number[]; materials?: string[] };
const ENGINE_MATERIALS: Record<string, string[]> = {
  rsc: ["corrugated-kraft", "corrugated-white"],
  mailer: ["micro-flute", "corrugated-kraft", "corrugated-white", "kraft-board"],
  rte: ["white-board", "duplex-board", "kraft-board"],
  ste: ["white-board", "duplex-board", "kraft-board"],
  pizza: ["micro-flute", "corrugated-kraft", "corrugated-white"],
  clamshell: ["micro-flute", "white-board", "kraft-board"],
  tray: ["micro-flute", "corrugated-kraft", "white-board"],
  telescope: ["rigid-board", "white-board", "duplex-board", "kraft-board"],
  drawer: ["rigid-board", "white-board", "duplex-board", "kraft-board"],
  bag: ["kraft-paper", "white-kraft-paper"],
  cup: ["cup-board"],
  sheet: ["sticker-gloss", "sticker-matte", "sticker-kraft"],
  round: ["sticker-gloss", "sticker-matte", "sticker-kraft"],
};
/** Engines with a single printed face (cups print the wrap; stickers and paper print one side). */
const FRONT_ONLY_ENGINES = ["cup", "sheet", "round"];
const OPEN_TOP_ENGINES = ["bag", "tray"];
const CATALOG: Cat[] = [
  // shipping & e-commerce
  { code: "heavy-duty-carton", engineKey: "rsc", category: "shipping-boxes", nameAr: "كرتون شحن مزدوج الجدار", nameEn: "Double-wall shipping carton", descAr: "للأحمال الثقيلة والتصدير والتكديس المرتفع.", descEn: "For heavy loads, export and high stacking.", dims: [500, 400, 400], industries: ["logistics", "electronics"] },
  { code: "moving-box", engineKey: "rsc", category: "shipping-boxes", nameAr: "كرتون نقل وتخزين", nameEn: "Moving & storage carton", descAr: "مقاس عملي للنقل والأرشفة والمستودعات.", descEn: "A practical size for moving, archiving and warehousing.", dims: [450, 350, 350], industries: ["logistics", "retail"] },
  { code: "bottle-carton", engineKey: "rsc", category: "shipping-boxes", nameAr: "كرتون زجاجات ومشروبات", nameEn: "Bottle & beverage carton", descAr: "يُستخدم مع فواصل داخلية لحماية الزجاجات.", descEn: "Used with partitions to protect bottles.", dims: [260, 175, 300], industries: ["restaurants", "retail", "coffee"] },
  { code: "subscription-box", engineKey: "mailer", category: "mailer-boxes", nameAr: "صندوق اشتراكات", nameEn: "Subscription box", descAr: "تجربة فتح مميزة لصناديق الاشتراك الشهرية.", descEn: "A memorable unboxing for monthly subscriptions.", dims: [300, 220, 100], industries: ["ecommerce", "cosmetics", "gifts"] },
  { code: "electronics-mailer", engineKey: "mailer", category: "mailer-boxes", nameAr: "صندوق إلكترونيات", nameEn: "Electronics mailer", descAr: "صندوق متين للأجهزة والإكسسوارات مع حوامل داخلية.", descEn: "A sturdy mailer for devices and accessories, with inserts.", dims: [220, 160, 60], industries: ["electronics", "ecommerce"] },
  { code: "apparel-mailer", engineKey: "mailer", category: "mailer-boxes", nameAr: "صندوق ملابس", nameEn: "Apparel mailer", descAr: "صندوق مسطح للملابس والطلبات الإلكترونية.", descEn: "A flat mailer for garments and online orders.", dims: [350, 260, 80], industries: ["fashion", "ecommerce"] },
  // folding cartons
  { code: "perfume-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة عطر", nameEn: "Perfume box", descAr: "علبة أنيقة للعطور تناسب البصمة والكفراج.", descEn: "An elegant perfume carton, ideal for foil and embossing.", dims: [65, 65, 140], industries: ["perfumes", "cosmetics", "gifts"] },
  { code: "cosmetics-carton", engineKey: "rte", category: "folding-cartons", nameAr: "علبة مستحضرات تجميل", nameEn: "Cosmetics carton", descAr: "للكريمات والسيرومات والعبوات الصغيرة.", descEn: "For creams, serums and small containers.", dims: [55, 55, 120], industries: ["cosmetics", "pharma"] },
  { code: "lipstick-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة أحمر شفاه", nameEn: "Lipstick box", descAr: "علبة صغيرة رفيعة للمنتجات الأنبوبية.", descEn: "A slim carton for tubes and sticks.", dims: [30, 30, 95], industries: ["cosmetics"] },
  { code: "pharma-carton", engineKey: "rte", category: "folding-cartons", nameAr: "علبة دواء", nameEn: "Pharma carton", descAr: "للأدوية والمكمّلات مع مساحة للنشرة والبيانات.", descEn: "For medicines and supplements, with room for leaflet and data.", dims: [90, 40, 120], industries: ["pharma"] },
  { code: "supplement-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة مكمّلات غذائية", nameEn: "Supplement box", descAr: "لعبوات الكبسولات والمساحيق.", descEn: "For capsule and powder containers.", dims: [80, 80, 140], industries: ["pharma", "retail"] },
  { code: "tea-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة شاي", nameEn: "Tea box", descAr: "لأكياس الشاي والأعشاب.", descEn: "For tea bags and herbal infusions.", dims: [120, 70, 160], industries: ["coffee", "retail"] },
  { code: "coffee-box", engineKey: "rte", category: "folding-cartons", nameAr: "علبة قهوة", nameEn: "Coffee box", descAr: "للبن المطحون والكبسولات.", descEn: "For ground coffee and capsules.", dims: [100, 65, 190], industries: ["coffee", "retail"] },
  { code: "dry-food-box", engineKey: "rte", category: "folding-cartons", nameAr: "علبة أغذية جافة", nameEn: "Dry food box", descAr: "للحبوب والمعكرونة والوجبات الخفيفة.", descEn: "For cereals, pasta and snacks.", dims: [190, 60, 260], industries: ["retail"] },
  { code: "soap-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة صابون", nameEn: "Soap box", descAr: "علبة مسطحة للصابون ومنتجات العناية.", descEn: "A flat carton for soap and care products.", dims: [90, 30, 65], industries: ["cosmetics", "retail"] },
  { code: "candle-box", engineKey: "rte", category: "folding-cartons", nameAr: "علبة شموع", nameEn: "Candle box", descAr: "للشموع المعطّرة والهدايا المنزلية.", descEn: "For scented candles and home gifts.", dims: [90, 90, 110], industries: ["gifts", "retail"] },
  // restaurants & bakery
  { code: "burger-box", engineKey: "clamshell", category: "food-packaging", nameAr: "علبة برجر", nameEn: "Burger box", descAr: "علبة صدفية بغطاء متصل للبرجر والساندويتشات.", descEn: "A hinged clamshell for burgers and sandwiches.", dims: [120, 120, 90], industries: ["restaurants"] },
  { code: "sandwich-box", engineKey: "clamshell", category: "food-packaging", nameAr: "علبة ساندويتش", nameEn: "Sandwich box", descAr: "علبة مستطيلة للساندويتشات والرابات.", descEn: "A long clamshell for sandwiches and wraps.", dims: [190, 90, 70], industries: ["restaurants", "bakery", "coffee"] },
  { code: "meal-box", engineKey: "clamshell", category: "food-packaging", nameAr: "علبة وجبة", nameEn: "Meal box", descAr: "علبة وجبات سفري متعددة الاستخدام.", descEn: "A takeaway meal box.", dims: [230, 180, 70], industries: ["restaurants"] },
  { code: "cake-box", engineKey: "telescope", category: "food-packaging", nameAr: "علبة كيك", nameEn: "Cake box", descAr: "غطاء كامل فوق قاعدة، يمكن إضافة شباك شفاف.", descEn: "A full lid over a base; a window can be added.", dims: [250, 250, 120], industries: ["bakery"] },
  { code: "donut-box", engineKey: "mailer", category: "food-packaging", nameAr: "علبة دونات وحلويات", nameEn: "Donut & pastry box", descAr: "علبة بغطاء للدونات والمعجنات.", descEn: "A lidded box for donuts and pastries.", dims: [300, 200, 70], industries: ["bakery", "coffee"] },
  { code: "dessert-box", engineKey: "ste", category: "food-packaging", nameAr: "علبة حلويات صغيرة", nameEn: "Dessert box", descAr: "علبة مربعة للقطع الفردية والمخبوزات الصغيرة.", descEn: "A square box for single pieces and small bakes.", dims: [100, 100, 70], industries: ["bakery", "coffee", "gifts"] },
  // gifts & luxury
  { code: "gift-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة هدايا بغطاء", nameEn: "Lid & base gift box", descAr: "غطاء كامل فوق قاعدة، مناسب للتغليف الفاخر.", descEn: "A full lid over a base, for premium gifting.", dims: [250, 200, 100], industries: ["gifts", "fashion", "perfumes"] },
  { code: "shoe-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة أحذية", nameEn: "Shoe box", descAr: "علبة بغطاء للأحذية والحقائب الصغيرة.", descEn: "A lidded box for shoes and small bags.", dims: [320, 200, 120], industries: ["fashion", "retail"] },
  { code: "apparel-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة ملابس فاخرة", nameEn: "Premium apparel box", descAr: "علبة مسطحة بغطاء للملابس والهدايا.", descEn: "A flat lidded box for garments and gifts.", dims: [350, 250, 80], industries: ["fashion", "gifts"] },
  { code: "phone-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة جهاز إلكتروني", nameEn: "Device box", descAr: "علبة بغطاء للهواتف والإكسسوارات.", descEn: "A lidded box for phones and accessories.", dims: [170, 90, 50], industries: ["electronics"] },
  { code: "perfume-drawer", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة عطر بدرج", nameEn: "Perfume drawer box", descAr: "غلاف مطبوع ودرج داخلي لتجربة فتح فاخرة.", descEn: "A printed sleeve and inner drawer for a luxurious reveal.", dims: [160, 100, 70], industries: ["perfumes", "gifts", "cosmetics"] },
  { code: "jewelry-drawer", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة مجوهرات بدرج", nameEn: "Jewellery drawer box", descAr: "علبة صغيرة بدرج للمجوهرات والساعات.", descEn: "A small drawer box for jewellery and watches.", dims: [100, 80, 40], industries: ["jewelry", "gifts"] },
  { code: "chocolate-drawer", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة شوكولاتة بدرج", nameEn: "Chocolate drawer box", descAr: "علبة مسطحة بدرج للشوكولاتة والتمور.", descEn: "A flat drawer box for chocolates and dates.", dims: [200, 120, 40], industries: ["gifts", "bakery", "coffee"] },
  // bags
  { code: "takeaway-bag", engineKey: "bag", category: "paper-bags", nameAr: "كيس طلبات سفري", nameEn: "Takeaway bag", descAr: "كيس ورقي بقاع عريض للطلبات والمشروبات.", descEn: "A wide-bottom paper bag for orders and drinks.", dims: [220, 130, 260], industries: ["restaurants", "coffee", "bakery"] },
  { code: "gift-bag", engineKey: "bag", category: "paper-bags", nameAr: "كيس هدايا", nameEn: "Gift bag", descAr: "كيس أنيق للهدايا والعطور والمجوهرات.", descEn: "An elegant bag for gifts, perfumes and jewellery.", dims: [200, 90, 250], industries: ["gifts", "perfumes", "jewelry"] },
  { code: "shopping-bag", engineKey: "bag", category: "paper-bags", nameAr: "كيس تسوق فاخر", nameEn: "Premium shopping bag", descAr: "كيس كبير لمحلات الأزياء والعطور.", descEn: "A large bag for fashion and perfume stores.", dims: [400, 150, 350], industries: ["fashion", "perfumes", "retail"] },
  // dates, sweets & regional
  { code: "dates-box", engineKey: "telescope", category: "food-packaging", nameAr: "علبة تمور بغطاء", nameEn: "Dates box (lid & base)", descAr: "علبة تمور مسطحة بغطاء كامل، مناسبة للضيافة والهدايا.", descEn: "A flat lid-and-base dates box for hospitality and gifts.", dims: [200, 140, 45], industries: ["dates", "gifts", "retail"] },
  { code: "dates-drawer", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة تمور فاخرة بدرج", nameEn: "Luxury dates drawer box", descAr: "غلاف مطبوع ودرج داخلي لتمور الهدايا الفاخرة.", descEn: "A printed sleeve with an inner drawer for premium dates.", dims: [240, 160, 50], industries: ["dates", "gifts"] },
  { code: "maamoul-tray", engineKey: "tray", category: "food-packaging", nameAr: "صينية معمول وحلويات", nameEn: "Maamoul & sweets tray", descAr: "صينية مفتوحة للمعمول والحلويات الشرقية.", descEn: "An open tray for maamoul and Arabic sweets.", dims: [260, 180, 50], industries: ["dates", "bakery"] },
  { code: "kunafa-tray", engineKey: "tray", category: "food-packaging", nameAr: "صينية كنافة", nameEn: "Kunafa tray", descAr: "صينية مربعة للكنافة والحلويات الساخنة.", descEn: "A square tray for kunafa and hot desserts.", dims: [240, 240, 50], industries: ["dates", "bakery", "restaurants"] },
  { code: "oud-box", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة عود بدرج", nameEn: "Oud drawer box", descAr: "علبة فاخرة بدرج لدهن العود والعطور الشرقية.", descEn: "A luxury drawer box for oud oil and oriental perfumes.", dims: [140, 90, 60], industries: ["oud", "perfumes", "gifts"] },
  { code: "bakhoor-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة بخور", nameEn: "Bakhoor box", descAr: "علبة للبخور والمعمول المعطّر.", descEn: "A carton for bakhoor and scented incense.", dims: [100, 100, 60], industries: ["oud", "gifts"] },
  { code: "abaya-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة عباية", nameEn: "Abaya box", descAr: "علبة مسطحة كبيرة بغطاء للعبايات والشيلات.", descEn: "A large flat lidded box for abayas and scarves.", dims: [400, 300, 80], industries: ["fashion", "gifts"] },
  { code: "ramadan-gift-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة هدايا رمضان والعيد", nameEn: "Ramadan & Eid gift box", descAr: "علبة هدايا موسمية للتمور والحلويات والقهوة.", descEn: "A seasonal gift box for dates, sweets and coffee.", dims: [300, 220, 90], industries: ["gifts", "dates", "coffee"] },
  { code: "eid-mailer", engineKey: "mailer", category: "mailer-boxes", nameAr: "صندوق عيدية وهدايا", nameEn: "Eid gift mailer", descAr: "صندوق بغطاء متصل لهدايا العيد والتوصيل.", descEn: "A lidded mailer for Eid gifts and delivery.", dims: [250, 180, 80], industries: ["gifts", "ecommerce"] },
  { code: "corporate-gift-box", engineKey: "telescope", category: "gift-boxes", nameAr: "علبة هدايا الشركات", nameEn: "Corporate gift box", descAr: "علبة فاخرة لهدايا الموظفين والعملاء مع إسفنج داخلي.", descEn: "A premium box for employee and client gifts, with a foam insert.", dims: [320, 240, 100], industries: ["gifts"] },
  // more food
  { code: "cookie-box", engineKey: "telescope", category: "food-packaging", nameAr: "علبة كوكيز", nameEn: "Cookie box", descAr: "علبة بغطاء للكوكيز والبسكويت.", descEn: "A lidded box for cookies and biscuits.", dims: [200, 200, 60], industries: ["bakery", "gifts"] },
  { code: "cupcake-box", engineKey: "telescope", category: "food-packaging", nameAr: "علبة كب كيك", nameEn: "Cupcake box", descAr: "علبة لأربع أو ست قطع كب كيك مع حامل داخلي.", descEn: "A box for four or six cupcakes, with an insert.", dims: [250, 170, 100], industries: ["bakery"] },
  { code: "wrap-box", engineKey: "clamshell", category: "food-packaging", nameAr: "علبة شاورما وراب", nameEn: "Wrap & shawarma box", descAr: "علبة صدفية طويلة للشاورما والرابات.", descEn: "A long clamshell for shawarma and wraps.", dims: [210, 75, 60], industries: ["restaurants"] },
  { code: "hotdog-box", engineKey: "clamshell", category: "food-packaging", nameAr: "علبة هوت دوغ", nameEn: "Hot dog box", descAr: "علبة صدفية للهوت دوغ والساندويتشات الطويلة.", descEn: "A clamshell for hot dogs and long sandwiches.", dims: [190, 70, 60], industries: ["restaurants"] },
  { code: "kids-meal-box", engineKey: "mailer", category: "food-packaging", nameAr: "علبة وجبة أطفال", nameEn: "Kids meal box", descAr: "علبة ملونة بغطاء لوجبات الأطفال.", descEn: "A colourful lidded box for kids' meals.", dims: [200, 150, 90], industries: ["restaurants"] },
  // care, electronics, retail
  { code: "skincare-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة عناية بالبشرة", nameEn: "Skincare box", descAr: "علبة للسيروم والكريمات بتشطيب فاخر.", descEn: "A carton for serums and creams with a premium finish.", dims: [50, 50, 130], industries: ["cosmetics"] },
  { code: "hair-oil-box", engineKey: "rte", category: "folding-cartons", nameAr: "علبة زيت شعر", nameEn: "Hair oil box", descAr: "علبة للزيوت ومنتجات العناية بالشعر.", descEn: "A carton for oils and hair-care products.", dims: [60, 60, 170], industries: ["cosmetics"] },
  { code: "watch-box", engineKey: "drawer", category: "gift-boxes", nameAr: "علبة ساعة", nameEn: "Watch box", descAr: "علبة فاخرة بدرج للساعات والإكسسوارات.", descEn: "A luxury drawer box for watches and accessories.", dims: [120, 100, 80], industries: ["jewelry", "gifts"] },
  { code: "mug-box", engineKey: "rte", category: "folding-cartons", nameAr: "علبة كوب", nameEn: "Mug box", descAr: "علبة للأكواب والفناجين والهدايا.", descEn: "A carton for mugs, cups and gifts.", dims: [120, 95, 110], industries: ["coffee", "gifts", "retail"] },
  { code: "accessories-box", engineKey: "ste", category: "folding-cartons", nameAr: "علبة إكسسوارات الجوال", nameEn: "Phone accessories box", descAr: "علبة للشواحن والسماعات والكابلات.", descEn: "A carton for chargers, earphones and cables.", dims: [90, 40, 140], industries: ["electronics", "retail"] },
  { code: "book-mailer", engineKey: "mailer", category: "mailer-boxes", nameAr: "صندوق كتب", nameEn: "Book mailer", descAr: "صندوق مسطح لشحن الكتب والمطبوعات.", descEn: "A flat mailer for books and printed matter.", dims: [250, 180, 50], industries: ["ecommerce", "retail"] },
  { code: "archive-box", engineKey: "rsc", category: "shipping-boxes", nameAr: "صندوق أرشيف", nameEn: "Archive box", descAr: "صندوق لحفظ الملفات والأوراق.", descEn: "A box for storing files and documents.", dims: [380, 300, 270], industries: ["logistics", "retail"] },
  // paper cups: dims = top diameter, bottom diameter, height (common market sizes, approximate)
  { code: "cup-4oz", engineKey: "cup", category: "paper-cups", nameAr: "كوب إسبريسو 4 أونصة", nameEn: "4 oz espresso cup", descAr: "كوب صغير للإسبريسو والقهوة العربية.", descEn: "A small cup for espresso and Arabic coffee.", dims: [62, 45, 60], industries: ["coffee", "restaurants", "dates"], limits: [50, 75, 35, 55, 45, 75] },
  { code: "cup-8oz", engineKey: "cup", category: "paper-cups", nameAr: "كوب قهوة 8 أونصة", nameEn: "8 oz coffee cup", descAr: "الحجم الأكثر طلبًا للمشروبات الساخنة.", descEn: "The most popular size for hot drinks.", dims: [80, 56, 92], industries: ["coffee", "restaurants", "bakery"], limits: [70, 95, 45, 70, 75, 115] },
  { code: "cup-12oz", engineKey: "cup", category: "paper-cups", nameAr: "كوب قهوة 12 أونصة", nameEn: "12 oz coffee cup", descAr: "للاتيه والكابتشينو والمشروبات الكبيرة.", descEn: "For lattes, cappuccinos and larger drinks.", dims: [90, 60, 112], industries: ["coffee", "restaurants"], limits: [80, 100, 50, 72, 95, 135] },
  { code: "cup-16oz", engineKey: "cup", category: "paper-cups", nameAr: "كوب 16 أونصة", nameEn: "16 oz cup", descAr: "للمشروبات الباردة والعصائر والقهوة المثلجة.", descEn: "For cold drinks, juices and iced coffee.", dims: [90, 62, 135], industries: ["coffee", "restaurants"], limits: [80, 105, 50, 75, 115, 170] },
  // stickers & labels: sheet = width x height (thickness fixed at 1 mm), round = diameter
  { code: "round-sticker", engineKey: "round", category: "stickers-labels", nameAr: "استيكر دائري", nameEn: "Round sticker", descAr: "استيكر دائري بشعارك لإغلاق العلب والأكياس.", descEn: "A round logo sticker to seal boxes and bags.", dims: [50, 1, 1], industries: ["restaurants", "bakery", "coffee", "gifts", "ecommerce", "fashion", "perfumes"], limits: [20, 200, 1, 1, 1, 1] },
  { code: "seal-sticker", engineKey: "round", category: "stickers-labels", nameAr: "ستيكر إغلاق صغير", nameEn: "Small seal sticker", descAr: "ستيكر صغير لإغلاق العلب الفاخرة وأكياس الهدايا.", descEn: "A small sticker to seal premium boxes and gift bags.", dims: [30, 1, 1], industries: ["gifts", "perfumes", "jewelry", "dates"], limits: [15, 60, 1, 1, 1, 1] },
  { code: "square-label", engineKey: "sheet", category: "stickers-labels", nameAr: "ملصق مربع", nameEn: "Square label", descAr: "ملصق مربع للمنتجات والعبوات.", descEn: "A square label for products and packs.", dims: [60, 1, 60], industries: ["retail", "cosmetics", "bakery", "coffee"], limits: [20, 300, 1, 1, 20, 300] },
  { code: "product-label", engineKey: "sheet", category: "stickers-labels", nameAr: "ملصق منتج مستطيل", nameEn: "Rectangular product label", descAr: "ملصق للبرطمانات والعلب والزجاجات مع بيانات المنتج.", descEn: "A label for jars, boxes and bottles with product details.", dims: [90, 1, 50], industries: ["retail", "cosmetics", "dates", "coffee", "pharma"], limits: [20, 300, 1, 1, 15, 300] },
  { code: "sticker-sheet-a5", engineKey: "sheet", category: "stickers-labels", nameAr: "استيكر شيت A5", nameEn: "A5 sticker sheet", descAr: "شيت استيكرات بمقاس A5 لعدة ملصقات بتصميمك.", descEn: "An A5 sheet carrying several stickers of your design.", dims: [148, 1, 210], industries: ["ecommerce", "retail", "gifts"], limits: [100, 320, 1, 1, 100, 460] },
  // wrapping paper
  { code: "gift-wrap-sheet", engineKey: "sheet", category: "wrapping-paper", nameAr: "ورق لف هدايا 50×70", nameEn: "Gift wrap sheet 50x70", descAr: "ورق لف مطبوع بشعارك للهدايا والمتاجر.", descEn: "Logo-printed wrapping paper for gifts and shops.", dims: [500, 1, 700], industries: ["gifts", "fashion", "perfumes", "retail"], limits: [200, 1000, 1, 1, 200, 1400], materials: ["wrapping-white", "kraft-paper", "white-kraft-paper"] },
  { code: "food-wrap-paper", engineKey: "sheet", category: "wrapping-paper", nameAr: "ورق تغليف ساندويتش", nameEn: "Sandwich wrap paper", descAr: "ورق مقاوم للدهون مطبوع بشعارك للساندويتشات والبرجر.", descEn: "Greaseproof paper printed with your logo for sandwiches and burgers.", dims: [300, 1, 300], industries: ["restaurants", "bakery", "coffee"], limits: [150, 600, 1, 1, 150, 600], materials: ["greaseproof-paper", "wrapping-white"] },
  { code: "tissue-paper", engineKey: "sheet", category: "wrapping-paper", nameAr: "ورق تيشو مطبوع", nameEn: "Printed tissue paper", descAr: "ورق خفيف لتغليف الملابس والهدايا داخل العلب.", descEn: "Light paper to wrap garments and gifts inside boxes.", dims: [500, 1, 750], industries: ["fashion", "gifts", "ecommerce"], limits: [300, 1000, 1, 1, 300, 1400], materials: ["wrapping-white", "white-kraft-paper"] },
  { code: "plant-box", engineKey: "rsc", category: "shipping-boxes", nameAr: "صندوق نباتات وزهور", nameEn: "Plant & flower box", descAr: "صندوق طويل لشحن النباتات والزهور.", descEn: "A tall box for shipping plants and flowers.", dims: [200, 200, 450], industries: ["gifts", "ecommerce"] },
];
const EXISTING_INDUSTRIES: Record<string, string[]> = {
  "shipping-carton": ["logistics", "ecommerce", "retail"],
  "mailer-box": ["ecommerce", "fashion", "cosmetics"],
  "folding-carton": ["retail", "cosmetics", "pharma"],
  "pizza-box": ["restaurants"],
  "paper-bag": ["retail", "fashion"],
  "food-tray": ["restaurants", "bakery", "retail"],
};
const provisionalLimits = ([l, w, h]: [number, number, number]) => [
  Math.max(20, Math.round(l * 0.4)),
  Math.round(l * 2.2),
  Math.max(20, Math.round(w * 0.4)),
  Math.round(w * 2.2),
  Math.max(15, Math.round(h * 0.4)),
  Math.round(h * 2.2),
];
const MORE_TEMPLATES = CATALOG.map((t) => ({
  code: t.code,
  engineKey: t.engineKey,
  category: t.category,
  nameAr: t.nameAr,
  nameEn: t.nameEn,
  descriptionAr: t.descAr,
  descriptionEn: t.descEn,
  limits: t.limits ?? provisionalLimits(t.dims),
  defaults: t.dims,
  materials: t.materials ?? ENGINE_MATERIALS[t.engineKey],
  print: ["none", "1c", "2c", "4c"],
  openTop: OPEN_TOP_ENGINES.includes(t.engineKey),
  frontOnly: FRONT_ONLY_ENGINES.includes(t.engineKey),
  industries: t.industries,
}));

const FAQ = [
  {
    questionAr: "هل يظهر السعر تلقائياً بعد التصميم؟",
    questionEn: "Is the price shown automatically after designing?",
    answerAr: "لا. يراجع فريق المصنع كل طلب فنياً ثم يرسل عرض سعر معتمداً عبر حسابك.",
    answerEn: "No. The factory team reviews each request technically and then sends an approved quotation to your account.",
  },
  {
    questionAr: "هل الملف الناتج من الاستوديو جاهز للإنتاج مباشرة؟",
    questionEn: "Is the studio output ready for production?",
    answerAr: "المعاينة دقيقة من حيث الأبعاد بصرياً، لكن ملف القص النهائي يُعدّه ويعتمده الفريق الفني للمصنع.",
    answerEn: "The preview is visually dimension-accurate, but the final cutting file is prepared and approved by the factory's technical team.",
  },
  {
    questionAr: "ما صيغ الشعارات المدعومة؟",
    questionEn: "Which logo formats are supported?",
    answerAr: "PNG وJPEG وSVG. للحصول على أفضل نتيجة استخدم SVG أو صورة بدقة 300 نقطة لكل بوصة بالحجم المطبوع.",
    answerEn: "PNG, JPEG and SVG. For best results use SVG or an image at 300 dpi at its printed size.",
  },
  {
    questionAr: "هل تطابق الألوان على الشاشة الطباعة النهائية؟",
    questionEn: "Do on-screen colours match the final print?",
    answerAr: "الألوان على الشاشة تقريبية وتختلف حسب الخامة وطريقة الطباعة. يمكن تحديد مواصفات الألوان مع فريق المبيعات.",
    answerEn: "On-screen colours are approximate and depend on material and print process. Colour specifications can be agreed with our sales team.",
  },
];

const CONTENT: { key: string; valueAr: string; valueEn: string }[] = [
  // from the official company profile (contact page)
  { key: "contact.phone", valueAr: "+966 50 666 5098", valueEn: "+966 50 666 5098" },
  { key: "contact.phone2", valueAr: "+966 54 407 1540", valueEn: "+966 54 407 1540" },
  { key: "contact.email", valueAr: "info@sunriselight.sa", valueEn: "info@sunriselight.sa" },
  { key: "contact.email2", valueAr: "sales@sunriselight.sa", valueEn: "sales@sunriselight.sa" },
  { key: "contact.whatsapp", valueAr: "", valueEn: "" },
  { key: "contact.address", valueAr: "الرياض – المعيقلية الرابعة – الدور الثالث – مكتب 315 د", valueEn: "Riyadh – Al-Moaqelia Fourth – 3rd floor – Office 315 D" },
  { key: "contact.map", valueAr: "https://maps.app.goo.gl/ky49uv4T2iLber96A", valueEn: "https://maps.app.goo.gl/ky49uv4T2iLber96A" },
  { key: "contact.hours", valueAr: "", valueEn: "" },
  {
    key: "about.body",
    valueAr:
      "مصنع ضوء الشروق للكرتون والتغليف — فريق كامل يعمل من أجل خدمتكم.\n\nنصنع ونطبع العبوات الكرتونية والورقية حسب الطلب: كرتون الإنفركوت والمضلّع والكرافت والدمج والهارد كفر، والأكياس الكرافت والإنفركوت، والاستيكر رول والشيت، وورق اللف.\n\nومن خلال منصتنا الرقمية يصمّم عملاؤنا عبواتهم بأنفسهم ويعاينونها قبل التصنيع، ثم يراجع فريقنا كل طلب ويرسل عرض السعر.",
    valueEn:
      "Sunrise Light Packaging Factory — a complete team working to serve you.\n\nWe manufacture and print custom cardboard and paper packaging: Invercote, corrugated, kraft, merge and hard-cover boxes; kraft and Invercote bags; sticker rolls and sheets; and wrapping paper.\n\nThrough our digital platform customers design and preview their packaging before production; our team then reviews every request and sends the quotation.",
  },
  {
    key: "services.body",
    valueAr: "نصنع ونطبع العبوات حسب الطلب بشعارك وتصميمك: علب وكراتين بأنواعها، أكياس ورقية، استيكرات، وورق لف. صمّم عبوتك في الاستوديو أو تواصل معنا مباشرة لطلب عرض سعر.",
    valueEn: "We manufacture and print packaging to order with your logo and design: boxes and cartons of every kind, paper bags, stickers and wrapping paper. Design your box in the studio or contact us directly for a quotation.",
  },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await db.packagingCategory.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } });
  }
  for (const m of MATERIALS) {
    await db.materialType.upsert({
      where: { code: m.code },
      update: {},
      create: { ...m, thickness: "", factoryApproved: false, limitationsAr: "تؤكَّد المواصفات من المصنع", limitationsEn: "Specifications to be confirmed by the factory" },
    });
  }
  for (const [i, f] of FINISHINGS.entries()) {
    await db.finishingOption.upsert({ where: { code: f.code }, update: {}, create: { ...f, sortOrder: i } });
  }
  const allMaterials = await db.materialType.findMany();
  const allFinishings = await db.finishingOption.findMany();
  for (const m of allMaterials) {
    for (const f of allFinishings) {
      await db.materialFinishing.upsert({ where: { materialId_finishingId: { materialId: m.id, finishingId: f.id } }, update: {}, create: { materialId: m.id, finishingId: f.id } });
    }
  }

  // rename foil to the trade term (البصمة); other seeded rows are left as admins edited them
  await db.finishingOption.update({ where: { code: "hot-foil" }, data: { nameAr: "بصمة فويل (ذهبي / فضي)", nameEn: "Hot foil stamping (gold / silver)" } }).catch(() => undefined);

  for (const t of [
    ...TEMPLATES.map((x) => ({ ...x, openTop: false, frontOnly: false, industries: EXISTING_INDUSTRIES[x.code] ?? [] })),
    ...FOOD_AND_BAGS.map((x) => ({ ...x, frontOnly: false, industries: EXISTING_INDUSTRIES[x.code] ?? [] })),
    ...MORE_TEMPLATES,
  ]) {
    const existing = await db.packagingTemplate.findUnique({ where: { code: t.code } });
    if (existing) {
      // only fill industry tags if an admin hasn't set any
      if (!existing.industries.length) await db.packagingTemplate.update({ where: { id: existing.id }, data: { industries: t.industries } });
      continue;
    }
    const category = await db.packagingCategory.findUniqueOrThrow({ where: { slug: t.category } });
    await db.$transaction(async (tx) => {
      const tpl = await tx.packagingTemplate.create({
        data: { code: t.code, engineKey: t.engineKey, categoryId: category.id, nameAr: t.nameAr, nameEn: t.nameEn, descriptionAr: t.descriptionAr, descriptionEn: t.descriptionEn, industries: t.industries },
      });
      const [minL, maxL, minW, maxW, minH, maxH] = t.limits;
      const [dL, dW, dH] = t.defaults;
      const v = await tx.templateVersion.create({
        data: {
          templateId: tpl.id,
          version: 1,
          minLengthMm: minL,
          maxLengthMm: maxL,
          minWidthMm: minW,
          maxWidthMm: maxW,
          minHeightMm: minH,
          maxHeightMm: maxH,
          defaultLengthMm: dL,
          defaultWidthMm: dW,
          defaultHeightMm: dH,
          safeMarginMm: 5,
          dielineValidated: false,
          constraints: { note: "System default limits — to be confirmed by the factory" },
          printOptions: t.print,
          panels: { create: SURFACES.filter((s) => (t.frontOnly ? s.key === "front" : !(t.openTop && s.key === "top"))).map((s) => ({ ...s, printable: true })) },
        },
      });
      await tx.packagingTemplate.update({ where: { id: tpl.id }, data: { currentVersionId: v.id } });
      // a category becomes designable once it has its first template
      await tx.packagingCategory.update({ where: { id: category.id }, data: { status: "ACTIVE" } });
      for (const code of t.materials) {
        const m = allMaterials.find((x) => x.code === code)!;
        await tx.templateMaterialRule.create({ data: { templateId: tpl.id, materialId: m.id } });
      }
    });
  }

  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({ data: FAQ.map((f, i) => ({ ...f, sortOrder: i })) });
  }
  for (const c of CONTENT) await db.websiteContent.upsert({ where: { key: c.key }, update: {}, create: c });

  await db.pricingRule.upsert({
    where: { key: "base-model" },
    update: {},
    create: {
      key: "base-model",
      isActive: false,
      config: {
        note: "Inactive placeholder. Automatic pricing stays disabled until the factory provides validated rules.",
        factors: ["material", "boardAreaM2", "quantity", "printColors", "finishing", "dieTooling", "setup", "wastePercent", "delivery", "taxPercent"],
      },
    },
  });

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  // First-administrator provisioning only: never overwrites an existing account, never adds a second
  // super admin, and refuses a weak or example password when seeding a production database.
  if (email && password) {
    const production = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
    const admins = await db.user.count({ where: { role: "SUPER_ADMIN" } });
    if (existing) {
      console.log(`Super admin ${email} already exists — password unchanged.`);
    } else if (admins > 0) {
      console.log("A super admin already exists — SEED_ADMIN_* ignored. Create further staff from Admin → Users.");
    } else {
      const weak = passwordProblem(password, { email, minLength: production ? 14 : 8 });
      if (weak) {
        if (production) throw new Error(`Refusing to create the first super admin in production: SEED_ADMIN_PASSWORD rejected (${weak}).`);
        console.warn(`Warning: SEED_ADMIN_PASSWORD is weak (${weak}) — fine for local development only.`);
      }
      await db.user.create({ data: { email: email.toLowerCase(), name: "Super Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
      console.log(`Super admin created: ${email} — change the password after the first sign-in and enable two-step verification.`);
    }
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
