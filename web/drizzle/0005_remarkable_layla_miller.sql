ALTER TABLE `attempts` ADD `error_tags_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `training_runs` ADD `catalog_version` text DEFAULT 'legacy' NOT NULL;