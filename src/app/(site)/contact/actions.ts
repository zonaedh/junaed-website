"use server";

import { headers } from "next/headers";
import { contactSchema, type ContactState } from "@/lib/validation/contact";
import { createChallenge, verifyChallenge } from "@/lib/contact/captcha";
import { CONTACT_RULES, checkRateLimit } from "@/lib/contact/rate-limit";
import {
  countLinks,
  scoreSubmission,
  stripHtml,
} from "@/lib/contact/spam";
import {
  formatAutoReply,
  formatLeadEmail,
  formatLeadForTelegram,
  hasResendConfig,
  hasTelegramConfig,
  sendEmail,
  sendTelegram,
} from "@/lib/contact/notify";
import { createLead, hasRecentMessageHash } from "@/lib/leads/repository";
import { hashIp, hashMessage } from "@/lib/security/hash";
import { getSettings } from "@/lib/settings";
import { getAdminBase } from "@/lib/admin-path";

/**
 * Contact submission handler.
 *
 * Order matters and is deliberate (MVP.md §5.1):
 *
 *   1. honeypot      — cheapest possible reject, no I/O
 *   2. schema        — shape and length, no I/O
 *   3. fill time     — no I/O
 *   4. rate limit    — one Redis round trip, protects everything below
 *   5. captcha       — HMAC verify, no I/O
 *   6. spam score    — one DB read for the repeat check
 *   7. persist       — the write
 *   8. notify        — Telegram + email, after the write, never blocking it
 *
 * The visitor is only told the message was received once it is in the
 * database. Notifications are best-effort: a dead Telegram token must not lose
 * a lead, so their failure is logged and swallowed.
 */

const MIN_FILL_MS = 3000;

/** Best-effort client IP from proxy headers. Never stored raw. */
async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? null;
}

async function requestMeta() {
  const headerList = await headers();
  return {
    userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    referrer: headerList.get("referer")?.slice(0, 500) ?? null,
    country:
      headerList.get("x-vercel-ip-country") ??
      headerList.get("cf-ipcountry") ??
      null,
  };
}

function newChallenge(): { question: string; token: string } {
  const challenge = createChallenge();
  return { question: challenge.question, token: challenge.token };
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    service: formData.get("service"),
    message: formData.get("message"),
    website: formData.get("website"),
    startedAt: formData.get("startedAt"),
    captchaToken: formData.get("captchaToken"),
    captchaAnswer: formData.get("captchaAnswer"),
  };

  const values = {
    name: typeof raw.name === "string" ? raw.name : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
    service: typeof raw.service === "string" ? raw.service : "",
    message: typeof raw.message === "string" ? raw.message : "",
  };

  // ---- 1. honeypot ----
  // Silently accept so bots do not learn they were caught. Nothing is stored.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return { status: "success", message: "Thanks — your message is on its way." };
  }

  // ---- 2. schema ----
  const parsed = contactSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "captchaToken" || field === "captchaAnswer") {
        errors.captcha ??= issue.message;
      } else if (
        field === "name" ||
        field === "email" ||
        field === "phone" ||
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
      challenge: newChallenge(),
    };
  }

  const data = parsed.data;

  // ---- 3. minimum fill time ----
  const elapsed = Date.now() - data.startedAt;
  if (elapsed < MIN_FILL_MS) {
    return {
      status: "error",
      message: "That was a little too quick. Please try again.",
      values,
      challenge: newChallenge(),
    };
  }

  // ---- 4. rate limit ----
  const ip = await clientIp();
  const ipHash = hashIp(ip);

  if (ipHash) {
    for (const rule of CONTACT_RULES) {
      const result = await checkRateLimit(ipHash, rule);
      if (!result.allowed) {
        const minutes = Math.max(
          1,
          Math.ceil((result.resetAt - Date.now()) / 60000),
        );
        return {
          status: "error",
          message: `Too many messages from this connection. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          values,
          challenge: newChallenge(),
        };
      }
    }
  }

  // ---- 5. captcha ----
  const captcha = verifyChallenge(data.captchaToken, data.captchaAnswer);
  if (!captcha.ok) {
    const message =
      captcha.reason === "expired"
        ? "That question expired. Here is a new one."
        : "That answer was not right. Please try the new question.";
    return {
      status: "error",
      message,
      errors: { captcha: "Incorrect answer." },
      values,
      challenge: newChallenge(),
    };
  }

  // ---- 6. spam score ----
  const cleanMessage = stripHtml(data.message);
  const messageHash = hashMessage(cleanMessage);
  const repeated = await hasRecentMessageHash(messageHash);
  const settings = await getSettings().catch(() => null);

  // Banned keywords are editable in admin; an empty setting means "use the
  // built-in list", which is why this falls back rather than passing [].
  const configuredKeywords = (settings?.bannedKeywords ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const verdict = scoreSubmission({
    name: data.name,
    email: data.email,
    message: cleanMessage,
    repeatedMessage: repeated,
    ...(configuredKeywords.length > 0
      ? { bannedKeywords: configuredKeywords }
      : {}),
  });

  if (verdict.block) {
    console.warn("[contact] submission blocked as spam", {
      score: verdict.score,
      signals: verdict.signals.map((signal) => signal.code),
      links: countLinks(cleanMessage),
    });
    // Same response as success: a spammer learns nothing, and a false positive
    // is recoverable from the log rather than lost to a scary error message.
    return { status: "success", message: "Thanks — your message is on its way." };
  }

  // ---- 7. persist ----
  const meta = await requestMeta();

  let lead;
  try {
    lead = await createLead({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      service: data.service ?? null,
      message: cleanMessage,
      ipHash,
      country: meta.country,
      userAgent: meta.userAgent,
      referrer: meta.referrer,
      sourcePage: "/contact",
      messageHash,
      status: verdict.score > 0 ? "new" : "new",
    });
  } catch (error) {
    console.error("[contact] failed to save lead", error);
    return {
      status: "error",
      message:
        "Something went wrong saving your message. Please try again, or email me directly.",
      values,
      challenge: newChallenge(),
    };
  }

  // ---- 8. notify (best effort, after the write) ----
  const adminBase = await getAdminBase();
  const adminUrl = `${process.env.ADMIN_URL ?? "http://admin.localhost:3000"}${adminBase}/leads/${lead.id}`;

  const summary = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    message: lead.message,
    sourcePage: lead.sourcePage,
    createdAt: lead.createdAt,
  };

  if (hasTelegramConfig() && (settings?.telegramEnabled ?? true)) {
    const result = await sendTelegram(formatLeadForTelegram(summary, adminUrl));
    if (!result.ok) {
      console.error("[contact] telegram notification failed", result.reason);
    }
  }

  if (hasResendConfig() && (settings?.emailEnabled ?? true)) {
    const ownerEmail = settings?.email;
    if (ownerEmail) {
      const email = formatLeadEmail(summary, adminUrl);
      const result = await sendEmail({
        to: ownerEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: lead.email,
      });
      if (!result.ok) {
        console.error("[contact] owner email failed", result.reason);
      }
    }

    const autoReply = formatAutoReply(summary, settings?.name ?? "Junaed Hossain");
    const replyResult = await sendEmail({
      to: lead.email,
      subject: autoReply.subject,
      html: autoReply.html,
      text: autoReply.text,
    });
    if (!replyResult.ok) {
      console.error("[contact] auto-reply failed", replyResult.reason);
    }
  }

  return {
    status: "success",
    message:
      "Thanks — your message was received. I will reply within one business day.",
  };
}

/**
 * Issue a fresh challenge for the form.
 *
 * A server action rather than a route handler so the client can call it
 * directly, and so the secret never leaves the server.
 */
export async function refreshChallenge(): Promise<{
  question: string;
  token: string;
}> {
  return newChallenge();
}
