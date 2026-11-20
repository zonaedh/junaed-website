import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config.
 *
 * Migrations use the UNPOOLED Neon connection (DATABASE_URL_UNPOOLED) because
 * DDL through a connection pooler is unreliable. The app itself uses the
 * pooled URL at runtime — see src/db/index.ts.
 *
 * Never commit real values. DATABASE_URL_UNPOOLED comes from .env.local.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
  strict: true,
  verbose: true,
});
