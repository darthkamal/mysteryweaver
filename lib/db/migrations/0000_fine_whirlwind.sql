CREATE TABLE `accusations` (
	`session_id` text NOT NULL,
	`accuser_id` text NOT NULL,
	`suspect_id` text NOT NULL,
	`motive` text NOT NULL,
	`evidence_ids` text NOT NULL,
	`submitted_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `accuser_id`)
);
--> statement-breakpoint
CREATE TABLE `gms` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gms_email_unique` ON `gms` (`email`);--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`actor_id` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`session_id` text NOT NULL,
	`uid` text NOT NULL,
	`character_id` text NOT NULL,
	`display_name` text NOT NULL,
	`currencies` text NOT NULL,
	`clues` text NOT NULL,
	`is_online` integer DEFAULT false NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `uid`)
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`schema_version` text NOT NULL,
	`manifest` text NOT NULL,
	`characters` text NOT NULL,
	`assets` text NOT NULL,
	`gm_script` text NOT NULL,
	`relationships` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`host_id` text NOT NULL,
	`scenario_id` text NOT NULL,
	`phase` text NOT NULL,
	`phase_index` integer NOT NULL,
	`status` text NOT NULL,
	`character_assignments` text NOT NULL,
	`unlocked_assets` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_room_code_unique` ON `sessions` (`room_code`);