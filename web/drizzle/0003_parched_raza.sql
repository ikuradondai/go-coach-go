CREATE TABLE `katago_analysis_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`visits` integer NOT NULL,
	`request_json` text NOT NULL,
	`result_json` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`candidate_id`) REFERENCES `position_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `katago_jobs_candidate_created_idx` ON `katago_analysis_jobs` (`candidate_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `position_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`move_number` integer NOT NULL,
	`to_play` text NOT NULL,
	`position_json` text NOT NULL,
	`status` text DEFAULT 'selected' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `sgf_imports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `position_candidates_import_move_idx` ON `position_candidates` (`import_id`,`move_number`);--> statement-breakpoint
CREATE TABLE `sgf_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`board_size` integer NOT NULL,
	`rules` text NOT NULL,
	`komi` real NOT NULL,
	`black_player` text DEFAULT '' NOT NULL,
	`white_player` text DEFAULT '' NOT NULL,
	`move_count` integer NOT NULL,
	`game_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sgf_imports_created_idx` ON `sgf_imports` (`created_at`);