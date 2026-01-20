import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: ['./db/cache/schema.ts'],
    out: './drizzle_cache',
    dialect: 'sqlite',
    dbCredentials: {
        url: './db/cachedb.sqlite',
    },
});
