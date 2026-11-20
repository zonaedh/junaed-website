"use server";

import { contactSchema, type ContactState } from "@/lib/validation/contact";

/**
 * Contact submission handler.
 *
 * PHASE 1 SCOPE: validation, honeypot and minimum-fill-time only.
 * Phase 5 adds, in this order: rate limiting (Upstash), math captcha
 * verification, spam scoring, DB persistence, Telegram notification and
 * Resend emails. Until then this action validates and logs to the server
 * console — it does NOT claim the message was delivered, because nothing
 * has been sent anywhere yet.
 */

const MIN_FILL_MS = 3000;

export async function submitContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    service: formData.get("service"),
    message: formData.get("message"),
    website: formData.get("website"),
    startedAt: formData.get("startedAt"),
  };

  const values = {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    service: typeof raw.service === "string" ? raw.service : "",
    message: typeof raw.message === "string" ? raw.message : "",
  };

  // Honeypot — silently accept so bots do not learn they were caught.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return { status: "success", message: "Thanks — your message is on its way." };
  }

  const parsed = contactSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        field === "name" ||
        field === "email" ||
        field === "service" ||
        field === "message"
      ) {
        errors[field] ??= issue.message;
      }
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors,
      values,
    };
  }

  // Time check: a real person takes more than three seconds to fill this in.
  const elapsed = Date.now() - parsed.data.startedAt;
  if (elapsed < MIN_FILL_MS) {
    return {
      status: "error",
      message: "That was a little too quick. Please try again.",
      values,
    };
  }

  // TODO(phase-5): rate limit → captcha → spam score → persist lead →
  // Telegram alert → Resend acknowledgement → redirect to /thank-you.
  // Deliberately not implemented yet; see MVP.md §5.1.
  console.info("[contact] validated submission received", {
    name: parsed.data.name,
    email: parsed.data.email,
    service: parsed.data.service ?? null,
    messageLength: parsed.data.message.length,
  });

  return {
    status: "success",
    message:
      "Thanks — your message was received. I will reply within one business day.",
  };
}
