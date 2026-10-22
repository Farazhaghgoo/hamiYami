import { expect, test } from "@playwright/test";

test.describe("waitlist while real collection is off", () => {
  test("validates, says nothing was sent, and makes no request", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) apiCalls.push(request.url());
    });

    await page.goto("/it/waitlist");
    await expect(page.getByText("La raccolta delle iscrizioni non è ancora attiva.")).toBeVisible();

    await page.getByRole("button", { name: "Iscriviti alla lista d'attesa" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Ci sono 2 problemi da correggere" })).toBeFocused();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Email").fill("persona@example.com");
    await page.getByLabel("Città o paese in Italia").fill("Torino");
    await page.getByRole("button", { name: "Iscriviti alla lista d'attesa" }).click();
    await expect(page.getByText(/i tuoi dati non sono stati inviati né salvati/)).toBeVisible();
    await expect(page.getByText("Grazie! Abbiamo registrato il tuo interesse.")).toHaveCount(0);
    expect(apiCalls).toEqual([]);
  });

  test("cook interest requires the dishes field", async ({ page }) => {
    await page.goto("/it/become-a-cook");
    await page.getByLabel("Email").fill("cuoco@example.com");
    await page.getByLabel("Città o paese in Italia").fill("Torino");
    await page.getByRole("button", { name: "Registra il mio interesse" }).click();
    await expect(page.getByText("Raccontaci cosa ti piacerebbe cucinare.").first()).toBeVisible();
  });

  test("the API refuses to store anything", async ({ request, baseURL }) => {
    const response = await request.post("/api/waitlist", {
      headers: { Origin: baseURL ?? "", "Content-Type": "application/json" },
      data: { audience: "customer", email: "persona@example.com", city: "Torino" },
    });
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "not_configured" });
    expect(response.headers()["cache-control"]).toBe("no-store");
  });
});

test.describe("security and privacy", () => {
  test("pages send a nonce-based CSP and protective headers", async ({ page }) => {
    const response = await page.goto("/it/meals");
    const headers = response?.headers() ?? {};
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("no CSP violations or third-party requests on the main journeys", async ({ page, baseURL }) => {
    const origins = new Set<string>();
    const violations: string[] = [];
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    page.on("console", (message) => {
      if (message.type() === "error" && /Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    for (const path of ["/it", "/it/meals", "/it/trust", "/it/become-a-cook", "/it/cook-workspace", "/en/waitlist"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await page.goto("/it/meals");
    await page.locator("article h3 a").first().click();
    await page.waitForLoadState("networkidle");
    expect([...origins].filter((origin) => origin !== new URL(baseURL ?? "").origin && !origin.startsWith("data:"))).toEqual([]);
    expect(violations).toEqual([]);
  });

  test("demo storage holds no personal data", async ({ page }) => {
    await page.goto("/it/waitlist");
    await page.getByLabel("Email").fill("persona@example.com");
    await page.getByLabel("Città o paese in Italia").fill("Torino");
    await page.getByRole("button", { name: "Iscriviti alla lista d'attesa" }).click();
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    expect(stored).not.toContain("persona@example.com");
    expect(page.url()).not.toContain("persona");
  });
});
