INSERT INTO `audit_logs` (
  `id`,
  `site_id`,
  `actor_user_id`,
  `actor_email`,
  `action`,
  `entity_type`,
  `entity_id`,
  `metadata`
)
SELECT
  lower(hex(randomblob(16))),
  `sites`.`id`,
  `sites`.`owner_user_id`,
  COALESCE(
    (
      SELECT `site_members`.`email`
      FROM `site_members`
      WHERE `site_members`.`site_id` = `sites`.`id`
        AND `site_members`.`user_id` = `sites`.`owner_user_id`
      LIMIT 1
    ),
    'system@localgov.local'
  ),
  'site.published',
  'site',
  `sites`.`id`,
  '{"source":"user-requested-publish"}'
FROM `sites`
WHERE `sites`.`id` = 'sung-noen-municipality'
  AND `sites`.`status` <> 'published';
--> statement-breakpoint
UPDATE `sites`
SET `status` = 'published', `updated_at` = CURRENT_TIMESTAMP
WHERE `id` = 'sung-noen-municipality'
  AND `status` <> 'published';
