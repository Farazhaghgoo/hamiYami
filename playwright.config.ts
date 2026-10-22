import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// Use an installed browser (e.g. PLAYWRIGHT_CHANNEL=chrome or msedge) instead of downloading one.
const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel }, testIgnore: /mobile\.spec\.ts/ },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    // Tests run against a production build so CSP, headers and rendering match deployment.
    command: process.env.E2E_SKIP_BUILD
      ? `npx next start -p ${PORT}`
      : `npx next build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // Real signup collection must stay off in tests; the suite asserts nothing is sent.
      WAITLIST_COLLECTION_ENABLED: "false",
    },
  },
});
