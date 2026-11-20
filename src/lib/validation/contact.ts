import { z } from "zod";

/**
 * Shared contact-form schema. Used on the server (Server Action) as the
 * authority and on the client only for instant feedback. The server never
 * trusts the client result — it re-parses the raw FormData.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "That name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(254, "That email address is too long."),
  service: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  message: z
    .string()
    .trim()
    .min(20, "Please add a little more detail (at least 20 characters).")
    .max(5000, "Please keep it under 5000 characters."),
  // Honeypot: must stay empty. Bots fill every field they find.
  website: z.string().max(0).optional(),
  // Minimum fill time in ms, checked server-side against a signed timestamp.
  startedAt: z.coerce.number().int().nonnegative(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactFieldErrors = Partial<
  Record<"name" | "email" | "service" | "message" | "form", string>
>;

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: ContactFieldErrors;
  /** Echoed back so the form keeps what the user typed after a failure. */
  values?: { name?: string; email?: string; service?: string; message?: string };
};
