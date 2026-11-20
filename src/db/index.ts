import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database client — lazily initialised.
 *
 * SERVER ONLY. Never import this from a file with "use client": the `postgres`
 * package cannot be bundled for the browser, and Next turns that into a build
 * error (which is the behaviour we want).
 *
 * Why lazy: `next build` imports every route module to collect page data. If
 * the pool were created at import time, a build would demand a live database
 * and a valid DATABASE_URL — so CI, a preview deploy, or a fresh clone could
 * not compile the app at all. The connection is created on the first query
 * instead, which is also when a missing DATABASE_URL should fail.
 *
 * Neon + Vercel is serverless: each function instance gets its own pool, so
 * `max` is kept small. `prepare: false` is required when talking to Neon's
 * transaction pooler.
 */

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __jhSql?: ReturnType<typeof postgres>;
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
  const sql =
    globalForDb.__jhSql ??
    postgres(connectionString(), {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });

  // Reuse the pool across hot reloads in development.
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__jhSql = sql;
  }

  return drizzle(sql, { schema });
}

/**
 * A Proxy that builds the real client on first property access, so importing
 * this module has no side effects and no connection requirement.
 */
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
  await globalForDb.__jhSql?.end();
  globalForDb.__jhSql = undefined;
  globalForDb.__jhDb = undefined;
}

export * from "./schema";
