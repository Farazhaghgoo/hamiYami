import { expect, test } from "@playwright/test";

test.describe("language", () => {
  test("defaults to Italian and switches to English, keeping the page and filters", async ({ page }) => {
    await page.goto("/it/meals?diet=vegan");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/meals\?diet=vegan$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: "This week's meals" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Vegan" })).toBeChecked();
    await expect(page.getByText("Demo — no real orders or payments")).toBeVisible();

    await page.getByRole("link", { name: "Italiano" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
  });

  test("translates validation and state messages", async ({ page }) => {
    await page.goto("/en/waitlist");
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "There are 2 problems to fix" })).toBeFocused();
    await expect(page.getByText("Enter your email address.").first()).toBeVisible();
  });
});

test.describe("keyboard and focus", () => {
  test("skip link is first and moves focus to the main content", async ({ page }) => {
    await page.goto("/it/meals");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Vai al contenuto" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("focus is visible on interactive elements", async ({ page }) => {
    await page.goto("/it");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  });

  test("a reservation can be completed with the keyboard only", async ({ page }) => {
    await page.goto("/it/meals");
    const link = page.locator("article", { hasText: "porzioni disponibili" }).first().locator("h3 a");
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Prenota (simulazione)" })).toBeVisible();

    await page.getByRole("button", { name: "Aggiungi una porzione" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("spinbutton")).toHaveValue("2");
    await page.getByRole("button", { name: "Prenota (simulazione)" }).focus();
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: "Continua" }).focus();
    await page.keyboard.press("Enter");
    // Focus moves to the new step's heading so the change is announced.
    await expect(page.getByRole("heading", { name: /Passo 2 di 3/ })).toBeFocused();
    await page.getByRole("radio").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
    await page.getByRole("button", { name: "Continua" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /Passo 3 di 3/ })).toBeFocused();
    await page.getByRole("button", { name: "Conferma la prenotazione demo" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Prenotazione demo registrata" })).toBeFocused();
  });

  test("day filters work with arrow keys", async ({ page }) => {
    await page.goto("/it/meals");
    await page.getByRole("radio", { name: "Tutti i giorni" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
  });
});
