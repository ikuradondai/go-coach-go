CREATE TABLE `anonymous_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`run_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_version` integer NOT NULL,
	`selected_group` text NOT NULL,
	`selected_reasons_json` text NOT NULL,
	`group_correct` integer NOT NULL,
	`reasons_correct` integer NOT NULL,
	`response_ms` integer NOT NULL,
	`error_tag` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `anonymous_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `training_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_session_created_idx` ON `attempts` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_run_created_idx` ON `attempts` (`run_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_exercise_created_idx` ON `attempts` (`exercise_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`ordinal` integer NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_status_ordinal_idx` ON `exercises` (`status`,`ordinal`);--> statement-breakpoint
CREATE TABLE `skill_estimates` (
	`session_id` text NOT NULL,
	`tag` text NOT NULL,
	`alpha` real DEFAULT 1 NOT NULL,
	`beta` real DEFAULT 1 NOT NULL,
	`sample_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`session_id`, `tag`),
	FOREIGN KEY (`session_id`) REFERENCES `anonymous_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `training_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`session_id`) REFERENCES `anonymous_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_runs_session_started_idx` ON `training_runs` (`session_id`,`started_at`);