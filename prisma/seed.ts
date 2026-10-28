/**
 * Seed reference data. Values marked "system default" are editable placeholders for the
 * factory to confirm — they are NOT verified production capabilities.
 */
import { PrismaClient, type MaterialKind } from "@prisma/client";
import bcrypt from "bcryptjs";

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
] as const;

const MATERIALS: { code: string; nameAr: string; nameEn: string; kind: MaterialKind; colorHex: string; sortOrder: number }[] = [
  { code: "corrugated-kraft", nameAr: "كرتون مموج كرافت", nameEn: "Corrugated kraft board", kind: "CORRUGATED", colorHex: "#B78B59", sortOrder: 1 },
  { code: "corrugated-white", nameAr: "كرتون مموج أبيض", nameEn: "Corrugated white-top board", kind: "CORRUGATED", colorHex: "#EEEAE2", sortOrder: 2 },
  { code: "kraft-board", nameAr: "كرتون كرافت", nameEn: "Kraft board", kind: "KRAFT", colorHex: "#C49A68", sortOrder: 3 },
  { code: "white-board", nameAr: "كرتون أبيض", nameEn: "White board", kind: "WHITE", colorHex: "#F5F3EE", sortOrder: 4 },
  { code: "duplex-board", nameAr: "كرتون دوبلكس", nameEn: "Duplex board", kind: "DUPLEX", colorHex: "#ECE9E3", sortOrder: 5 },
];

const FINISHINGS = [
  { code: "none", nameAr: "بدون تشطيب", nameEn: "No finishing" },
  { code: "matte-varnish", nameAr: "ورنيش مطفي", nameEn: "Matte varnish" },
  { code: "gloss-varnish", nameAr: "ورنيش لامع", nameEn: "Gloss varnish" },
  { code: "matte-lamination", nameAr: "سلوفان مطفي", nameEn: "Matte lamination" },
  { code: "gloss-lamination", nameAr: "سلوفان لامع", nameEn: "Gloss lamination" },
  { code: "spot-uv", nameAr: "يو في موضعي", nameEn: "Spot UV" },
  { code: "hot-foil", nameAr: "طباعة فويل", nameEn: "Hot foil stamping" },
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
  { key: "contact.phone", valueAr: "", valueEn: "" },
  { key: "contact.email", valueAr: "", valueEn: "" },
  { key: "contact.whatsapp", valueAr: "", valueEn: "" },
  { key: "contact.address", valueAr: "", valueEn: "" },
  { key: "contact.hours", valueAr: "", valueEn: "" },
  {
    key: "about.body",
    valueAr: "مصنع ضوء الشروق متخصص في تصنيع وطباعة العبوات الكرتونية والورقية حسب الطلب، ويقدّم لعملائه منصة رقمية لتصميم العبوة ومعاينتها قبل التصنيع.",
    valueEn: "Sunrise Light manufactures and prints custom cardboard and paper packaging, and offers customers a digital platform to design and preview their packaging before manufacturing.",
  },
  {
    key: "services.body",
    valueAr: "تصنيع الكراتين المموجة، علب المنتجات، صناديق التجارة الإلكترونية، والطباعة على العبوات. تُحدّث تفاصيل الخدمات من لوحة الإدارة.",
    valueEn: "Corrugated cartons, product cartons, e-commerce mailers and packaging printing. Service details are maintained from the admin dashboard.",
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

  for (const t of TEMPLATES) {
    const existing = await db.packagingTemplate.findUnique({ where: { code: t.code } });
    if (existing) continue;
    const category = await db.packagingCategory.findUniqueOrThrow({ where: { slug: t.category } });
    await db.$transaction(async (tx) => {
      const tpl = await tx.packagingTemplate.create({
        data: { code: t.code, engineKey: t.engineKey, categoryId: category.id, nameAr: t.nameAr, nameEn: t.nameEn, descriptionAr: t.descriptionAr, descriptionEn: t.descriptionEn },
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
          panels: { create: SURFACES.map((s) => ({ ...s, printable: true })) },
        },
      });
      await tx.packagingTemplate.update({ where: { id: tpl.id }, data: { currentVersionId: v.id } });
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
  if (email && password) {
    await db.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: { email: email.toLowerCase(), name: "Super Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Super admin ready: ${email}`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
