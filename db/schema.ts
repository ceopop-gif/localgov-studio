import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    englishName: text("english_name").notNull().default(""),
    slug: text("slug").notNull(),
    organizationType: text("organization_type").notNull(),
    province: text("province").notNull().default(""),
    district: text("district").notNull().default(""),
    subdistrict: text("subdistrict").notNull().default(""),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    vision: text("vision").notNull().default(""),
    logoUrl: text("logo_url").notNull().default(""),
    primaryColor: text("primary_color").notNull().default("#0B5260"),
    secondaryColor: text("secondary_color").notNull().default("#E4B949"),
    servicesJson: text("services_json")
      .notNull()
      .default('["lighting","road","water","waste","complaint","construction","tax","welfare"]'),
    homepageJson: text("homepage_json").notNull().default("{}"),
    status: text("status").notNull().default("draft"),
    completeness: integer("completeness").notNull().default(18),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_sites_slug_unique").on(table.slug),
    index("idx_sites_owner_status").on(table.ownerUserId, table.status),
  ],
);

export const siteMembers = sqliteTable(
  "site_members",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    department: text("department").notNull().default("ส่วนกลาง"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_site_members_site_user_unique").on(
      table.siteId,
      table.userId,
    ),
    index("idx_site_members_user_active").on(table.userId, table.active),
  ],
);

export const localAdminSessions = sqliteTable(
  "local_admin_sessions",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_local_admin_sessions_expires").on(table.expiresAt),
  ],
);

export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    category: text("category").notNull().default("ทั่วไป"),
    fiscalYear: integer("fiscal_year"),
    status: text("status").notNull().default("draft"),
    coverUrl: text("cover_url").notNull().default(""),
    galleryJson: text("gallery_json").notNull().default("[]"),
    youtubeUrl: text("youtube_url").notNull().default(""),
    attachmentUrl: text("attachment_url").notNull().default(""),
    attachmentName: text("attachment_name").notNull().default(""),
    createdBy: text("created_by").notNull(),
    approvedBy: text("approved_by").notNull().default(""),
    scheduledAt: text("scheduled_at"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_content_site_type_status").on(
      table.siteId,
      table.type,
      table.status,
    ),
    index("idx_content_site_updated").on(table.siteId, table.updatedAt),
  ],
);

export const serviceRequests = sqliteTable(
  "service_requests",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    trackingCode: text("tracking_code").notNull(),
    requestType: text("request_type").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    details: text("details").notNull(),
    address: text("address").notNull().default(""),
    latitude: text("latitude").notNull().default(""),
    longitude: text("longitude").notNull().default(""),
    status: text("status").notNull().default("received"),
    assignedDepartment: text("assigned_department").notNull().default("สำนักปลัด"),
    consent: integer("consent", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_service_requests_tracking_unique").on(table.trackingCode),
    index("idx_service_requests_site_status").on(table.siteId, table.status),
    index("idx_service_requests_site_created").on(table.siteId, table.createdAt),
  ],
);

export const mediaFiles = sqliteTable(
  "media_files",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    category: text("category").notNull().default("document"),
    altText: text("alt_text").notNull().default(""),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_media_object_key_unique").on(table.objectKey),
    index("idx_media_site_category").on(table.siteId, table.category),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").references(() => sites.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_audit_site_created").on(table.siteId, table.createdAt),
    index("idx_audit_actor_created").on(table.actorUserId, table.createdAt),
  ],
);
