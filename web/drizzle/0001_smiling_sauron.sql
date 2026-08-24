ALTER TABLE `attempts` ADD `answers_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `stage_results_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `attempts` ADD `all_correct` integer DEFAULT false NOT NULL;