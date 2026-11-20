import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ==========================================================================
   junaedhossain.com — database schema
   Mirrors MVP.md §3. Drizzle ORM + Neon Postgres.

   Conventions:
   - `serial` primary keys for content tables; `uuid`-style text ids for
     sessions so a token id never reveals row counts.
   - Every timestamp is `timestamptz` and stored in UTC.
   - Soft delete (`deletedAt`) only where the MVP asks for a trash: posts,
     portfolio items, media.
   - No plaintext IPs anywhere: `ipHash` is a salted hash (see lib/security/ip.ts).
   ========================================================================== */

/* ---------------------------------- enums --------------------------------- */

export const userRole = pgEnum("user_role", [
  "owner",
  "admin",
  "editor",
  "support",
]);

export const contentStatus = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const leadStatus = pgEnum("lead_status", [
  "new",
  "read",
  "replied",
  "archived",
  "spam",
]);

export const scriptLocation = pgEnum("script_location", [
  "head",
  "body_start",
  "body_end",
]);

export const alertSeverity = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical",
]);

export const backupStatus = pgEnum("backup_status", [
  "running",
  "success",
  "failed",
]);

/* ---------------------------------- users --------------------------------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("editor"),
    /** TOTP secret, encrypted at rest with ENCRYPTION_KEY. Never logged. */
    totpSecret: text("totp_secret"),
    totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
    /** Hashed one-time recovery codes (Argon2id), JSON array of strings. */
    recoveryCodes: jsonb("recovery_codes").$type<string[]>(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** Random 32-byte id; the cookie carries a separate secret token. */
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 of the session token. The raw token is never stored. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
  ],
);

/** Single-use tokens: password reset, staff invite, email verification. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash),
    index("auth_tokens_user_idx").on(table.userId),
  ],
);

/* ---------------------------------- media --------------------------------- */

export const media = pgTable(
  "media",
  {
    id: serial("id").primaryKey(),
    /** R2 object key. */
    key: text("key").notNull(),
    url: text("url").notNull(),
    mime: varchar("mime", { length: 100 }).notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    title: varchar("title", { length: 200 }),
    caption: text("caption"),
    folder: varchar("folder", { length: 120 }),
    uploadedBy: integer("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("media_key_unique").on(table.key),
    index("media_folder_idx").on(table.folder),
  ],
);

/* ---------------------------------- pages --------------------------------- */

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    /** Stable identifier: home, about, contact, privacy-policy, terms. */
    key: varchar("key", { length: 60 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    /** Typed section blocks — see MVP.md §3.3. */
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    status: contentStatus("status").notNull().default("draft"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    ogImageId: integer("og_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    noindex: boolean("noindex").notNull().default(false),
    updatedBy: integer("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("pages_key_unique").on(table.key)],
);

/* ------------------------------- taxonomy --------------------------------- */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tags_slug_unique").on(table.slug)],
);

/* ---------------------------------- posts --------------------------------- */

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    slug: varchar("slug", { length: 260 }).notNull(),
    excerpt: text("excerpt"),
    /** Tiptap JSON document. */
    content: jsonb("content").$type<Record<string, unknown>>(),
    coverMediaId: integer("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: contentStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    readingMinutes: integer("reading_minutes"),
    wordCount: integer("word_count"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    canonicalUrl: text("canonical_url"),
    ogImageId: integer("og_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    noindex: boolean("noindex").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_status_idx").on(table.status),
    index("posts_published_idx").on(table.publishedAt),
  ],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })],
);

/** Last 10 revisions per post (MVP.md §4.1). */
export const postRevisions = pgTable(
  "post_revisions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    content: jsonb("content").$type<Record<string, unknown>>(),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("post_revisions_post_idx").on(table.postId)],
);

/* ------------------------------- portfolio -------------------------------- */

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    slug: varchar("slug", { length: 260 }).notNull(),
    summary: text("summary"),
    /** Tiptap JSON document for the case study body. */
    content: jsonb("content").$type<Record<string, unknown>>(),
    coverMediaId: integer("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    /** Ordered media ids for the gallery. */
    gallery: jsonb("gallery").$type<number[]>(),
    client: varchar("client", { length: 160 }),
    year: varchar("year", { length: 8 }),
    externalUrl: text("external_url"),
    tags: jsonb("tags").$type<string[]>(),
    results: jsonb("results").$type<{ label: string; value: string }[]>(),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    status: contentStatus("status").notNull().default("draft"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    ogImageId: integer("og_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    noindex: boolean("noindex").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("portfolio_slug_unique").on(table.slug),
    index("portfolio_sort_idx").on(table.sortOrder),
  ],
);

/* -------------------------------- services -------------------------------- */

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    icon: varchar("icon", { length: 16 }),
    summary: text("summary"),
    content: jsonb("content").$type<Record<string, unknown>>(),
    deliverables: jsonb("deliverables").$type<string[]>(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: contentStatus("status").notNull().default("draft"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("services_slug_unique").on(table.slug)],
);

/* ---------------------------------- leads --------------------------------- */

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    service: varchar("service", { length: 80 }),
    message: text("message").notNull(),
    status: leadStatus("status").notNull().default("new"),
    /** Salted hash only — never the raw IP. */
    ipHash: varchar("ip_hash", { length: 64 }),
    country: varchar("country", { length: 2 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    sourcePage: varchar("source_page", { length: 200 }),
    notes: text("notes"),
    /** Hash of the message body, to catch repeated spam. */
    messageHash: varchar("message_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("leads_status_idx").on(table.status),
    index("leads_created_idx").on(table.createdAt),
  ],
);

/* --------------------------------- settings -------------------------------- */

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  /** JSON value; shape depends on the key. */
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: integer("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* --------------------------------- scripts -------------------------------- */

export const scripts = pgTable(
  "scripts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    location: scriptLocation("location").notNull(),
    code: text("code").notNull(),
    /** null = all pages; otherwise a JSON array of path prefixes. */
    pageScope: jsonb("page_scope").$type<string[]>(),
    isActive: boolean("is_active").notNull().default(false),
    /** Previous version kept for rollback (MVP.md §7.2). */
    previousCode: text("previous_code"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("scripts_location_idx").on(table.location)],
);

/* ------------------------------- blocked ips ------------------------------- */

export const blockedIps = pgTable(
  "blocked_ips",
  {
    id: serial("id").primaryKey(),
    /** Single IP or CIDR range. */
    ip: varchar("ip", { length: 64 }).notNull(),
    reason: text("reason"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("blocked_ips_ip_unique").on(table.ip)],
);

/* ------------------------------ activity logs ------------------------------ */

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 80 }).notNull(),
    entity: varchar("entity", { length: 60 }),
    entityId: varchar("entity_id", { length: 60 }),
    /** Before/after summary. Must never contain secrets. */
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_user_idx").on(table.userId),
    index("activity_created_idx").on(table.createdAt),
  ],
);

/* -------------------------------- page views ------------------------------- */

export const pageViews = pgTable(
  "page_views",
  {
    id: serial("id").primaryKey(),
    path: varchar("path", { length: 500 }).notNull(),
    referrer: text("referrer"),
    country: varchar("country", { length: 2 }),
    device: varchar("device", { length: 20 }),
    browser: varchar("browser", { length: 40 }),
    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 120 }),
    /** Salted daily hashes — no raw IP, no persistent identifier. */
    visitorHash: varchar("visitor_hash", { length: 64 }),
    sessionHash: varchar("session_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("page_views_created_idx").on(table.createdAt),
    index("page_views_path_idx").on(table.path),
  ],
);

/* ---------------------------------- alerts -------------------------------- */

export const alerts = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 60 }).notNull(),
    severity: alertSeverity("severity").notNull().default("info"),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("alerts_read_idx").on(table.isRead)],
);

/* -------------------------------- redirects ------------------------------- */

export const redirects = pgTable(
  "redirects",
  {
    id: serial("id").primaryKey(),
    fromPath: varchar("from_path", { length: 500 }).notNull(),
    toPath: varchar("to_path", { length: 500 }).notNull(),
    code: integer("code").notNull().default(301),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("redirects_from_unique").on(table.fromPath)],
);

/* ------------------------------- backups log ------------------------------ */

export const backupsLog = pgTable("backups_log", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 260 }).notNull(),
  size: integer("size"),
  status: backupStatus("status").notNull().default("running"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------- type exports ----------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Media = typeof media.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
