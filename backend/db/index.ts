import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('./db/usagedb.sqlite');
export const usagedb = drizzle(sqlite);

const cacheSqlite = new Database('./db/cachedb.sqlite');
export const cachedb = drizzle(cacheSqlite);
