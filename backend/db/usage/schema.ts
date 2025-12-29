import { sqliteTable, AnySQLiteColumn, numeric, text, primaryKey, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const apiKeys = sqliteTable("api_keys", {
	apiKey: text("api_key", { length: 100 }).primaryKey().notNull(),
	aiType: text("ai_type", { length: 10 }).notNull(),
	isFree: numeric("is_free").default(sql`(FALSE)`).notNull(),
	ownerInfo: text("owner_info"),
	createdAt: numeric("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const apiKeyUsages = sqliteTable("api_key_usages", {
	apiKey: text("api_key", { length: 100 }).notNull(),
	model: text({ length: 30 }).notNull(),
	totalInputTokens: integer("total_input_tokens").default(0).notNull(),
	monthInputTokens: integer("month_input_tokens").default(0).notNull(),
	weekInputTokens: integer("week_input_tokens").default(0).notNull(),
	todayInputTokens: integer("today_input_tokens").default(0).notNull(),
	totalOutputTokens: integer("total_output_tokens").default(0).notNull(),
	monthOutputTokens: integer("month_output_tokens").default(0).notNull(),
	weekOutputTokens: integer("week_output_tokens").default(0).notNull(),
	todayOutputTokens: integer("today_output_tokens").default(0).notNull(),
	totalCallCount: integer("total_call_count").default(0).notNull(),
	monthCallCount: integer("month_call_count").default(0).notNull(),
	weekCallCount: integer("week_call_count").default(0).notNull(),
	todayCallCount: integer("today_call_count").default(0).notNull(),
	updatedAt: numeric("updated_at").default(sql`(datetime('now'))`).notNull(),
},
	(table) => [
		primaryKey({ columns: [table.apiKey, table.model], name: "api_key_usages_api_key_model_pk" })
	]);

export const dailyUsageArchive = sqliteTable("daily_usage_archive", {
	apiKey: text("api_key", { length: 100 }).notNull(),
	model: text({ length: 20 }).notNull(),
	aiType: text("ai_type", { length: 10 }).notNull(),
	usageDate: text("usage_date", { length: 10 }).notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	callCount: integer("call_count").default(0).notNull(),
	createdAt: numeric("created_at").default(sql`(datetime('now'))`).notNull(),
},
	(table) => [
		primaryKey({ columns: [table.apiKey, table.model, table.usageDate], name: "daily_usage_archive_api_key_model_usage_date_pk" })
	]);

export const monthlyUsageArchive = sqliteTable("monthly_usage_archive", {
	apiKey: text("api_key", { length: 100 }).notNull(),
	model: text({ length: 20 }).notNull(),
	aiType: text("ai_type", { length: 10 }).notNull(),
	usageMonth: text("usage_month", { length: 7 }).notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	callCount: integer("call_count").default(0).notNull(),
	createdAt: numeric("created_at").default(sql`(datetime('now'))`).notNull(),
},
	(table) => [
		primaryKey({ columns: [table.apiKey, table.model, table.usageMonth], name: "monthly_usage_archive_api_key_model_usage_month_pk" })
	]);

export const weeklyUsageArchive = sqliteTable("weekly_usage_archive", {
	apiKey: text("api_key", { length: 100 }).notNull(),
	model: text({ length: 20 }).notNull(),
	aiType: text("ai_type", { length: 10 }).notNull(),
	usageWeek: text("usage_week", { length: 10 }).notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	callCount: integer("call_count").default(0).notNull(),
	createdAt: numeric("created_at").default(sql`(datetime('now'))`).notNull(),
},
	(table) => [
		primaryKey({ columns: [table.apiKey, table.model, table.usageWeek], name: "weekly_usage_archive_api_key_model_usage_week_pk" })
	]);

