CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text,
	`actor_user_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_site_created` ON `audit_logs` (`site_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor_created` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'ทั่วไป' NOT NULL,
	`fiscal_year` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`cover_url` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`scheduled_at` text,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_content_site_type_status` ON `content_items` (`site_id`,`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_content_site_updated` ON `content_items` (`site_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`category` text DEFAULT 'document' NOT NULL,
	`alt_text` text DEFAULT '' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_object_key_unique` ON `media_files` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_media_site_category` ON `media_files` (`site_id`,`category`);--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`tracking_code` text NOT NULL,
	`request_type` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`details` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`latitude` text DEFAULT '' NOT NULL,
	`longitude` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`assigned_department` text DEFAULT 'สำนักปลัด' NOT NULL,
	`consent` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_service_requests_tracking_unique` ON `service_requests` (`tracking_code`);--> statement-breakpoint
CREATE INDEX `idx_service_requests_site_status` ON `service_requests` (`site_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_service_requests_site_created` ON `service_requests` (`site_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_members` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`department` text DEFAULT 'ส่วนกลาง' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_site_members_site_user_unique` ON `site_members` (`site_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_site_members_user_active` ON `site_members` (`user_id`,`active`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`english_name` text DEFAULT '' NOT NULL,
	`slug` text NOT NULL,
	`organization_type` text NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`district` text DEFAULT '' NOT NULL,
	`subdistrict` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`vision` text DEFAULT '' NOT NULL,
	`logo_url` text DEFAULT '' NOT NULL,
	`primary_color` text DEFAULT '#0B5260' NOT NULL,
	`secondary_color` text DEFAULT '#E4B949' NOT NULL,
	`services_json` text DEFAULT '["lighting","road","water","waste","complaint","construction","tax","welfare"]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`completeness` integer DEFAULT 18 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sites_slug_unique` ON `sites` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_sites_owner_status` ON `sites` (`owner_user_id`,`status`);