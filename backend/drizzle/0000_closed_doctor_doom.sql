CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`problem_id` integer,
	`custom_title` text,
	`custom_number` integer,
	`category_id` integer,
	`attempt_number` integer NOT NULL,
	`code` text,
	`problem_statement` text,
	`umpire_explanation` text,
	`video_url` text,
	`transcript` text,
	`retrospective` text,
	`github_pushed` integer DEFAULT false NOT NULL,
	`github_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_attempts_date` ON `attempts` (`date`);--> statement-breakpoint
CREATE INDEX `ix_attempts_problem` ON `attempts` (`problem_id`);--> statement-breakpoint
CREATE INDEX `ix_attempts_category` ON `attempts` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_categories_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`english_text` text NOT NULL,
	`japanese_text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_phrases_attempt` ON `phrases` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`umpire_explanation` text,
	`umpire_generated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_problems_category` ON `problems` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_problems_number` ON `problems` (`number`);--> statement-breakpoint
CREATE TABLE `quiz_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shown_date` text NOT NULL,
	`phrase_ids` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_quiz_logs_shown_date` ON `quiz_logs` (`shown_date`);