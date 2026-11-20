import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * Import this ONLY from server code. It throws at import time if a required
 * variable is missing, so a misconfigured deploy fails loudly at boot rather
 * than silently at 3am.
 *
 * Phase 2 requires: DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY.
 * Later phases add their own keys — they are optional here so that Phases 2–4
 * can run before Resend/R2/Upstash exist.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ---- required in Phase 2 ----
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  IP_HASH_SALT: z.string().min(16, "IP_HASH_SALT must be at least 16 characters"),

  // ---- optional until their phase ----
  DATABASE_URL_UNPOOLED: z.string().optional(),
  ADMIN_URL: z.string().url().default("http://admin.localhost:3000"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  CAPTCHA_SECRET: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  SEED_OWNER_EMAIL: z.string().email().optional(),
  SEED_OWNER_PASSWORD: z.string().min(12).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nSee .env.example.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** True when the app has everything Phase 2 needs. Used by health checks. */
export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
