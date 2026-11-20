/**
 * Stop the local development database.
 *
 * PGlite holds the data directory open, so a running server must be stopped
 * from the process that owns it (Ctrl+C in its terminal, or kill that task).
 * This script reports state honestly rather than pretending to stop a server
 * it does not own.
 */

import { existsSync } from "node:fs";

const DATA_DIR = "./.pglite";

if (!existsSync(DATA_DIR)) {
  console.log("[db:local] no local database found — nothing to stop.");
  process.exit(0);
}

console.log("[db:local] The local database runs in the foreground of the task");
console.log("           that started it. To stop it, press Ctrl+C there (or");
console.log("           stop that background task). Data is kept in .pglite/");
console.log("           and is safe across restarts.");
