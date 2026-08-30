ALTER TABLE `katago_analysis_jobs` ADD `cache_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `katago_analysis_jobs` ADD `cache_hit` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `katago_jobs_cache_status_idx` ON `katago_analysis_jobs` (`cache_key`,`status`);