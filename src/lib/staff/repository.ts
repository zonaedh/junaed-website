/**
 * Staff account repository (MVP.md §8.4).
 *
 * SERVER ONLY.
 *
 * Reads and writes for the staff screen. The permission decisions live in
 * `rules.ts` (pure, tested); this file only does the database work and the
 * side effects that follow a change.
 *
 * Two invariants enforced here rather than in the UI:
 *  - a deactivated account cannot log in (the session read already checks
 *    `isActive`, so deactivating is enough to lock someone out on the next
 *    request);
 *  - revoking sessions deletes the rows, so a stolen cookie stops working
 *    immediately rather than at the next expiry.
 */

import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";

export type StaffRow = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  sessionCount: number;
};

/** Every account with its 2FA state and live session count. */
export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      totpSecret: users.totpSecret,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Session counts in one query rather than N.
  const sessionRows = await db
    .select({ userId: sessions.userId, value: count() })
    .from(sessions)
    .groupBy(sessions.userId);

  const counts = new Map(sessionRows.map((row) => [row.userId, Number(row.value)]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    totpEnabled: Boolean(row.totpSecret),
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    sessionCount: counts.get(row.id) ?? 0,
  }));
}

export async function getStaff(id: number): Promise<StaffRow | null> {
  const rows = await listStaff();
  return rows.find((row) => row.id === id) ?? null;
}

/** How many active owners exist. Used by the last-owner guard. */
export async function countActiveOwners(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.isActive, true)));

  return Number(row?.value ?? 0);
}

/** Is this email already in use, ignoring one account? */
export async function emailTaken(email: string, exceptId?: number): Promise<boolean> {
  const where = exceptId
    ? and(eq(users.email, email.toLowerCase()), ne(users.id, exceptId))
    : eq(users.email, email.toLowerCase());

  const rows = await db.select({ id: users.id }).from(users).where(where).limit(1);
  return rows.length > 0;
}

export async function createStaff(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<typeof users.$inferSelect> {
  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
    })
    .returning();

  return row;
}

export async function updateStaffRole(id: number, role: UserRole): Promise<void> {
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function setStaffActive(id: number, isActive: boolean): Promise<void> {
  await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id));

  // Deactivating must end existing sessions immediately, not at next expiry.
  if (!isActive) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }
}

export async function setStaffPassword(id: number, passwordHash: string): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash,
      // A forced reset also clears the lockout, or the user cannot get in to
      // set the new password.
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

export async function deleteStaff(id: number): Promise<boolean> {
  const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return rows.length > 0;
}

/** Clear 2FA so the account can re-enrol (used when a device is lost). */
export async function resetStaffTotp(id: number): Promise<void> {
  await db
    .update(users)
    .set({
      totpSecret: null,
      totpEnabledAt: null,
      recoveryCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

/** How many sessions an account currently has. */
export async function countSessions(id: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(sessions)
    .where(eq(sessions.userId, id));

  return Number(row?.value ?? 0);
}
