import { expect, test } from "@playwright/test";
import { openReservableMeal, reserveCurrentMeal, STORAGE_KEY, storedDemo } from "./helpers";

test.describe("per-visitor demo state", () => {
  test("is isolated between visitors", async ({ browser }) => {
    const alice = await browser.newContext();
    const bob = await browser.newContext();
    const a = await alice.newPage();
    const b = await bob.newPage();

    await openReservableMeal(a);
    await reserveCurrentMeal(a);
    await a.goto("/it/reservations");
    await expect(a.locator("li", { hasText: "Richiesta (simulata)" })).toHaveCount(1);

    await b.goto("/it/reservations");
    await expect(b.getByRole("heading", { name: "Nessuna prenotazione demo" })).toBeVisible();
    expect(await storedDemo(b)).toBeNull();

    await alice.close();
    await bob.close();
  });

  test("can be reset from the banner, with confirmation and focus restored on cancel", async ({ page }) => {
    await openReservableMeal(page);
    await reserveCurrentMeal(page);
    expect(await storedDemo(page)).not.toBeNull();

    const reset = page.getByRole("button", { name: "Azzera la demo" });
    await reset.click();
    const dialog = page.getByRole("dialog", { name: "Azzerare la demo?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(reset).toBeFocused();

    await reset.click();
    await dialog.getByRole("button", { name: "Sì, azzera" }).click();
    await expect(page.getByText("Demo azzerata. Stai ripartendo dai dati d'esempio.")).toBeVisible();
    expect(await storedDemo(page)).toBeNull();

    await page.goto("/it/reservations");
    await expect(page.getByRole("heading", { name: "Nessuna prenotazione demo" })).toBeVisible();
  });

  test("discards corrupted stored data with a visible notice and keeps working", async ({ page }) => {
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, '{"version":1,"meals":[],"offerings":[],"reservations":[{"id":"x","quantity":-4}]}');
        sessionStorage.setItem("seeded", "1");
      }
    }, STORAGE_KEY);
    await page.goto("/it/meals");
    await expect(page.getByText(/non erano leggibili e sono stati scartati/)).toBeVisible();
    expect(await storedDemo(page)).toBeNull();
    await expect(page.locator("article")).toHaveCount(10);
  });

  test("resets data from an unknown version", async ({ page }) => {
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(key, JSON.stringify({ version: 99, anything: true }));
        sessionStorage.setItem("seeded", "1");
      }
    }, STORAGE_KEY);
    await page.goto("/it");
    await expect(page.getByText(/provenivano da una versione precedente/)).toBeVisible();
  });

  test("reflects the visitor's own reservations in availability", async ({ page }) => {
    await openReservableMeal(page);
    const mealUrl = page.url();
    const badge = page.getByText(/porzioni disponibili/).first();
    const before = Number((await badge.innerText()).match(/\d+/)?.[0]);
    await reserveCurrentMeal(page, { quantity: 2 });
    await page.goto(mealUrl);
    await expect(page.getByText(`${before - 2} porzioni disponibili`).first()).toBeVisible();
  });
});
