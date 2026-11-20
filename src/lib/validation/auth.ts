import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";

/** Login form. Deliberately permissive on shape: the server must not reveal
 *  whether an email exists, so validation errors stay generic. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email address.")
    .max(254),
  password: z.string().min(1, "Enter your password.").max(200),
  /**
   * The 2FA code, present only on the second step of the login flow.
   *
   * `FormData.get()` returns `null` for a field that is not in the form, and
   * Zod's `.optional()` accepts `undefined` but NOT `null`. Without the
   * `.nullish()` below, every first-step login failed validation before it
   * ever reached the database — the form looked like a wrong password.
   */
  totp: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((value) => (value === "" || value === null ? undefined : value)),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginState = {
  status: "idle" | "error" | "totp_required";
  message?: string;
  /** Set when the password was correct but a 2FA code is still needed. */
  email?: string;
};

/** Password change / reset. */
export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(200),
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export type PasswordInput = z.infer<typeof passwordSchema>;

/** 2FA code entry, used during enrolment and login. */
export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type TotpCodeInput = z.infer<typeof totpCodeSchema>;
