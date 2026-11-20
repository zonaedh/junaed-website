import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config.
 *
 * Migrations use the UNPOOLED connection (DATABASE_URL_UNPOOLED) because DDL
 * through a connection pooler is unreliable. The app itself uses the pooled
 * URL at runtime — see src/db/index.ts.
 *
 * drizzle-kit runs outside Next, so it does not load .env.local by itself.
 * The explicit load below is why `npm run db:migrate` works without exporting
 * variables into the shell first.
 *
 * Never commit real values. Both URLs come from .env.local.
 */

// Load .env.local for CLI runs. Node 20.6+ has this built in.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI, a fresh clone): fall through to real environment vars.
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
