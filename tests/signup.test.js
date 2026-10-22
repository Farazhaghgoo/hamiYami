import { test } from "node:test";
import assert from "node:assert/strict";
import { handleSignup, validateSignup } from "../lib/signup.js";

const customer = {
  audience: "customer",
  email: "  Person@Example.com ",
  city: "Torino",
  neighborhood: "",
  mealsWanted: "Soups",
  hy_check: "",
  elapsedMs: 9000,
};

const cook = {
  audience: "cook",
  email: "cook@example.com",
  city: "Torino",
  dishes: "Fresh pasta",
  foodBusinessExperience: "exploring",
  hy_check: "",
  elapsedMs: 9000,
};

function memoryStore() {
  const rows = [];
  return {
    rows,
    async upsert(record) {
      const i = rows.findIndex((r) => r.email === record.email && r.audience === record.audience);
      if (i === -1) rows.push(record);
      else rows[i] = { ...rows[i], ...record };
    },
  };
}

test("valid customer signup is normalised and stored", async () => {
  const store = memoryStore();
  const result = await handleSignup({ body: customer, store });
  assert.deepEqual(result, { status: 200, json: { ok: true } });
  assert.equal(store.rows[0].email, "person@example.com");
  assert.equal(store.rows[0].neighborhood, null);
  assert.deepEqual(store.rows[0].answers, { meals_wanted: "Soups" });
  assert.equal("marketing_consent" in store.rows[0], false);
});

test("repeated signup updates the same record instead of duplicating", async () => {
  const store = memoryStore();
  await handleSignup({ body: customer, store });
  await handleSignup({ body: { ...customer, city: "Milano" }, store });
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0].city, "Milano");
});

test("same email can register as customer and as cook", async () => {
  const store = memoryStore();
  await handleSignup({ body: customer, store });
  await handleSignup({ body: { ...cook, email: "person@example.com" }, store });
  assert.equal(store.rows.length, 2);
});

test("cook signup requires dishes and a known experience option", () => {
  const { errors } = validateSignup({ ...cook, dishes: " ", foodBusinessExperience: "chef" });
  assert.ok(errors.dishes);
  assert.ok(errors.foodBusinessExperience);
});

test("missing and malformed fields return field errors", async () => {
  const result = await handleSignup({ body: { ...customer, email: "nope@", city: "" }, store: memoryStore() });
  assert.equal(result.status, 422);
  assert.ok(result.json.errors.email);
  assert.ok(result.json.errors.city);
});

test("marketing consent is stored with wording and version only when granted", () => {
  const granted = validateSignup({
    ...customer,
    marketingConsent: { granted: true, text: "Send me news", version: "marketing-v1" },
  }).record;
  assert.equal(granted.marketing_consent, true);
  assert.equal(granted.marketing_consent_text, "Send me news");
  assert.equal(granted.marketing_consent_version, "marketing-v1");
  assert.ok(granted.marketing_consent_at);

  const declined = validateSignup({ ...customer, marketingConsent: { granted: false, text: "x", version: "v" } }).record;
  assert.equal("marketing_consent" in declined, false);
});

test("spam trap and too-fast submissions are rejected without storing", async () => {
  const store = memoryStore();
  assert.equal((await handleSignup({ body: { ...customer, hy_check: "x" }, store })).status, 400);
  assert.equal((await handleSignup({ body: { ...customer, elapsedMs: 200 }, store })).status, 400);
  assert.equal(store.rows.length, 0);
});

test("origin allow-list is enforced when configured", async () => {
  const result = await handleSignup({
    body: customer,
    origin: "https://evil.example",
    allowedOrigins: ["https://hamiyami.example"],
    store: memoryStore(),
  });
  assert.equal(result.status, 403);
});

test("storage failure is reported as an error, never as success", async () => {
  const failing = { async upsert() { throw new Error("down"); } };
  const original = console.error;
  console.error = () => {};
  try {
    const result = await handleSignup({ body: customer, store: failing });
    assert.equal(result.status, 502);
    assert.equal(result.json.ok, false);
  } finally {
    console.error = original;
  }
});
