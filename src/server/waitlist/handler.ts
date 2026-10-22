import "server-only";
import { resolveMarketingConsent } from "@/features/waitlist/consent";
import {
  waitlistErrors,
  waitlistRequestSchema,
  waitlistSubmissionSchema,
} from "@/features/waitlist/schema";
import type { WaitlistConfig } from "../env";
import type { RateLimiter } from "./rate-limit";
import { StoreError, type WaitlistRecord, type WaitlistStore } from "./store";

export const MAX_BODY_BYTES = 10_000;
/** Real people take a few seconds to fill in the form. A supplementary signal, not a defence. */
export const MIN_FILL_TIME_MS = 1500;

export interface WaitlistResponse {
  status: number;
  body: { ok: true } | { ok: false; error: string; errors?: Record<string, string> };
  headers?: Record<string, string>;
}

const fail = (status: number, error: string, extra: Partial<WaitlistResponse> = {}): WaitlistResponse => ({
  status,
  body: { ok: false, error },
  ...extra,
});

/**
 * Handles one signup request. Responses never reveal whether an email is already registered: a new
 * signup and a repeat both answer { ok: true }, and a repeat never changes the stored record.
 *
 * The origin check and the spam signals are supplementary. They are not authentication and not
 * rate limiting; durable rate limiting comes from `limiter` (see rate-limit.ts).
 */
export async function handleWaitlistRequest({
  config,
  rawBody,
  contentType,
  origin,
  clientKey,
  store,
  limiter,
  now = new Date(),
  log = console,
}: {
  config: WaitlistConfig;
  rawBody: string;
  contentType: string | null;
  origin: string | null;
  clientKey: string;
  store: WaitlistStore | null;
  limiter: RateLimiter | null;
  now?: Date;
  log?: Pick<Console, "warn" | "error">;
}): Promise<WaitlistResponse> {
  if (config.status !== "enabled" || !store || !limiter) return fail(503, "not_configured");

  if (!contentType?.toLowerCase().startsWith("application/json")) return fail(415, "unsupported_media_type");
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return fail(413, "too_large");
  if (!origin || !config.allowedOrigins.includes(origin)) return fail(403, "forbidden_origin");

  const limit = await limiter.check(clientKey);
  if (!limit.allowed) {
    return fail(429, "rate_limited", { headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return fail(400, "invalid_body");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return fail(400, "invalid_body");

  // Spam signals are rejected openly (never a fake success), so a real person can retry.
  const envelope = waitlistRequestSchema.safeParse(json);
  if (!envelope.success || envelope.data.hy_check.trim()) return fail(400, "rejected");
  if (envelope.data.elapsedMs !== undefined && envelope.data.elapsedMs < MIN_FILL_TIME_MS) return fail(400, "rejected");

  const parsed = waitlistSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return { status: 422, body: { ok: false, error: "invalid_fields", errors: waitlistErrors(parsed.error) } };
  }
  const submission = parsed.data;

  // Consent wording comes from the server's approved registry, never from the browser.
  let consent: { version: string; text: string } | null = null;
  if (submission.marketingConsent) {
    consent = resolveMarketingConsent(submission.consentVersion, submission.locale);
    if (!consent) {
      return { status: 422, body: { ok: false, error: "invalid_fields", errors: { marketingConsent: "consent_outdated" } } };
    }
  }

  const record: WaitlistRecord = {
    audience: submission.audience,
    email: submission.email,
    city: submission.city,
    neighborhood: submission.neighborhood || null,
    locale: submission.locale,
    answers:
      submission.audience === "customer"
        ? { meals_wanted: submission.mealsWanted || null }
        : { dishes: submission.dishes, food_business_experience: submission.foodBusinessExperience || null },
    marketing_consent: Boolean(consent),
    marketing_consent_text: consent?.text ?? null,
    marketing_consent_version: consent?.version ?? null,
    marketing_consent_at: consent ? now.toISOString() : null,
  };

  try {
    await store.insertIfNew(record);
  } catch (error) {
    // Log the failure kind only: request bodies contain personal data.
    log.error(`[waitlist] storage failed: ${error instanceof StoreError ? error.status : "unknown"}`);
    return fail(502, "store_failed");
  }
  return { status: 200, body: { ok: true } };
}
