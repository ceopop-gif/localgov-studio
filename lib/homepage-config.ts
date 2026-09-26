import { z } from "zod";
import type { SiteRecord } from "@/lib/models";

const shortText = z.string().trim().min(1).max(160);
const bodyText = z.string().trim().min(1).max(1200);
const imageUrl = z
  .string()
  .trim()
  .max(600)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/api/media/") ||
      value.startsWith("/graphics/") ||
      /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(value),
    "รูปแบบ URL รูปภาพไม่ถูกต้อง",
  );

const titleAndText = z.object({
  title: shortText,
  text: z.string().trim().min(1).max(400),
});

export const homepageConfigSchema = z.object({
  header: z.object({
    phoneLabel: shortText,
    mobileDescription: shortText,
    navigation: z.object({
      home: shortText,
      services: shortText,
      news: shortText,
      transparency: shortText,
      about: shortText,
      contact: shortText,
    }),
  }),
  hero: z.object({
    badge: shortText,
    title: shortText,
    highlight: shortText,
    description: bodyText,
    searchPlaceholder: shortText,
    primaryButton: shortText,
    secondaryButton: shortText,
    trackingTitle: shortText,
    trackingText: z.string().trim().min(1).max(300),
    imageUrl,
    imageAlt: z.string().trim().min(1).max(300),
  }),
  quickActions: z.tuple([
    titleAndText,
    titleAndText,
    titleAndText,
    titleAndText,
  ]),
  services: z.object({
    visible: z.boolean(),
    imageUrl,
    imageAlt: z.string().trim().max(300),
    eyebrow: shortText,
    title: shortText,
    description: z.string().trim().min(1).max(500),
    badge: shortText,
    actionText: shortText,
    emptyText: shortText,
    labels: z.object({
      lighting: shortText,
      road: shortText,
      water: shortText,
      waste: shortText,
      complaint: shortText,
      construction: shortText,
      tax: shortText,
      welfare: shortText,
    }),
  }),
  process: z.object({
    visible: z.boolean(),
    badge: shortText,
    title: shortText,
    description: z.string().trim().min(1).max(500),
    steps: z.tuple([titleAndText, titleAndText, titleAndText]),
  }),
  news: z.object({
    visible: z.boolean(),
    imageUrl,
    imageAlt: z.string().trim().max(300),
    eyebrow: shortText,
    title: shortText,
    description: z.string().trim().min(1).max(500),
    allText: shortText,
    newsTab: shortText,
    procurementTab: shortText,
    transparencyTab: shortText,
    newsEmpty: shortText,
    procurementEmpty: shortText,
    transparencyEmpty: shortText,
    latestBadge: shortText,
    cardFallbackText: shortText,
    readMoreText: shortText,
    emptyDescription: z.string().trim().min(1).max(300),
  }),
  about: z.object({
    visible: z.boolean(),
    badge: shortText,
    visionText: bodyText,
    locationFallback: shortText,
    imageUrl,
    imageAlt: z.string().trim().max(300),
    values: z.tuple([titleAndText, titleAndText, titleAndText]),
  }),
  transparency: z.object({
    visible: z.boolean(),
    imageUrl,
    imageAlt: z.string().trim().max(300),
    badge: shortText,
    title: shortText,
    description: z.string().trim().min(1).max(500),
    items: z.tuple([shortText, shortText, shortText, shortText]),
  }),
  contact: z.object({
    officeLocation: z.object({ latitude: z.string().max(30), longitude: z.string().max(30), postalCode: z.string().max(5) }).optional(),
    visible: z.boolean(),
    mapTitle: shortText,
    mapDescription: z.string().trim().min(1).max(500),
    mapButton: shortText,
    eyebrow: shortText,
    callButton: shortText,
    addressLabel: shortText,
    phoneLabel: shortText,
    emailLabel: shortText,
    missingValueText: shortText,
    mapMissingText: shortText,
    imageUrl,
    imageAlt: z.string().trim().max(300),
  }),
  footer: z.object({
    description: z.string().trim().min(1).max(400),
    privacyLabel: shortText,
    cookieLabel: shortText,
    sitemapLabel: shortText,
    staffLabel: shortText,
  }),
});

export type HomepageConfig = z.infer<typeof homepageConfigSchema>;

export function getDefaultHomepageConfig(
  site?: Pick<SiteRecord, "vision"> &
    Partial<Pick<SiteRecord, "name" | "organizationType">>,
): HomepageConfig {
  const agency = site?.organizationType?.includes("องค์การบริหาร")
    ? "อบต."
    : site?.organizationType?.includes("เทศบาล")
      ? "เทศบาล"
      : "หน่วยงาน";
  return {
    header: {
      phoneLabel: `โทรหา${agency}`,
      mobileDescription: "บริการ ข่าวสาร และข้อมูลใกล้ตัว",
      navigation: {
        home: "หน้าหลัก",
        services: "แจ้งปัญหา",
        news: "ข่าวชุมชน",
        transparency: "ข้อมูลเปิดเผย",
        about: "รู้จักเรา",
        contact: "ติดต่อเรา",
      },
    },
    hero: {
      badge: "บริการประชาชน • ใกล้บ้าน • ติดตามได้",
      title: "แจ้งเรื่องง่าย",
      highlight: "เช็กได้ รู้ผลทุกขั้นตอน",
      description:
        "เรื่องถนน ไฟส่องสว่าง น้ำ ขยะ ภาษี หรือสวัสดิการ เริ่มทำได้ตรงนี้ ไม่ต้องค้นหาเมนูราชการให้ยุ่งยาก",
      searchPlaceholder: "พิมพ์เรื่องที่ต้องการ เช่น ขยะ ไฟถนน",
      primaryButton: "แจ้งปัญหาตอนนี้",
      secondaryButton: "เช็กเรื่องที่แจ้ง",
      trackingTitle: "ทุกคำร้องมีเลขติดตาม",
      trackingText: "รู้ว่าเรื่องถึงไหน และอยู่กับหน่วยงานใด",
      imageUrl: "/graphics/community-service-hero.webp",
      imageAlt:
        "ภาพประกอบชาวบ้านหลายวัยใช้บริการหน่วยงานท้องถิ่นผ่านโทรศัพท์มือถือ",
    },
    quickActions: [
      {
        title: "แจ้งปัญหาในชุมชน",
        text: "ถ่ายรูป บอกจุดเกิดเหตุ ส่งถึงเจ้าหน้าที่",
      },
      { title: "เช็กเรื่องที่แจ้ง", text: "ดูสถานะด้วยเลขรับเรื่องได้ทุกเวลา" },
      { title: "แบบฟอร์มประชาชน", text: "ค้นหาคู่มือและเอกสารที่ต้องใช้" },
      { title: `โทรหา${agency}`, text: "ดูข้อมูลติดต่อหน่วยงาน" },
    ],
    services: {
      visible: true,
      imageUrl: "/graphics/services-community.webp",
      imageAlt:
        "ภาพประกอบชาวบ้านใช้บริการหน่วยงานท้องถิ่นและแจ้งปัญหาชุมชนผ่านโทรศัพท์",
      eyebrow: "เรื่องใกล้บ้าน ทำออนไลน์ได้",
      title: "เลือกเรื่องที่ต้องการแจ้ง",
      description: "กดที่เรื่องนั้น กรอกรายละเอียด แล้วรับเลขติดตามทันที",
      badge: "ใช้เวลาเพียงไม่กี่นาที",
      actionText: "เริ่มแจ้งเรื่อง",
      emptyText: "ไม่พบบริการที่ค้นหา",
      labels: {
        lighting: "แจ้งไฟส่องสว่าง",
        road: "แจ้งถนนชำรุด",
        water: "แจ้งน้ำประปา",
        waste: "แจ้งขยะ",
        complaint: "ร้องเรียนทั่วไป",
        construction: "ขออนุญาตก่อสร้าง",
        tax: "ตรวจสอบภาษี",
        welfare: "ลงทะเบียนสวัสดิการ",
      },
    },
    process: {
      visible: true,
      badge: "ง่าย 3 ขั้นตอน",
      title: `ไม่ต้องเดินทางมา${agency}`,
      description:
        "เริ่มแจ้งเรื่องผ่านมือถือได้ทุกที่ และกลับมาเช็กความคืบหน้าได้ด้วยตัวเอง",
      steps: [
        { title: "เลือกเรื่อง", text: "เลือกบริการที่ตรงกับปัญหา" },
        { title: "ส่งรายละเอียด", text: "บอกจุดเกิดเหตุและแนบข้อมูล" },
        { title: "รับเลขติดตาม", text: "เช็กสถานะได้จนงานเสร็จ" },
      ],
    },
    news: {
      visible: true,
      imageUrl: "/graphics/news-community.webp",
      imageAlt: "ภาพประกอบประชาชนหลายวัยติดตามข่าวสารและกิจกรรมในชุมชน",
      eyebrow: "ข่าวชุมชน อ่านแล้วรู้เรื่อง",
      title: `เรื่องใหม่จาก${agency}`,
      description:
        "ข่าว ประกาศ จัดซื้อจัดจ้าง และข้อมูลโปร่งใส รวมไว้ในที่เดียว",
      allText: "ดูข่าวทั้งหมด",
      newsTab: "ข่าวล่าสุด",
      procurementTab: "จัดซื้อจัดจ้าง",
      transparencyTab: "ITA / OIT",
      newsEmpty: "ยังไม่มีข่าวที่เผยแพร่",
      procurementEmpty: "ยังไม่มีประกาศจัดซื้อจัดจ้างที่เผยแพร่",
      transparencyEmpty: "ยังไม่มีข้อมูล ITA / OIT ที่เผยแพร่",
      latestBadge: "ข่าวใหม่",
      cardFallbackText: "อ่านรายละเอียดและเอกสารแนบ",
      readMoreText: "อ่านต่อ",
      emptyDescription:
        "เมื่อเจ้าหน้าที่เผยแพร่ข้อมูล รายการล่าสุดจะแสดงที่นี่ทันที",
    },
    about: {
      visible: true,
      badge: `วิสัยทัศน์ของ${agency}`,
      visionText: site?.vision || "ข้อมูลวิสัยทัศน์รอการตรวจสอบจากหน่วยงาน",
      locationFallback: "ข้อมูลพื้นที่รอตรวจสอบ",
      imageUrl: "",
      imageAlt: "",
      values: [
        { title: "เมืองน่าอยู่", text: "สะอาด เป็นระเบียบ และปลอดภัย" },
        { title: "บริการเท่าเทียม", text: "ประชาชนเข้าถึงบริการได้ง่าย" },
        { title: "ทันสมัย โปร่งใส", text: "ใช้เทคโนโลยีเพื่อบริการที่ดีขึ้น" },
      ],
    },
    transparency: {
      visible: true,
      imageUrl: "/graphics/transparency-community.webp",
      imageAlt:
        "ภาพประกอบเจ้าหน้าที่นำเสนอข้อมูลแผนงานและงบประมาณให้ประชาชนตรวจสอบ",
      badge: "ข้อมูลโปร่งใส ตรวจสอบได้",
      title: "เอกสารราชการ หาให้ง่าย ไม่ต้องเปิดหลายหน้า",
      description:
        "แผนงาน งบประมาณ จัดซื้อจัดจ้าง กฎหมาย และผลการดำเนินงาน จัดหมวดตามปีงบประมาณอย่างชัดเจน",
      items: [
        "แผนงานและงบประมาณ",
        "จัดซื้อจัดจ้าง",
        "ITA / OIT",
        "กฎหมายและคู่มือ",
      ],
    },
    contact: {
      officeLocation: { latitude: "", longitude: "", postalCode: "" },
      visible: true,
      mapTitle: `มา${agency}ไม่ถูก?`,
      mapDescription: "เปิดเส้นทางจากที่อยู่ของหน่วยงานได้ทันที",
      mapButton: "เปิดแผนที่",
      eyebrow: "ติดต่อหน่วยงาน",
      callButton: `โทรหา${agency}`,
      addressLabel: "ที่อยู่",
      phoneLabel: "โทรศัพท์",
      emailLabel: "อีเมล",
      missingValueText: "ต้องตรวจสอบ",
      mapMissingText: "พิกัดแผนที่ต้องตรวจสอบในหลังบ้าน",
      imageUrl: "",
      imageAlt: "",
    },
    footer: {
      description: "บริการประชาชน ข่าวสาร และข้อมูลเปิดเผยในที่เดียว",
      privacyLabel: "นโยบายความเป็นส่วนตัว",
      cookieLabel: "นโยบายคุกกี้",
      sitemapLabel: "แผนผังเว็บไซต์",
      staffLabel: "สำหรับเจ้าหน้าที่",
    },
  };
}

function mergeConfig(base: unknown, override: unknown): unknown {
  if (Array.isArray(base)) {
    if (!Array.isArray(override) || override.length !== base.length)
      return base;
    return base.map((item, index) => mergeConfig(item, override[index]));
  }
  if (base && typeof base === "object") {
    const candidate =
      override && typeof override === "object"
        ? (override as Record<string, unknown>)
        : {};
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        mergeConfig(value, candidate[key]),
      ]),
    );
  }
  return typeof override === typeof base ? override : base;
}

export function getHomepageConfig(
  homepageJson: string | null | undefined,
  site?: Pick<SiteRecord, "vision"> &
    Partial<Pick<SiteRecord, "name" | "organizationType">>,
): HomepageConfig {
  const defaults = getDefaultHomepageConfig(site);
  if (!homepageJson) return defaults;
  try {
    const parsed = JSON.parse(homepageJson) as unknown;
    const merged = mergeConfig(defaults, parsed);
    const result = homepageConfigSchema.safeParse(merged);
    return result.success ? result.data : defaults;
  } catch {
    return defaults;
  }
}
