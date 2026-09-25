import { z } from "zod";
import { homepageConfigSchema } from "@/lib/homepage-config";
import { isSupportedYouTubeUrl } from "@/lib/content-media";

const siteAssetUrlSchema = z
  .string()
  .trim()
  .max(600)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/api/media/") ||
      value.startsWith("/graphics/") ||
      /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(value),
  );

export const createSiteSchema = z.object({
  name: z.string().trim().min(3).max(160),
  englishName: z.string().trim().max(160).optional().default(""),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  organizationType: z.enum([
    "องค์การบริหารส่วนตำบล",
    "เทศบาลตำบล",
    "เทศบาลเมือง",
    "เทศบาลนคร",
  ]),
  province: z.string().trim().max(100).optional().default(""),
  district: z.string().trim().max(100).optional().default(""),
  subdistrict: z.string().trim().max(100).optional().default(""),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0B5260"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#E4B949"),
});

export const updateSiteSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    englishName: z.string().trim().max(160).optional(),
    province: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    subdistrict: z.string().trim().max(100).optional(),
    address: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(50).optional(),
    email: z.string().trim().email().or(z.literal("")).optional(),
    vision: z.string().trim().max(1000).optional(),
    logoUrl: siteAssetUrlSchema.optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    services: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    homepage: homepageConfigSchema.optional(),
    status: z.enum(["draft", "published", "maintenance"]).optional(),
  })
  .strict();

export const createContentSchema = z.object({
  type: z.enum([
    "news",
    "announcement",
    "procurement",
    "ita",
    "service",
    "project",
    "page",
    "article",
  ]),
  title: z.string().trim().min(5).max(240),
  excerpt: z.string().trim().max(500).optional().default(""),
  body: z.string().trim().max(30000).optional().default(""),
  category: z.string().trim().min(2).max(100),
  fiscalYear: z.number().int().min(2500).max(2700).nullable().optional(),
  status: z.enum(["draft", "review", "approved", "published"]).default("draft"),
  coverUrl: siteAssetUrlSchema.optional().default(""),
  galleryUrls: z.array(siteAssetUrlSchema).max(5).optional().default([]),
  youtubeUrl: z.string().trim().max(500).refine(isSupportedYouTubeUrl, "ลิงก์ YouTube ไม่ถูกต้อง").optional().default(""),
  attachmentUrl: siteAssetUrlSchema.optional().default(""),
  attachmentName: z.string().trim().max(255).optional().default(""),
});

export const updateContentSchema = z
  .object({
    title: z.string().trim().min(5).max(240).optional(),
    excerpt: z.string().trim().max(500).optional(),
    body: z.string().trim().max(30000).optional(),
    category: z.string().trim().min(2).max(100).optional(),
    fiscalYear: z.number().int().min(2500).max(2700).nullable().optional(),
    status: z.enum(["draft", "review", "approved", "published", "archived"]).optional(),
    coverUrl: siteAssetUrlSchema.optional(),
    galleryUrls: z.array(siteAssetUrlSchema).max(5).optional(),
    youtubeUrl: z.string().trim().max(500).refine(isSupportedYouTubeUrl, "ลิงก์ YouTube ไม่ถูกต้อง").optional(),
    attachmentUrl: siteAssetUrlSchema.optional(),
    attachmentName: z.string().trim().max(255).optional(),
  })
  .strict();

export const createRequestSchema = z.object({
  siteSlug: z.string().trim().min(3).max(60),
  requestType: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().or(z.literal("")).optional().default(""),
  details: z.string().trim().min(10).max(5000),
  address: z.string().trim().max(500).optional().default(""),
  latitude: z.string().trim().max(30).optional().default(""),
  longitude: z.string().trim().max(30).optional().default(""),
  consent: z.literal(true),
});

export const updateRequestSchema = z.object({
  status: z.enum([
    "received",
    "checking",
    "assigned",
    "in_progress",
    "completed",
    "closed",
  ]),
  assignedDepartment: z.string().trim().min(2).max(120),
});

export const localAdminLoginSchema = z
  .object({
    username: z.string().trim().min(1).max(80),
    password: z.string().min(1).max(128),
  })
  .strict();
