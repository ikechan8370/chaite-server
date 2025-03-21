CREATE TABLE `channel` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`code` text,
	`modelType` text NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`uploaderId` text,
	`adapterType` text NOT NULL,
	`models` text NOT NULL,
	`baseUrl` text NOT NULL,
	`apiKey` text NOT NULL,
	FOREIGN KEY (`uploaderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `preset` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`code` text,
	`modelType` text NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`uploaderId` text,
	`prefix` text,
	`prompt` text NOT NULL,
	`temperature` numeric,
	`maxToken` integer,
	`model` text,
	FOREIGN KEY (`uploaderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `processor` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`code` text,
	`modelType` text NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`uploaderId` text,
	`type` text NOT NULL,
	FOREIGN KEY (`uploaderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tool` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`code` text,
	`modelType` text NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`uploaderId` text,
	`permission` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`uploaderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `toolGroupId` (
	`id` text PRIMARY KEY NOT NULL,
	`toolsGroupId` text NOT NULL,
	`toolId` text NOT NULL,
	FOREIGN KEY (`toolsGroupId`) REFERENCES `toolsGroup`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toolId`) REFERENCES `tool`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `toolsGroup` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`code` text,
	`modelType` text NOT NULL,
	`embedded` integer DEFAULT 0 NOT NULL,
	`uploaderId` text,
	FOREIGN KEY (`uploaderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
