import { expect, type Page } from "@playwright/test";

export const STORAGE_KEY = "hamiyami.demo";

/** The visitor's stored demo state, or null when nothing is stored. */
export async function storedDemo(page: Page): Promise<{ reservations: { id: string; status: string }[]; meals: unknown[]; offerings: unknown[] } | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

/** Opens the meals page and returns the first card that can still be reserved. */
export async function openReservableMeal(page: Page, locale = "it") {
  await page.goto(`/${locale}/meals`);
  const card = page.locator("article", { hasText: locale === "it" ? "porzioni disponibili" : "portions available" }).first();
  const title = (await card.locator("h3").innerText()).trim();
  await card.locator("h3 a").click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return title;
}

/** Walks the simulated reservation flow from a meal page and returns the confirmation URL. */
export async function reserveCurrentMeal(page: Page, { quantity = 1, slotIndex = 1 } = {}) {
  for (let i = 1; i < quantity; i++) await page.getByRole("button", { name: "Aggiungi una porzione" }).click();
  await page.getByRole("button", { name: "Prenota (simulazione)" }).click();
  await expect(page.getByRole("heading", { name: /Passo 1 di 3/ })).toBeVisible();
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { name: /Passo 2 di 3/ })).toBeVisible();
  await page.getByRole("radio").nth(slotIndex).check({ force: true });
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { name: /Passo 3 di 3/ })).toBeVisible();
  await page.getByRole("button", { name: "Conferma la prenotazione demo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Prenotazione demo registrata" })).toBeVisible();
  return page.url();
}
