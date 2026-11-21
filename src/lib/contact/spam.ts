/**
 * Spam scoring — pure functions, no I/O.
 *
 * Split out from the action so it can be unit-tested without a database, a
 * network or a clock. The action decides what to do with the score; this file
 * only decides what the score is.
 *
 * The design principle: never reject on a single weak signal. A message with
 * one link is normal. A message with one link, a disposable domain, three
 * banned keywords and a repeated body is not. Signals are weighted and summed,
 * and only a high total blocks.
 */

export type SpamSignal = {
  code: string;
  weight: number;
  detail: string;
};

export type SpamVerdict = {
  score: number;
  signals: SpamSignal[];
  /** True when the score crosses the block threshold. */
  block: boolean;
};

/** Score at or above this is treated as spam. */
export const SPAM_BLOCK_THRESHOLD = 6;

/**
 * Disposable / throwaway email providers.
 *
 * Not exhaustive and never will be — the list churns constantly. It catches
 * the common ones, which is most of the volume. Kept short on purpose: a long
 * list is a maintenance liability and a false-positive risk.
 */
export const DISPOSABLE_DOMAINS: readonly string[] = [
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "mailinator.com",
  "maildrop.cc",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "spam4.me",
  "grr.la",
  "tempr.email",
  "discard.email",
  "emailondeck.com",
];

/**
 * Default banned keywords. Editable in admin (stored as a setting), so this is
 * only the fallback when that setting is missing.
 */
export const DEFAULT_BANNED_KEYWORDS: readonly string[] = [
  "casino",
  "viagra",
  "cialis",
  "crypto giveaway",
  "bitcoin doubler",
  "seo services cheap",
  "buy backlinks",
  "guest post price",
  "loan offer",
  "work from home earn",
  "click here to claim",
  "limited time offer",
  "100% free",
  "act now",
  "risk free",
];

/** Links beyond this count start scoring. Overridable from settings. */
const LINK_FREE_ALLOWANCE = 1;

export type SpamInput = {
  name: string;
  email: string;
  message: string;
  /** Banned keywords from settings, or the default list. */
  bannedKeywords?: readonly string[];
  /** True when this exact message hash already exists in the leads table. */
  repeatedMessage?: boolean;
  /**
   * Links allowed before scoring starts. From Settings → Security; falls back
   * to one, which is normal for a signature.
   */
  maxLinks?: number;
  /**
   * When true, a disposable domain blocks outright instead of adding weight.
   * From Settings → Security.
   */
  blockDisposableEmail?: boolean;
};

/** Count URLs and bare domains in a block of text. */
export function countLinks(text: string): number {
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  const wwwPattern = /\bwww\.[^\s<>"']+/gi;
  // A bare domain like "example.com/path" — require a known-ish TLD shape so
  // ordinary prose ("e.g. this.that") does not count.
  const barePattern =
    /\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|io|ru|cn|xyz|top|info|biz|link|click|shop|site|online)\b(?:\/[^\s<>"']*)?/gi;

  // Order matters. A full URL also contains a bare domain, so the URL is
  // matched and removed first; otherwise "https://a.com" counts twice and the
  // score inflates on a single link.
  const found = new Set<string>();

  const withoutUrls = text.replace(urlPattern, (match) => {
    found.add(match.toLowerCase());
    return " ";
  });

  const withoutWww = withoutUrls.replace(wwwPattern, (match) => {
    found.add(match.toLowerCase());
    return " ";
  });

  for (const match of withoutWww.matchAll(barePattern)) {
    found.add(match[0].toLowerCase());
  }

  return found.size;
}

/** True when the email's domain is a known disposable provider. */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.some(
    (disposable) => domain === disposable || domain.endsWith(`.${disposable}`),
  );
}

/**
 * Score a submission.
 *
 * Weights are deliberately round numbers: the point is to separate "obviously
 * automated" from "a person with a link in their signature", not to be precise.
 */
export function scoreSubmission(input: SpamInput): SpamVerdict {
  const signals: SpamSignal[] = [];
  const message = input.message;
  const lower = message.toLowerCase();

  // --- links ---
  const allowance = Math.max(0, input.maxLinks ?? LINK_FREE_ALLOWANCE);
  const links = countLinks(message);
  if (links > allowance) {
    const excess = links - allowance;
    signals.push({
      code: "links",
      weight: Math.min(excess * 2, 6),
      detail: `${links} links in the message`,
    });
  }

  // --- banned keywords ---
  const keywords = input.bannedKeywords ?? DEFAULT_BANNED_KEYWORDS;
  const hits = keywords.filter((keyword) => {
    const needle = keyword.toLowerCase().trim();
    return needle !== "" && lower.includes(needle);
  });
  if (hits.length > 0) {
    signals.push({
      code: "keywords",
      weight: Math.min(hits.length * 2, 6),
      detail: `banned keywords: ${hits.join(", ")}`,
    });
  }

  // --- disposable email ---
  if (isDisposableEmail(input.email)) {
    signals.push({
      code: "disposable_email",
      // A hard block when the owner asked for one, otherwise a strong signal.
      weight: input.blockDisposableEmail ? SPAM_BLOCK_THRESHOLD : 4,
      detail: "disposable email domain",
    });
  }

  // --- repeated body ---
  if (input.repeatedMessage) {
    signals.push({
      code: "repeated_message",
      weight: 5,
      detail: "identical message already submitted",
    });
  }

  // --- shouting ---
  const letters = message.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.7) {
      signals.push({
        code: "shouting",
        weight: 2,
        detail: "mostly uppercase",
      });
    }
  }

  // --- link-dense short message ---
  if (links >= 2 && message.length < 120) {
    signals.push({
      code: "link_dense",
      weight: 3,
      detail: "short message that is mostly links",
    });
  }

  const score = signals.reduce((total, signal) => total + signal.weight, 0);

  return { score, signals, block: score >= SPAM_BLOCK_THRESHOLD };
}

/**
 * Strip HTML from user input.
 *
 * The message is stored as plain text and rendered as text, so this is defence
 * in depth rather than the only guard. It removes tags and collapses the
 * whitespace they leave behind.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
