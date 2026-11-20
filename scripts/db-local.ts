/**
 * Local development database.
 *
 * Runs PGlite — a real PostgreSQL build compiled to WebAssembly — and exposes
 * it over the Postgres wire protocol on localhost:5433. The app connects with
 * the ordinary `pg` driver, so `src/db/index.ts`, Drizzle, the schema and every
 * query are byte-for-byte the same as production.
 *
 *   npm run db:local        start on port 5433 and stay in the foreground
 *   npm run db:local:stop   stop it
 *
 * Data lives in `.pglite/` (gitignored).
 *
 * Why this exists: Phase 3's definition of done is "change it in admin, see it
 * live on the site". That cannot be verified against a database that does not
 * exist, and waiting on a hosted Neon project would have blocked the phase.
 * Production still uses Neon; only the connection string differs (D-022).
 *
 * Known limitation: PGlite is single-writer and serialises queries. Fine for
 * one developer, never for production. It is a dev dependency and is never
 * imported by application code.
 */

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = 5433;
const HOST = "127.0.0.1";
const DATA_DIR = "./.pglite";

const DATABASE_URL = `postgresql://postgres:postgres@${HOST}:${PORT}/postgres`;

async function main() {
  console.log("[db:local] opening PGlite in .pglite/ ...");

  const db = await PGlite.create(DATA_DIR);

  const server = new PGLiteSocketServer({
    db,
    port: PORT,
    host: HOST,
    maxConnections: 10,
  });

  await server.start();

  console.log("");
  console.log("  Local Postgres (PGlite) is running.");
  console.log("");
  console.log(`  DATABASE_URL=${DATABASE_URL}`);
  console.log(`  DATABASE_URL_UNPOOLED=${DATABASE_URL}`);
  console.log("");
  console.log("  Next: npm run db:migrate && npm run db:seed");
  console.log("  Stop with Ctrl+C, or npm run db:local:stop");
  console.log("");

  const shutdown = async () => {
    console.log("\n[db:local] stopping ...");
    try {
      await server.stop();
      await db.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error("[db:local] failed:", error);
  process.exit(1);
});
