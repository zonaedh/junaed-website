/**
 * Outbound notifications — Telegram and Resend, both optional.
 *
 * SERVER ONLY.
 *
 * Every function here degrades to "not configured" rather than throwing. A
 * missing Telegram token must not lose a lead: the lead is already in the
 * database by the time these run, and the notification is a convenience on top
 * of that. The one thing these functions must never do is make the visitor's
 * submission fail.
 *
 * Nothing here is called from the client. Tokens stay server-side.
 */

export type DeliveryResult =
  | { ok: true; channel: "telegram" | "email"; id?: string }
  | { ok: false; channel: "telegram" | "email"; reason: string };

/* --------------------------------- telegram -------------------------------- */

export function hasTelegramConfig(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Send a message to the configured Telegram chat.
 *
 * Plain text, no parse_mode: lead content is user-supplied, and Telegram's
 * Markdown parser will reject the whole message if it contains an unbalanced
 * `*` or `_`. Escaping it correctly is more fragile than not using it.
 */
export async function sendTelegram(text: string): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, channel: "telegram", reason: "not configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        channel: "telegram",
        reason: `HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    const data = (await response.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    if (!data.ok) {
      return { ok: false, channel: "telegram", reason: "API returned ok:false" };
    }
    return {
      ok: true,
      channel: "telegram",
      id: data.result?.message_id ? String(data.result.message_id) : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      channel: "telegram",
      reason: error instanceof Error ? error.message : "unknown error",
    };
  }
}

/* ---------------------------------- resend --------------------------------- */

export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/**
 * Send one email through Resend's REST API.
 *
 * Called directly rather than through the SDK: it is one POST, and the SDK
 * would be a dependency carried for a single endpoint.
 */
export async function sendEmail(message: EmailMessage): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, channel: "email", reason: "not configured" };
  }

  const from = process.env.EMAIL_FROM ?? "Junaed Hossain <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        channel: "email",
        reason: `HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, channel: "email", id: data.id };
  } catch (error) {
    return {
      ok: false,
      channel: "email",
      reason: error instanceof Error ? error.message : "unknown error",
    };
  }
}

/* -------------------------------- formatting ------------------------------- */

/** Escape text for safe interpolation into HTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type LeadSummary = {
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message: string;
  sourcePage?: string | null;
  createdAt: Date;
};

/** The Telegram message for a new lead. */
export function formatLeadForTelegram(lead: LeadSummary, adminUrl: string): string {
  const lines = [
    "New enquiry",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
  ];
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  if (lead.service) lines.push(`Service: ${lead.service}`);
  if (lead.sourcePage) lines.push(`From: ${lead.sourcePage}`);
  lines.push("", lead.message.length > 600 ? `${lead.message.slice(0, 600)}…` : lead.message);
  lines.push("", `Open in admin: ${adminUrl}`);
  return lines.join("\n");
}

/** The notification email to the site owner. */
export function formatLeadEmail(lead: LeadSummary, adminUrl: string) {
  const safeMessage = escapeHtml(lead.message).replace(/\n/g, "<br>");
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1730">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e3ef;border-radius:16px;padding:24px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b6480">New enquiry</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(lead.name)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <tr><td style="padding:4px 0;color:#6b6480;width:90px">Email</td><td style="padding:4px 0"><a href="mailto:${escapeHtml(lead.email)}" style="color:#5b3fd1">${escapeHtml(lead.email)}</a></td></tr>
      ${lead.phone ? `<tr><td style="padding:4px 0;color:#6b6480">Phone</td><td style="padding:4px 0">${escapeHtml(lead.phone)}</td></tr>` : ""}
      ${lead.service ? `<tr><td style="padding:4px 0;color:#6b6480">Service</td><td style="padding:4px 0">${escapeHtml(lead.service)}</td></tr>` : ""}
      ${lead.sourcePage ? `<tr><td style="padding:4px 0;color:#6b6480">From</td><td style="padding:4px 0">${escapeHtml(lead.sourcePage)}</td></tr>` : ""}
    </table>
    <div style="border-top:1px solid #e6e3ef;padding-top:16px;font-size:15px;line-height:1.65">${safeMessage}</div>
    <p style="margin:24px 0 0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2a1a5e;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:600">Open in admin</a></p>
  </div>
</body></html>`;

  const text = [
    "New enquiry",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : "",
    lead.service ? `Service: ${lead.service}` : "",
    lead.sourcePage ? `From: ${lead.sourcePage}` : "",
    "",
    lead.message,
    "",
    `Open in admin: ${adminUrl}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `New enquiry from ${lead.name}`,
    html,
    text,
  };
}

/** The acknowledgement sent to the visitor. */
export function formatAutoReply(lead: LeadSummary, siteName: string) {
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f5fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1730">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e3ef;border-radius:16px;padding:24px">
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">Thanks, ${escapeHtml(lead.name.split(" ")[0] ?? lead.name)}</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7">Your message reached me. I read every enquiry myself and normally reply within one business day.</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7">For reference, here is what you sent:</p>
    <blockquote style="margin:0 0 18px;padding:12px 16px;border-left:3px solid #d8d2ea;background:#faf9fd;font-size:14px;line-height:1.65;color:#4a4460">${escapeHtml(lead.message).replace(/\n/g, "<br>")}</blockquote>
    <p style="margin:0;font-size:15px;line-height:1.7">— ${escapeHtml(siteName)}</p>
  </div>
</body></html>`;

  const text = [
    `Thanks, ${lead.name.split(" ")[0] ?? lead.name}`,
    "",
    "Your message reached me. I read every enquiry myself and normally reply within one business day.",
    "",
    "For reference, here is what you sent:",
    "",
    lead.message,
    "",
    `— ${siteName}`,
  ].join("\n");

  return { subject: `Thanks for getting in touch — ${siteName}`, html, text };
}
