/*
 * Signup handling shared by the production function (api/signup.js) and the local
 * preview server (scripts/dev-server.mjs). Validates input, applies light spam checks
 * and stores one record per email + audience, so repeated signups update rather than duplicate.
 *
 * Never log request bodies here: they contain personal data.
 */

export const AUDIENCES = ["customer", "cook"];
export const EXPERIENCE_OPTIONS = ["operates_food_business", "exploring", "other_or_prefer_not"];

// Same rules as the browser (public/assets/js/main.js). Keep them in sync.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const LIMITS = {
  email: 254,
  city: 80,
  neighborhood: 80,
  mealsWanted: 300,
  dishes: 300,
  consentText: 500,
  consentVersion: 64,
};

const MIN_FILL_TIME_MS = 1500;
const MAX_BODY_CHARS = 10000;

function clean(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function tooLong(limit) {
  return `Please keep this under ${limit} characters.`;
}

/** Returns { errors } with messages keyed by form field name, or { record } ready to store. */
export function validateSignup(body, now = new Date()) {
  const errors = {};

  const audience = AUDIENCES.includes(body.audience) ? body.audience : null;
  if (!audience) errors.audience = "Choose whether you want to find meals or cook.";

  const email = clean(body.email).toLowerCase();
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }

  const city = clean(body.city);
  if (!city) errors.city = "Enter your city or town in Italy.";
  else if (city.length > LIMITS.city) errors.city = tooLong(LIMITS.city);

  const neighborhood = clean(body.neighborhood);
  if (neighborhood.length > LIMITS.neighborhood) errors.neighborhood = tooLong(LIMITS.neighborhood);

  let answers = {};
  if (audience === "customer") {
    const mealsWanted = clean(body.mealsWanted);
    if (mealsWanted.length > LIMITS.mealsWanted) errors.mealsWanted = tooLong(LIMITS.mealsWanted);
    answers = { meals_wanted: mealsWanted || null };
  } else if (audience === "cook") {
    const dishes = clean(body.dishes);
    if (!dishes) errors.dishes = "Tell us what you’d like to cook.";
    else if (dishes.length > LIMITS.dishes) errors.dishes = tooLong(LIMITS.dishes);

    const experience = clean(body.foodBusinessExperience);
    if (experience && !EXPERIENCE_OPTIONS.includes(experience)) {
      errors.foodBusinessExperience = "Choose one of the options, or leave it blank.";
    }
    answers = { dishes, food_business_experience: experience || null };
  }

  if (Object.keys(errors).length) return { errors };

  const timestamp = now.toISOString();
  const record = {
    audience,
    email,
    city,
    neighborhood: neighborhood || null,
    answers,
    updated_at: timestamp,
  };

  // Only a positive opt-in is stored. An unticked box on a later signup does not erase an
  // earlier opt-in; withdrawals should go through the unsubscribe route instead.
  const consent = body.marketingConsent;
  if (consent && typeof consent === "object" && consent.granted === true) {
    record.marketing_consent = true;
    record.marketing_consent_text = clean(consent.text).slice(0, LIMITS.consentText) || null;
    record.marketing_consent_version = clean(consent.version).slice(0, LIMITS.consentVersion) || null;
    record.marketing_consent_at = timestamp;
  }

  return { record };
}

/**
 * Handles one signup request. `store.upsert(record)` must insert or update by (email, audience).
 * Returns { status, json } for the caller to send.
 */
export async function handleSignup({ body, origin, allowedOrigins = [], store }) {
  if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return { status: 403, json: { ok: false, error: "forbidden_origin" } };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, json: { ok: false, error: "invalid_body" } };
  }
  if (JSON.stringify(body).length > MAX_BODY_CHARS) {
    return { status: 413, json: { ok: false, error: "too_large" } };
  }

  // Spam checks: a hidden field people never see, and a minimum time to fill in the form.
  // Both are rejected openly (no fake success) so a real person who trips them can retry.
  if (clean(body.hy_check)) {
    return { status: 400, json: { ok: false, error: "rejected" } };
  }
  if (typeof body.elapsedMs === "number" && body.elapsedMs < MIN_FILL_TIME_MS) {
    return { status: 400, json: { ok: false, error: "too_fast" } };
  }

  const { errors, record } = validateSignup(body);
  if (errors) return { status: 422, json: { ok: false, errors } };

  try {
    await store.upsert(record);
  } catch (error) {
    console.error(`[signup] storage failed: ${error.message}`);
    return { status: 502, json: { ok: false, error: "store_failed" } };
  }

  return { status: 200, json: { ok: true } };
}

/** Stores signups in a Supabase table through its REST API, using a server-side secret key. */
export function supabaseStore({ url, key, table = "signups" }) {
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/${table}?on_conflict=email,audience`;
  const headers = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys must not.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  return {
    async upsert(record) {
      const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(record) });
      // The response body can echo submitted values, so only the status is reported.
      if (!response.ok) throw new Error(`Supabase responded with HTTP ${response.status}`);
    },
  };
}

export function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
