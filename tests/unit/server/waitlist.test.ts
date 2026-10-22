import { describe, expect, it, vi } from "vitest";
import { CURRENT_MARKETING_CONSENT, marketingConsentText } from "@/features/waitlist/consent";
import { waitlistErrors, waitlistSubmissionSchema } from "@/features/waitlist/schema";
import { assertValidConfig, parseWaitlistConfig, type WaitlistConfig } from "@/server/env";
import { handleWaitlistRequest } from "@/server/waitlist/handler";
import { createMemoryRateLimiter, platformRateLimiter } from "@/server/waitlist/rate-limit";
import { StoreError, supabaseWaitlistStore, type WaitlistRecord, type WaitlistStore } from "@/server/waitlist/store";

const ORIGIN = "https://hamiyami.example";

const enabled: WaitlistConfig = {
  status: "enabled",
  supabaseUrl: "https://project.supabase.co",
  supabaseSecretKey: "sb_secret_0123456789abcdef",
  allowedOrigins: [ORIGIN],
  rateLimit: "platform",
};

const customer = {
  audience: "customer",
  email: "  Person@Example.com ",
  city: "Torino",
  neighborhood: "",
  mealsWanted: "Zuppe",
  marketingConsent: false,
  consentVersion: CURRENT_MARKETING_CONSENT,
  locale: "it",
  hy_check: "",
  elapsedMs: 9000,
};

/** Behaves like the database: unique (email, audience), duplicates ignored, never updated. */
function memoryStore() {
  const rows: WaitlistRecord[] = [];
  const store: WaitlistStore = {
    async insertIfNew(record) {
      if (!rows.some((r) => r.email === record.email && r.audience === record.audience)) rows.push(record);
    },
  };
  return { rows, store };
}

function request(body: unknown, overrides: Partial<Parameters<typeof handleWaitlistRequest>[0]> = {}) {
  const { store } = memoryStore();
  return handleWaitlistRequest({
    config: enabled,
    rawBody: typeof body === "string" ? body : JSON.stringify(body),
    contentType: "application/json",
    origin: ORIGIN,
    clientKey: "203.0.113.1",
    store,
    limiter: platformRateLimiter,
    now: new Date("2026-10-22T10:00:00Z"),
    log: { warn: () => {}, error: () => {} },
    ...overrides,
  });
}

describe("waitlist schema (shared by browser and server)", () => {
  it("normalises email and whitespace", () => {
    const parsed = waitlistSubmissionSchema.parse({ ...customer, city: "  Torino \n" });
    expect(parsed.email).toBe("person@example.com");
    expect(parsed.city).toBe("Torino");
  });

  it("returns error codes per field", () => {
    const result = waitlistSubmissionSchema.safeParse({ audience: "cook", email: "nope@", city: "", dishes: " " });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(waitlistErrors(result.error)).toMatchObject({
      email: "email_invalid",
      city: "city_required",
      dishes: "dishes_required",
    });
  });

  it("rejects unknown audiences and experience options", () => {
    expect(waitlistSubmissionSchema.safeParse({ ...customer, audience: "admin" }).success).toBe(false);
    const cook = { ...customer, audience: "cook", dishes: "Pasta", foodBusinessExperience: "chef" };
    expect(waitlistSubmissionSchema.safeParse(cook).success).toBe(false);
  });
});

describe("waitlist configuration", () => {
  it("is disabled by default", () => {
    expect(parseWaitlistConfig({})).toEqual({ status: "disabled" });
    expect(() => assertValidConfig({})).not.toThrow();
  });

  it("refuses to enable collection with missing services", () => {
    const config = parseWaitlistConfig({ WAITLIST_COLLECTION_ENABLED: "true" });
    expect(config.status).toBe("misconfigured");
    expect(() => assertValidConfig({ WAITLIST_COLLECTION_ENABLED: "true" })).toThrow(/SUPABASE_URL/);
  });

  it("never accepts the in-memory limiter in production", () => {
    const env = {
      NODE_ENV: "production",
      WAITLIST_COLLECTION_ENABLED: "true",
      PRIVACY_NOTICE_PUBLISHED: "true",
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_0123456789abcdef",
      WAITLIST_ALLOWED_ORIGINS: ORIGIN,
      WAITLIST_RATE_LIMIT: "memory-dev",
    };
    expect(parseWaitlistConfig(env).status).toBe("misconfigured");
    expect(parseWaitlistConfig({ ...env, WAITLIST_RATE_LIMIT: "platform" }).status).toBe("enabled");
  });

  it("does not echo secret values in problems", () => {
    const config = parseWaitlistConfig({ WAITLIST_COLLECTION_ENABLED: "true", SUPABASE_URL: "http://insecure.example" });
    expect(JSON.stringify(config)).not.toContain("insecure.example");
  });
});

describe("waitlist request handling", () => {
  it("answers not_configured and stores nothing when collection is off", async () => {
    const { rows, store } = memoryStore();
    const result = await request(customer, { config: { status: "disabled" }, store });
    expect(result).toMatchObject({ status: 503, body: { ok: false, error: "not_configured" } });
    expect(rows).toHaveLength(0);
  });

  it("stores a valid signup with server-side normalisation", async () => {
    const { rows, store } = memoryStore();
    const result = await request(customer, { store });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(rows[0]).toMatchObject({
      email: "person@example.com",
      neighborhood: null,
      answers: { meals_wanted: "Zuppe" },
      marketing_consent: false,
      marketing_consent_text: null,
    });
  });

  it("never lets an unverified repeat submission change an existing record, and answers the same", async () => {
    const { rows, store } = memoryStore();
    const first = await request(customer, { store });
    const repeat = await request({ ...customer, city: "Milano", marketingConsent: true }, { store });
    expect(repeat).toEqual(first);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ city: "Torino", marketing_consent: false });
  });

  it("stores approved consent wording from the server, ignoring any text sent by the browser", async () => {
    const { rows, store } = memoryStore();
    await request(
      { ...customer, marketingConsent: true, locale: "en", consentText: "I agree to everything", consentVersion: CURRENT_MARKETING_CONSENT },
      { store },
    );
    expect(rows[0]).toMatchObject({
      marketing_consent: true,
      marketing_consent_text: marketingConsentText("en"),
      marketing_consent_version: CURRENT_MARKETING_CONSENT,
      marketing_consent_at: "2026-10-22T10:00:00.000Z",
    });
    expect(JSON.stringify(rows[0])).not.toContain("I agree to everything");
  });

  it("refuses consent for an unknown wording version", async () => {
    const result = await request({ ...customer, marketingConsent: true, consentVersion: "made-up" });
    expect(result).toMatchObject({ status: 422, body: { errors: { marketingConsent: "consent_outdated" } } });
  });

  it("returns field errors for invalid input", async () => {
    const result = await request({ ...customer, email: "nope@", city: "" });
    expect(result).toMatchObject({ status: 422, body: { errors: { email: "email_invalid", city: "city_required" } } });
  });

  it("rejects requests from other origins, wrong content types and oversized bodies", async () => {
    expect((await request(customer, { origin: "https://evil.example" })).status).toBe(403);
    expect((await request(customer, { origin: null })).status).toBe(403);
    expect((await request(customer, { contentType: "text/plain" })).status).toBe(415);
    expect((await request({ ...customer, mealsWanted: "x".repeat(12_000) })).status).toBe(413);
    expect((await request("{not json")).status).toBe(400);
  });

  it("rejects the spam trap and too-fast submissions openly", async () => {
    const { rows, store } = memoryStore();
    expect((await request({ ...customer, hy_check: "bot" }, { store })).body).toEqual({ ok: false, error: "rejected" });
    expect((await request({ ...customer, elapsedMs: 300 }, { store })).status).toBe(400);
    expect(rows).toHaveLength(0);
  });

  it("applies the rate limiter before doing any work", async () => {
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    const { rows, store } = memoryStore();
    for (let i = 0; i < 2; i++) await request({ ...customer, email: `p${i}@example.com` }, { limiter, store });
    const third = await request({ ...customer, email: "p3@example.com" }, { limiter, store });
    expect(third.status).toBe(429);
    expect(third.headers?.["Retry-After"]).toBeDefined();
    expect(rows).toHaveLength(2);
  });

  it("reports storage failures as errors without logging personal data", async () => {
    const error = vi.fn();
    const failing: WaitlistStore = {
      async insertIfNew() {
        throw new StoreError(500);
      },
    };
    const result = await request(customer, { store: failing, log: { warn: () => {}, error } });
    expect(result).toMatchObject({ status: 502, body: { ok: false } });
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).not.toContain("example.com");
  });
});

describe("Supabase store", () => {
  it("inserts without overwriting duplicates and with a timeout", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }));
    const store = supabaseWaitlistStore({ url: "https://p.supabase.co", secretKey: "sb_secret_x", fetchImpl });
    await store.insertIfNew({} as WaitlistRecord);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://p.supabase.co/rest/v1/waitlist_signups?on_conflict=email,audience");
    expect((init.headers as Record<string, string>).Prefer).toContain("resolution=ignore-duplicates");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns HTTP and timeout failures into StoreError", async () => {
    const httpFail = supabaseWaitlistStore({
      url: "https://p.supabase.co",
      secretKey: "sb_secret_x",
      fetchImpl: async () => new Response("echo of personal data", { status: 500 }),
    });
    await expect(httpFail.insertIfNew({} as WaitlistRecord)).rejects.toMatchObject({ status: 500 });

    const timeout = supabaseWaitlistStore({
      url: "https://p.supabase.co",
      secretKey: "sb_secret_x",
      fetchImpl: async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
    });
    await expect(timeout.insertIfNew({} as WaitlistRecord)).rejects.toMatchObject({ status: "timeout" });
  });
});
