import { eq } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { categories, services as servicesTable, settings, users } from "@/db/schema";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { services as seedServices } from "@/lib/content";

/**
 * Seed script — run once against a fresh database.
 *
 *   npm run db:seed
 *
 * Creates the Owner account from SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD,
 * default settings, categories and the four services.
 *
 * Idempotent: re-running updates nothing that already exists, so it is safe
 * to run again after adding a service.
 *
 * The Owner is created WITHOUT a TOTP secret. Because 2FA is mandatory for
 * the owner role, the first login will be refused with instructions until
 * enrolment is done — that is deliberate. Enrolment is Phase 2.5 work; see
 * HANDOFF.md.
 */

async function main() {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!email || !password) {
    console.error(
      "SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD must be set in .env.local",
    );
    process.exit(1);
  }

  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    console.error(`SEED_OWNER_PASSWORD rejected: ${strengthError}`);
    process.exit(1);
  }

  console.log("Seeding database…");

  /* ------------------------------- owner -------------------------------- */

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Owner ${email} already exists — skipping.`);
  } else {
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      name: "Junaed Hossain",
      email: email.toLowerCase(),
      passwordHash,
      role: "owner",
      isActive: true,
    });
    console.log(`Created owner ${email}.`);
  }

  /* ----------------------------- settings ------------------------------- */

  const defaultSettings: Record<string, unknown> = {
    "site.name": "Junaed Hossain",
    "site.tagline": "Digital solutions for growing brands",
    "site.description":
      "Digital marketing, SEO, graphic design and WordPress customization.",
    "site.email": "hello@junaedhossain.com",
    "site.timezone": "Asia/Dhaka",
    "seo.titleTemplate": "%s | Junaed Hossain",
    "seo.defaultDescription":
      "Digital marketing, SEO, graphic design and WordPress customization for growing brands.",
    "email.fromName": "Junaed Hossain",
    "email.fromAddress": "hello@junaedhossain.com",
    "analytics.retentionMonths": 12,
    "maintenance.enabled": false,
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoNothing({ target: settings.key });
  }
  console.log(`Settings ensured (${Object.keys(defaultSettings).length} keys).`);

  /* ---------------------------- categories ------------------------------ */

  const defaultCategories = [
    { name: "SEO", slug: "seo" },
    { name: "Digital Marketing", slug: "digital-marketing" },
    { name: "Design", slug: "design" },
    { name: "WordPress", slug: "wordpress" },
  ];

  for (const category of defaultCategories) {
    await db.insert(categories).values(category).onConflictDoNothing({
      target: categories.slug,
    });
  }
  console.log(`Categories ensured (${defaultCategories.length}).`);

  /* ----------------------------- services ------------------------------- */

  for (const service of seedServices) {
    await db
      .insert(servicesTable)
      .values({
        title: service.title,
        slug: service.slug,
        icon: service.icon,
        summary: service.summary,
        content: { paragraphs: service.body },
        deliverables: service.deliverables,
        sortOrder: service.sortOrder,
        status: "published",
      })
      .onConflictDoNothing({ target: servicesTable.slug });
  }
  console.log(`Services ensured (${seedServices.length}).`);

  console.log("Seed complete.");
  await closeDb();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await closeDb().catch(() => {});
  process.exit(1);
});
