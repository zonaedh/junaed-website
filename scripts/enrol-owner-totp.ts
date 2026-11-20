/**
 * DEV ONLY — enrol the owner account in TOTP so the login flow can be tested.
 *
 * Why this exists: 2FA is mandatory for the owner role, and the seed
 * deliberately creates the owner without a secret. Enrolment normally happens
 * on /account/2fa, which requires a session — and you cannot get a session
 * without passing 2FA. That is a correct security design, but it makes the
 * login path impossible to verify on a fresh database without a bootstrap.
 *
 * This script performs the same enrolment the UI does (createTotpEnrolment,
 * encrypted with ENCRYPTION_KEY) and writes it straight to the row, leaving
 * totpEnabledAt NULL so the account is in the "pending confirmation" state.
 *
 *   npm run db:enrol-owner
 *
 * Never run this against production. It prints a live secret to stdout.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — rely on the real environment.
}

import { eq } from "drizzle-orm";
import { generateSync } from "otplib";
import { closeDb, db } from "@/db";
import { users } from "@/db/schema";
import { createTotpEnrolment } from "@/lib/auth/totp";

async function main() {
  const email = process.env.SEED_OWNER_EMAIL;
  if (!email) {
    console.error("SEED_OWNER_EMAIL must be set in .env.local");
    process.exit(1);
  }

  const rows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  const owner = rows[0];
  if (!owner) {
    console.error(`No user found for ${email}. Run npm run db:seed first.`);
    process.exit(1);
  }

  const enrolment = createTotpEnrolment(owner.email);

  await db
    .update(users)
    .set({
      totpSecret: enrolment.encryptedSecret,
      totpEnabledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, owner.id));

  const code = generateSync({
    secret: enrolment.secret,
    digits: 6,
    period: 30,
  });

  console.log("");
  console.log(`  Enrolled ${owner.email} (pending confirmation).`);
  console.log("");
  console.log(`  Secret: ${enrolment.secret}`);
  console.log(`  Current code: ${code}`);
  console.log("");
  console.log("  Use the code at /admin/login within 30 seconds.");
  console.log("");

  await closeDb();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Enrolment failed:", error);
  await closeDb().catch(() => {});
  process.exit(1);
});
