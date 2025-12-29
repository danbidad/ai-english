import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: ['./db/usage/schema.ts'],
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: './db/usagedb.sqlite',
    },
});
