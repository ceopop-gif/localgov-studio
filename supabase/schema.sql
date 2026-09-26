-- PostgreSQL schema for LocalGov Studio. Application data is not exposed to the Data API.

CREATE SCHEMA IF NOT EXISTS localgov;

REVOKE ALL ON SCHEMA localgov FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."sites" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL,
  "name" text NOT NULL,
  "english_name" text NOT NULL DEFAULT '',
  "slug" text NOT NULL,
  "organization_type" text NOT NULL,
  "province" text NOT NULL DEFAULT '',
  "district" text NOT NULL DEFAULT '',
  "subdistrict" text NOT NULL DEFAULT '',
  "address" text NOT NULL DEFAULT '',
  "phone" text NOT NULL DEFAULT '',
  "email" text NOT NULL DEFAULT '',
  "vision" text NOT NULL DEFAULT '',
  "logo_url" text NOT NULL DEFAULT '',
  "primary_color" text NOT NULL DEFAULT '#0B5260',
  "secondary_color" text NOT NULL DEFAULT '#E4B949',
  "services_json" text NOT NULL DEFAULT '["lighting","road","water","waste","complaint","construction","tax","welfare"]',
  "status" text NOT NULL DEFAULT 'draft',
  "completeness" integer NOT NULL DEFAULT 18,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  "updated_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  "homepage_json" text NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "idx_sites_owner_status" ON localgov."sites" ("owner_user_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_sites_slug_unique" ON localgov."sites" ("slug");

ALTER TABLE localgov."sites" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."sites" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."site_members" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL,
  "user_id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'editor',
  "department" text NOT NULL DEFAULT 'ส่วนกลาง',
  "active" boolean NOT NULL DEFAULT true,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_site_members_user_active" ON localgov."site_members" ("user_id", "active");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_site_members_site_user_unique" ON localgov."site_members" ("site_id", "user_id");

ALTER TABLE localgov."site_members" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."site_members" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."content_items" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text NOT NULL DEFAULT '',
  "body" text NOT NULL DEFAULT '',
  "category" text NOT NULL DEFAULT 'ทั่วไป',
  "fiscal_year" integer,
  "status" text NOT NULL DEFAULT 'draft',
  "cover_url" text NOT NULL DEFAULT '',
  "created_by" text NOT NULL,
  "approved_by" text NOT NULL DEFAULT '',
  "scheduled_at" text,
  "published_at" text,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  "updated_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  "attachment_url" text NOT NULL DEFAULT '',
  "attachment_name" text NOT NULL DEFAULT '',
  "gallery_json" text NOT NULL DEFAULT '[]',
  "youtube_url" text NOT NULL DEFAULT '',
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_content_site_updated" ON localgov."content_items" ("site_id", "updated_at");

CREATE INDEX IF NOT EXISTS "idx_content_site_type_status" ON localgov."content_items" ("site_id", "type", "status");

ALTER TABLE localgov."content_items" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."content_items" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."service_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL,
  "tracking_code" text NOT NULL,
  "request_type" text NOT NULL,
  "full_name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text NOT NULL DEFAULT '',
  "details" text NOT NULL,
  "address" text NOT NULL DEFAULT '',
  "latitude" text NOT NULL DEFAULT '',
  "longitude" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'received',
  "assigned_department" text NOT NULL DEFAULT 'สำนักปลัด',
  "consent" boolean NOT NULL DEFAULT false,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  "updated_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_service_requests_site_created" ON localgov."service_requests" ("site_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_service_requests_site_status" ON localgov."service_requests" ("site_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_requests_tracking_unique" ON localgov."service_requests" ("tracking_code");

ALTER TABLE localgov."service_requests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."service_requests" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."media_files" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL,
  "object_key" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "category" text NOT NULL DEFAULT 'document',
  "alt_text" text NOT NULL DEFAULT '',
  "uploaded_by" text NOT NULL,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_media_site_category" ON localgov."media_files" ("site_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_media_object_key_unique" ON localgov."media_files" ("object_key");

ALTER TABLE localgov."media_files" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."media_files" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text,
  "actor_user_id" text NOT NULL,
  "actor_email" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "metadata" text NOT NULL DEFAULT '{}',
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_audit_actor_created" ON localgov."audit_logs" ("actor_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_site_created" ON localgov."audit_logs" ("site_id", "created_at");

ALTER TABLE localgov."audit_logs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."audit_logs" FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS localgov."local_admin_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "site_id" text NOT NULL,
  "user_id" text NOT NULL,
  "username" text NOT NULL,
  "expires_at" text NOT NULL,
  "created_at" text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  FOREIGN KEY ("site_id") REFERENCES localgov."sites" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_local_admin_sessions_expires" ON localgov."local_admin_sessions" ("expires_at");

ALTER TABLE localgov."local_admin_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON localgov."local_admin_sessions" FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_local_admin_sessions_site ON localgov.local_admin_sessions(site_id);

CREATE INDEX IF NOT EXISTS idx_content_site_created_by ON localgov.content_items(site_id, created_by);
