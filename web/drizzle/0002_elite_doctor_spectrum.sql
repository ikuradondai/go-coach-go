CREATE TABLE `exercise_reviews` (
	`exercise_id` text NOT NULL,
	`exercise_version` integer NOT NULL,
	`status` text DEFAULT 'unreviewed' NOT NULL,
	`checklist_json` text DEFAULT '{}' NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `exercise_version`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
