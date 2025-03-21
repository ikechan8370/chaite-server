PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channel` (
	`id` integer PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_channel`("id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "adapterType", "models", "baseUrl", "apiKey") SELECT "id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "adapterType", "models", "baseUrl", "apiKey" FROM `channel`;--> statement-breakpoint
DROP TABLE `channel`;--> statement-breakpoint
ALTER TABLE `__new_channel` RENAME TO `channel`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_preset` (
	`id` integer PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_preset`("id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "prefix", "prompt", "temperature", "maxToken", "model") SELECT "id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "prefix", "prompt", "temperature", "maxToken", "model" FROM `preset`;--> statement-breakpoint
DROP TABLE `preset`;--> statement-breakpoint
ALTER TABLE `__new_preset` RENAME TO `preset`;--> statement-breakpoint
CREATE TABLE `__new_processor` (
	`id` integer PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_processor`("id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "type") SELECT "id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "type" FROM `processor`;--> statement-breakpoint
DROP TABLE `processor`;--> statement-breakpoint
ALTER TABLE `__new_processor` RENAME TO `processor`;--> statement-breakpoint
CREATE TABLE `__new_tool` (
	`id` integer PRIMARY KEY NOT NULL,
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
INSERT INTO `__new_tool`("id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "permission", "status") SELECT "id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId", "permission", "status" FROM `tool`;--> statement-breakpoint
DROP TABLE `tool`;--> statement-breakpoint
ALTER TABLE `__new_tool` RENAME TO `tool`;--> statement-breakpoint
CREATE TABLE `__new_toolGroupId` (
	`id` integer PRIMARY KEY NOT NULL,
	`toolsGroupId` integer NOT NULL,
	`toolId` integer NOT NULL,
	FOREIGN KEY (`toolsGroupId`) REFERENCES `toolsGroup`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`toolId`) REFERENCES `tool`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_toolGroupId`("id", "toolsGroupId", "toolId") SELECT "id", "toolsGroupId", "toolId" FROM `toolGroupId`;--> statement-breakpoint
DROP TABLE `toolGroupId`;--> statement-breakpoint
ALTER TABLE `__new_toolGroupId` RENAME TO `toolGroupId`;--> statement-breakpoint
CREATE TABLE `__new_toolsGroup` (
	`id` integer PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
INSERT INTO `__new_toolsGroup`("id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId") SELECT "id", "name", "description", "createdAt", "updatedAt", "code", "modelType", "embedded", "uploaderId" FROM `toolsGroup`;--> statement-breakpoint
DROP TABLE `toolsGroup`;--> statement-breakpoint
ALTER TABLE `__new_toolsGroup` RENAME TO `toolsGroup`;