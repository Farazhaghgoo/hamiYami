import "server-only";
import type { RateLimitMode } from "../env";

/**
 * Integration point for rate limiting signup requests. Production needs a durable limiter shared by
 * every server instance (a platform/WAF rule, or a store such as Redis). Implement this interface
 * for the chosen service; the handler calls it before doing any work.
 */
export interface RateLimiter {
  check(clientKey: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }>;
}

/** "platform": limits are enforced before requests reach the app (e.g. a Vercel Firewall rule). */
export const platformRateLimiter: RateLimiter = {
  async check() {
    return { allowed: true };
  },
};

/**
 * Development only. Memory is per process: on serverless hosting every instance (and every cold
 * start) has its own counters, so this offers no real protection there. Client keys are kept only
 * in memory for the window and never logged.
 */
export function createMemoryRateLimiter({ limit = 5, windowMs = 60_000 } = {}): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    async check(clientKey) {
      const now = Date.now();
      const entry = hits.get(clientKey);
      if (!entry || entry.resetAt <= now) {
        hits.set(clientKey, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }
      entry.count += 1;
      if (entry.count > limit) return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
      return { allowed: true };
    },
  };
}

let devLimiter: RateLimiter | null = null;

export function rateLimiterFor(mode: RateLimitMode): RateLimiter {
  if (mode === "platform") return platformRateLimiter;
  devLimiter ??= createMemoryRateLimiter();
  return devLimiter;
}
