import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const cacheEntries = sqliteTable("cache_entries", {
    key: text("key").primaryKey().notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at"),
    createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});
