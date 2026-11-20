import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database client — lazily initialised.
 *
 * SERVER ONLY. Never import this from a file with "use client": the `pg`
 * package cannot be bundled for the browser, and Next turns that into a build
 * error (which is the behaviour we want).
 *
 * Why `pg` and not `postgres` (D-022): both work against Neon in production,
 * but only `pg` sends enum parameters correctly through the local development
 * database. Using one driver everywhere means local and production run the
 * same code path, so a bug cannot hide in the difference.
 *
 * Why lazy: `next build` imports every route module to collect page data. If
 * the pool were created at import time, a build would demand a live database
 * and a valid DATABASE_URL — so CI, a preview deploy, or a fresh clone could
 * not compile the app at all. The connection is created on the first query
 * instead, which is also when a missing DATABASE_URL should fail.
 *
 * Neon + Vercel is serverless: each function instance gets its own pool, so
 * `max` is kept small.
 */

type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __jhPool?: Pool;
  __jhDb?: Database;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

function createDb(): Database {
  const pool =
    globalForDb.__jhPool ??
    new Pool({
      connectionString: connectionString(),
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      // Neon's pooler terminates TLS at the edge; a managed database should
      // never be reached without it.
      ssl:
        process.env.DATABASE_URL?.includes("localhost") ||
        process.env.DATABASE_URL?.includes("127.0.0.1")
          ? undefined
          : { rejectUnauthorized: false },
    });

  // Reuse the pool across hot reloads in development.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__jhPool = pool;
  }

  return drizzle(pool, { schema });
}

function instance(): Database {
  const existing = globalForDb.__jhDb;
  if (existing) return existing;

  const created = createDb();
  globalForDb.__jhDb = created;
  return created;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const target = instance();
    const value = Reflect.get(target, property, target);
    // Drizzle's query builder methods rely on `this`; return them bound.
    return typeof value === "function" ? value.bind(target) : value;
  },
});

/** Close the pool. Only scripts (seed, migrations) need this. */
export async function closeDb(): Promise<void> {
  await globalForDb.__jhPool?.end();
  globalForDb.__jhPool = undefined;
  globalForDb.__jhDb = undefined;
}

export * from "./schema";
