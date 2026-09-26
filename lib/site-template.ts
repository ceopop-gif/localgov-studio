import {
  getDefaultHomepageConfig,
  getHomepageConfig,
} from "@/lib/homepage-config";
import type { SiteRecord } from "@/lib/models";

export const SERVICE_OPTIONS = [
  { id: "lighting", label: "ไฟส่องสว่าง" },
  { id: "road", label: "ถนนชำรุด" },
  { id: "water", label: "น้ำประปา" },
  { id: "waste", label: "ขยะ" },
  { id: "complaint", label: "ร้องเรียนทั่วไป" },
  { id: "construction", label: "ก่อสร้าง" },
  { id: "tax", label: "ภาษี" },
  { id: "welfare", label: "สวัสดิการ" },
] as const;
export const SECTION_OPTIONS = [
  { id: "services", label: "บริการประชาชน" },
  { id: "process", label: "ขั้นตอนแจ้งเรื่อง" },
  { id: "news", label: "ข่าว / จัดซื้อจัดจ้าง / ITA" },
  { id: "about", label: "รู้จักหน่วยงาน" },
  { id: "transparency", label: "ข้อมูลเปิดเผย" },
  { id: "contact", label: "ติดต่อและแผนที่" },
] as const;
export type SectionKey = (typeof SECTION_OPTIONS)[number]["id"];
export const DEFAULT_SECTIONS = Object.fromEntries(
  SECTION_OPTIONS.map((x) => [x.id, true]),
) as Record<SectionKey, boolean>;
export function templateOptions(source?: SiteRecord) {
  const config = getHomepageConfig(source?.homepageJson, source);
  let services: string[] = SERVICE_OPTIONS.map((x) => x.id);
  if (source)
    try {
      const parsed: unknown = JSON.parse(source.servicesJson);
      if (Array.isArray(parsed))
        services = parsed.filter((id): id is string =>
          SERVICE_OPTIONS.some((x) => x.id === id),
        );
    } catch {
      /* A legacy malformed value uses the standard service set. */
    }
  return {
    services,
    sections: Object.fromEntries(
      SECTION_OPTIONS.map((x) => [x.id, config[x.id].visible]),
    ) as Record<SectionKey, boolean>,
  };
}

type SiteInput = Pick<
  SiteRecord,
  | "name"
  | "englishName"
  | "slug"
  | "organizationType"
  | "province"
  | "district"
  | "subdistrict"
  | "address"
  | "phone"
  | "email"
  | "vision"
  | "logoUrl"
  | "primaryColor"
  | "secondaryColor"
> & { services: string[]; sections: Record<SectionKey, boolean> };
// Copy presentation only. Agency identity, content, requests, members and sessions
// are never inherited from the source site.
export function buildSiteFromTemplate(input: SiteInput, source?: SiteRecord) {
  const { services, sections, ...identity } = input;
  const homepage = getDefaultHomepageConfig(identity);
  if (source) {
    const original = getHomepageConfig(source.homepageJson, source);
    for (const key of [
      "hero",
      "services",
      "news",
      "about",
      "transparency",
      "contact",
    ] as const) {
      homepage[key].imageUrl = /สูงเนิน|sung.?noen/i.test(original[key].imageUrl) ? homepage[key].imageUrl : original[key].imageUrl;
      if (homepage[key].imageUrl && !homepage[key].imageAlt)
        homepage[key].imageAlt = "ภาพประกอบหน่วยงาน";
      // Image descriptions may contain the former agency's name; use new defaults.
    }
  }
  for (const key of SECTION_OPTIONS.map((x) => x.id))
    homepage[key].visible = sections[key];
  const completeness = Math.min(
    100,
    18 +
      [
        input.province,
        input.district,
        input.subdistrict,
        input.englishName,
        input.address,
        input.phone,
        input.email,
        input.logoUrl,
        input.vision,
      ].filter(Boolean).length *
        7,
  );
  return {
    ...identity,
    status: "draft" as const,
    completeness,
    servicesJson: JSON.stringify([...new Set(services)]),
    homepageJson: JSON.stringify(homepage),
  };
}
