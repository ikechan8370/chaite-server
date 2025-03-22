import { sql } from "drizzle-orm";
import {integer, numeric, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  subscriptionId: text("subscriptionId"),
  lastKeyGeneratedAt: integer("lastKeyGeneratedAt", { mode: "timestamp" }),
  });

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  token: text("token").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const rateLimit = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  endpoint: text("endpoint").notNull(),
  count: integer("count").notNull().default(0),
  resetAt: integer("resetAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const tool = sqliteTable("tool", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  code: text("code"),
  modelType: text("modelType").notNull(),
  embedded: integer("embedded").notNull().default(0),
  uploaderId: text("uploaderId").references(() => user.id),
  permission: text("permission").notNull(),
  status: text("status").notNull(),
})

export const channel = sqliteTable("channel", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  code: text("code"),
  modelType: text("modelType").notNull(),
  embedded: integer("embedded").notNull().default(0),
  uploaderId: text("uploaderId").references(() => user.id),
  adapterType: text("adapterType").notNull(),
  models: text("models").notNull(),
  baseUrl: text("baseUrl").notNull(),
  apiKey: text("apiKey").notNull(),
})

export const processor = sqliteTable("processor", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  code: text("code"),
  modelType: text("modelType").notNull(),
  embedded: integer("embedded").notNull().default(0),
  uploaderId: text("uploaderId").references(() => user.id),
  type: text("type").notNull(),
 })

export const preset = sqliteTable("preset", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  code: text("code"),
  modelType: text("modelType").notNull(),
  embedded: integer("embedded").notNull().default(0),
  uploaderId: text("uploaderId").references(() => user.id),
  prefix: text("prefix"),
  prompt: text("prompt").notNull(),
  temperature: numeric("temperature"),
  maxToken: integer("maxToken"),
  model: text("model"),
})

export const toolsGroup = sqliteTable("toolsGroup", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  code: text("code"),
  modelType: text("modelType").notNull(),
  embedded: integer("embedded").notNull().default(0),
  uploaderId: text("uploaderId").references(() => user.id),
})

export const toolGroupId = sqliteTable("toolGroupId", {
  id: integer("id").primaryKey(),
  toolsGroupId: integer("toolsGroupId").notNull().references(() => toolsGroup.id),
  toolId: integer("toolId").notNull().references(() => tool.id),
})

export const role = sqliteTable("role", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const permission = sqliteTable("permission", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const rolePermission = sqliteTable("rolePermission", {
  id: integer("id").primaryKey(),
  roleId: integer("roleId").notNull().references(() => role.id),
  permissionId: integer("permissionId").notNull().references(() => permission.id),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const userRole = sqliteTable("userRole", {
  id: integer("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  roleId: integer("roleId").notNull().references(() => role.id),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const menuItem = sqliteTable("menuItem", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  icon: text("icon"),
  parentId: integer("parentId"),
  order: integer("order").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const menuPermission = sqliteTable("menuPermission", {
  id: integer("id").primaryKey(),
  menuItemId: integer("menuItemId").notNull().references(() => menuItem.id),
  permissionId: integer("permissionId").notNull().references(() => permission.id),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type MenuItem = typeof menuItem.$inferSelect;
export type MenuPermission = typeof menuPermission.$inferSelect;
export type Role = typeof role.$inferSelect;
export type Permission = typeof permission.$inferSelect;
export type RolePermission = typeof rolePermission.$inferSelect;
export type UserRole = typeof userRole.$inferSelect;
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type RateLimit = typeof rateLimit.$inferSelect;
export type ToolTable = typeof tool.$inferSelect;
export type ChannelTable = typeof channel.$inferSelect;
export type ProcessorTable = typeof processor.$inferSelect;
export type PresetTable = typeof preset.$inferSelect;
export type ToolsGroupTable = typeof toolsGroup.$inferSelect;
export type ToolGroupIdTable = typeof toolGroupId.$inferSelect;
