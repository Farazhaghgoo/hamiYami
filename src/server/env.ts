import { z } from "zod";

/*
 * Server configuration, validated once. Real signup collection is OFF unless every requirement is
 * met; there is no partially working mode. This file must stay free of path aliases and of
 * "server-only" because next.config.ts imports it to fail the build on invalid configuration.
 *
 * Never expose these values to the browser: none of them uses the NEXT_PUBLIC_ prefix.
 */

const flag = z
  .enum(["true", "false", ""])
  .optional()
  .transform((value) => value === "true");

const rawEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  WAITLIST_COLLECTION_ENABLED: flag,
  /** Operator confirmation that a real Privacy Notice is published at /privacy. */
  PRIVACY_NOTICE_PUBLISHED: flag,
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  WAITLIST_ALLOWED_ORIGINS: z.string().optional(),
  /**
   * How signup requests are rate-limited:
   *  - "platform": a durable limit is configured outside the app (e.g. a Vercel Firewall rule on
   *    /api/waitlist). The app cannot verify this; it records the operator's confirmation.
   *  - "memory-dev": an in-memory limiter for local development only. It is NOT durable on
   *    serverless hosting (each instance has its own memory) and is refused in production.
   *  - unset: no rate limiting, so collection cannot be enabled.
   */
  WAITLIST_RATE_LIMIT: z.enum(["platform", "memory-dev", ""]).optional(),
});

export type RateLimitMode = "platform" | "memory-dev";

export type WaitlistConfig =
  | { status: "disabled" }
  | { status: "misconfigured"; problems: string[] }
  | {
      status: "enabled";
      supabaseUrl: string;
      supabaseSecretKey: string;
      allowedOrigins: string[];
      rateLimit: RateLimitMode;
    };

export function parseOrigins(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parseWaitlistConfig(env: Record<string, string | undefined>): WaitlistConfig {
  const parsed = rawEnvSchema.safeParse(env);
  if (!parsed.success) {
    // Report variable names only, never values.
    return { status: "misconfigured", problems: parsed.error.issues.map((i) => `${String(i.path[0])} is invalid`) };
  }
  const e = parsed.data;
  if (!e.WAITLIST_COLLECTION_ENABLED) return { status: "disabled" };

  const problems: string[] = [];
  if (!e.PRIVACY_NOTICE_PUBLISHED) problems.push("PRIVACY_NOTICE_PUBLISHED must be true (publish the real notice first)");

  let supabaseUrl = "";
  try {
    const url = new URL(e.SUPABASE_URL ?? "");
    if (url.protocol !== "https:") throw new Error();
    supabaseUrl = url.origin;
  } catch {
    problems.push("SUPABASE_URL must be an https URL");
  }
  if (!e.SUPABASE_SECRET_KEY || e.SUPABASE_SECRET_KEY.length < 20) problems.push("SUPABASE_SECRET_KEY is missing");

  const allowedOrigins = parseOrigins(e.WAITLIST_ALLOWED_ORIGINS);
  if (!allowedOrigins.length) problems.push("WAITLIST_ALLOWED_ORIGINS must list the site's origin(s)");

  const rateLimit = e.WAITLIST_RATE_LIMIT || undefined;
  if (!rateLimit) problems.push("WAITLIST_RATE_LIMIT must be set (see .env.example)");
  if (rateLimit === "memory-dev" && e.NODE_ENV === "production") {
    problems.push("WAITLIST_RATE_LIMIT=memory-dev is not durable and is refused in production");
  }

  if (problems.length || !rateLimit) return { status: "misconfigured", problems };
  return {
    status: "enabled",
    supabaseUrl,
    supabaseSecretKey: e.SUPABASE_SECRET_KEY!,
    allowedOrigins,
    rateLimit,
  };
}

/** Throws a readable error when collection was switched on without everything it needs. */
export function assertValidConfig(env: Record<string, string | undefined>): void {
  const config = parseWaitlistConfig(env);
  if (config.status === "misconfigured") {
    throw new Error(
      `Signup collection is enabled but misconfigured:\n- ${config.problems.join("\n- ")}\n` +
        "Fix these variables or set WAITLIST_COLLECTION_ENABLED=false.",
    );
  }
}
