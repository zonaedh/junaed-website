/**
 * Settings registry — pure, no database import.
 *
 * Split out of lib/settings.ts on purpose (B1): a `"use client"` form must be
 * able to import the field definitions and types without dragging the `pg`
 * driver into the browser bundle, which fails the build. This file has no
 * server-only dependency, so both the client form and the server reader can
 * import it.
 */

export type SettingKind =
  | "text"
  | "textarea"
  | "email"
  | "boolean"
  | "number"
  | "image";

export type SettingDefinition = {
  key: string;
  label: string;
  kind: SettingKind;
  /** Grouping in the admin form. */
  group: "Identity" | "Contact" | "SEO" | "Footer" | "System";
  help?: string;
  placeholder?: string;
  /** Used when the row is missing or unreadable. */
  default: string | number | boolean;
  maxLength?: number;
};

/**
 * The single source of truth. Order here is the order in the admin form.
 */
export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "site.name",
    label: "Site name",
    kind: "text",
    group: "Identity",
    default: "Junaed Hossain",
    maxLength: 120,
    help: "Used in the header, footer, page titles and emails.",
  },
  {
    key: "site.shortName",
    label: "Short name / initials",
    kind: "text",
    group: "Identity",
    default: "JH",
    maxLength: 4,
    help: "One or two characters for the logo mark.",
  },
  {
    key: "site.tagline",
    label: "Tagline",
    kind: "text",
    group: "Identity",
    default: "Digital solutions for growing brands",
    maxLength: 160,
    help: "The eyebrow line above the hero heading.",
  },
  {
    key: "site.description",
    label: "Site description",
    kind: "textarea",
    group: "Identity",
    default:
      "Digital marketing, SEO, graphic design and WordPress customization.",
    maxLength: 320,
    help: "Default meta description when a page has none of its own.",
  },
  {
    key: "site.logo",
    label: "Logo",
    kind: "image",
    group: "Identity",
    default: "",
    help: "Optional. When empty the site uses the initials mark.",
  },
  {
    key: "site.favicon",
    label: "Favicon",
    kind: "image",
    group: "Identity",
    default: "",
    help: "Square PNG or SVG, at least 64×64.",
  },
  {
    key: "site.email",
    label: "Contact email",
    kind: "email",
    group: "Contact",
    default: "hello@junaedhossain.com",
    maxLength: 254,
    help: "Shown on the contact page and used as the reply-to address.",
  },
  {
    key: "site.phone",
    label: "Phone",
    kind: "text",
    group: "Contact",
    default: "",
    maxLength: 40,
    help: "Optional. Leave blank to hide it on the contact page.",
  },
  {
    key: "site.timezone",
    label: "Timezone",
    kind: "text",
    group: "Contact",
    default: "Asia/Dhaka",
    maxLength: 60,
    help: "IANA name, e.g. Asia/Dhaka. Used for scheduled publishing.",
  },
  {
    key: "seo.titleTemplate",
    label: "Title template",
    kind: "text",
    group: "SEO",
    default: "%s | Junaed Hossain",
    maxLength: 120,
    help: "%s is replaced with the page title.",
  },
  {
    key: "seo.defaultDescription",
    label: "Default meta description",
    kind: "textarea",
    group: "SEO",
    default:
      "Digital marketing, SEO, graphic design and WordPress customization for growing brands.",
    maxLength: 320,
  },
  {
    key: "footer.text",
    label: "Footer text",
    kind: "text",
    group: "Footer",
    default: "Crafted with care.",
    maxLength: 160,
    help: "Appears after the copyright line.",
  },
  {
    key: "email.fromName",
    label: "Email sender name",
    kind: "text",
    group: "System",
    default: "Junaed Hossain",
    maxLength: 120,
  },
  {
    key: "email.fromAddress",
    label: "Email sender address",
    kind: "email",
    group: "System",
    default: "hello@junaedhossain.com",
    maxLength: 254,
  },
  {
    key: "analytics.retentionMonths",
    label: "Analytics retention (months)",
    kind: "number",
    group: "System",
    default: 12,
    help: "How long first-party page view data is kept.",
  },
  {
    key: "maintenance.enabled",
    label: "Maintenance mode",
    kind: "boolean",
    group: "System",
    default: false,
    help: "When on, the public site shows a maintenance notice.",
  },
  {
    key: "contact.bannedKeywords",
    label: "Spam keywords",
    kind: "textarea",
    group: "Contact",
    default: "",
    maxLength: 4000,
    help: "One per line. A message containing these scores as spam. Leave empty to use the built-in list.",
  },
  {
    key: "notify.telegramEnabled",
    label: "Telegram notifications",
    kind: "boolean",
    group: "Contact",
    default: true,
    help: "Send a Telegram message for each new enquiry. Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
  },
  {
    key: "notify.emailEnabled",
    label: "Email notifications",
    kind: "boolean",
    group: "Contact",
    default: true,
    help: "Email you and auto-reply to the visitor. Requires RESEND_API_KEY.",
  },
] as const;

export const SETTING_GROUPS = [
  "Identity",
  "Contact",
  "SEO",
  "Footer",
  "System",
] as const;

export type SettingKey = (typeof SETTING_DEFINITIONS)[number]["key"];

const BY_KEY = new Map<string, SettingDefinition>(
  SETTING_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function settingDefinition(key: string): SettingDefinition | undefined {
  return BY_KEY.get(key);
}

/** Every setting, resolved and typed. Never contains `undefined`. */
export type SiteSettings = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  logo: string;
  favicon: string;
  email: string;
  phone: string;
  timezone: string;
  titleTemplate: string;
  defaultDescription: string;
  footerText: string;
  emailFromName: string;
  emailFromAddress: string;
  analyticsRetentionMonths: number;
  maintenanceEnabled: boolean;
  bannedKeywords: string;
  telegramEnabled: boolean;
  emailEnabled: boolean;
};

/** Map a registry key to the field name on SiteSettings. */
export const SETTING_FIELD_NAMES: Record<string, keyof SiteSettings> = {
  "site.name": "name",
  "site.shortName": "shortName",
  "site.tagline": "tagline",
  "site.description": "description",
  "site.logo": "logo",
  "site.favicon": "favicon",
  "site.email": "email",
  "site.phone": "phone",
  "site.timezone": "timezone",
  "seo.titleTemplate": "titleTemplate",
  "seo.defaultDescription": "defaultDescription",
  "footer.text": "footerText",
  "email.fromName": "emailFromName",
  "email.fromAddress": "emailFromAddress",
  "analytics.retentionMonths": "analyticsRetentionMonths",
  "maintenance.enabled": "maintenanceEnabled",
  "contact.bannedKeywords": "bannedKeywords",
  "notify.telegramEnabled": "telegramEnabled",
  "notify.emailEnabled": "emailEnabled",
};

/**
 * Coerce a stored JSONB value to the type the definition promises.
 *
 * A row can be anything: written by an older version, edited by hand, or
 * corrupted. Rather than trusting it, every value passes through here and
 * falls back to the documented default when it does not fit.
 */
export function coerceSetting(
  definition: SettingDefinition,
  raw: unknown,
): string | number | boolean {
  if (raw === null || raw === undefined) return definition.default;

  switch (definition.kind) {
    case "boolean":
      return typeof raw === "boolean" ? raw : definition.default;
    case "number": {
      const value = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(value) ? value : definition.default;
    }
    default:
      return typeof raw === "string" ? raw : definition.default;
  }
}

/** Build the typed object from raw rows. Pure — used by the reader and tests. */
export function resolveSettings(
  rows: { key: string; value: unknown }[],
): SiteSettings {
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const resolved = {} as Record<keyof SiteSettings, string | number | boolean>;

  for (const definition of SETTING_DEFINITIONS) {
    const field = SETTING_FIELD_NAMES[definition.key];
    if (!field) continue;
    resolved[field] = coerceSetting(definition, stored.get(definition.key));
  }

  return resolved as SiteSettings;
}
