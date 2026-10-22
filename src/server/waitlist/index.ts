import "server-only";
import { parseWaitlistConfig, type WaitlistConfig } from "../env";
import { rateLimiterFor, type RateLimiter } from "./rate-limit";
import { supabaseWaitlistStore, type WaitlistStore } from "./store";

/** Resolves the waitlist services for this server, or nulls when collection is not enabled. */
export function getWaitlistServices(env: Record<string, string | undefined> = process.env): {
  config: WaitlistConfig;
  store: WaitlistStore | null;
  limiter: RateLimiter | null;
} {
  const config = parseWaitlistConfig(env);
  if (config.status !== "enabled") return { config, store: null, limiter: null };
  return {
    config,
    store: supabaseWaitlistStore({ url: config.supabaseUrl, secretKey: config.supabaseSecretKey }),
    limiter: rateLimiterFor(config.rateLimit),
  };
}

/** Whether pages should offer real submission. Safe to pass to client components (a boolean). */
export function isWaitlistCollectionEnabled(): boolean {
  return parseWaitlistConfig(process.env).status === "enabled";
}
