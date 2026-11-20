import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { createTotpEnrolment, otpauthUrlFor } from "@/lib/auth/totp";
import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Two-factor authentication" };

/**
 * 2FA enrolment.
 *
 * The secret is generated on the server, encrypted, and stored immediately in
 * a pending state (totpSecret set, totpEnabledAt null). The user is not
 * considered enrolled until they prove they can generate a valid code, which
 * happens in the confirm action.
 *
 * If the account already has a confirmed secret, we do not re-enrol here —
 * that would let anyone with a live session silently replace the second
 * factor. Disabling requires the password (Phase 2.5, see HANDOFF).
 */
export default async function TwoFactorPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      totpSecret: users.totpSecret,
      totpEnabledAt: users.totpEnabledAt,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const record = rows[0];
  if (!record) redirect("/login");

  if (record.totpEnabledAt) {
    return (
      <div className="mx-auto max-w-[560px]">
        <h1 className="mb-3 font-display text-[26px] font-extrabold tracking-[-0.04em]">
          Two-factor authentication
        </h1>
        <div className="rounded-[18px] border border-line bg-white p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-[#1f9d63]">
            <span aria-hidden="true">✓</span> Enabled on this account
          </p>
          <p className="mt-2 text-sm leading-[1.7] text-muted">
            You will be asked for a 6-digit code from your authenticator app each
            time you sign in. To replace your authenticator or regenerate
            recovery codes, ask the owner to reset 2FA for this account.
          </p>
        </div>
      </div>
    );
  }

  // Generate (or reuse) a pending secret. Reusing an existing pending secret
  // keeps the QR code stable across refreshes.
  let encryptedSecret = record.totpSecret;
  let otpauthUrl: string;

  if (!encryptedSecret) {
    const enrolment = createTotpEnrolment(record.email);
    encryptedSecret = enrolment.encryptedSecret;
    otpauthUrl = enrolment.otpauthUrl;

    await db
      .update(users)
      .set({ totpSecret: encryptedSecret, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));
  } else {
    // Rebuild the URI from the stored secret so a refresh does not orphan the
    // code the user already scanned.
    otpauthUrl = otpauthUrlFor(record.email, encryptedSecret);
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="mb-1 font-display text-[26px] font-extrabold tracking-[-0.04em]">
        Set up two-factor authentication
      </h1>
      <p className="mb-5 text-sm leading-[1.7] text-muted">
        Required for owner and admin accounts. You will need an authenticator app
        such as Google Authenticator, 1Password or Authy.
      </p>

      <TwoFactorSetup otpauthUrl={otpauthUrl} />
    </div>
  );
}
