CREATE TABLE `local_admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_local_admin_sessions_expires` ON `local_admin_sessions` (`expires_at`);