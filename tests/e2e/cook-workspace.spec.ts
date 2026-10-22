import { expect, test } from "@playwright/test";

test.describe("cook workspace (simulation)", () => {
  test("is labelled as a simulation without sign-in", async ({ page }) => {
    await page.goto("/it/cook-workspace");
    await expect(page.getByText("Simulazione, non un accesso.").first()).toBeVisible();
    await expect(page.locator("input[type=password]")).toHaveCount(0);
  });

  test("creates a dish, schedules and publishes it, then edits and unpublishes it", async ({ page }) => {
    // A long journey across eight pages.
    test.slow();
    await page.goto("/it/cook-workspace/meals/new");
    await page.getByRole("button", { name: "Salva piatto" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "Ci sono 4 problemi da correggere" });
    await expect(summary).toBeFocused();

    await page.getByLabel("Nome del piatto").fill("Torta salata di verdure");
    await page.getByLabel("Descrizione").fill("Sfoglia croccante ripiena di spinaci e ricotta.");
    await page.getByLabel("Porzione").fill("Una fetta da circa 250 g");
    await page.getByLabel("Ingredienti").fill("Pasta sfoglia, spinaci, ricotta, uova, Parmigiano Reggiano");
    await page.getByRole("checkbox", { name: "Cereali contenenti glutine" }).first().check();
    await page.getByRole("checkbox", { name: "Latte" }).first().check();
    await page.getByRole("checkbox", { name: "Vegetariano" }).check();
    await page.getByRole("button", { name: "Salva piatto" }).click();
    await expect(page.getByText("Modifiche salvate in questa demo.")).toBeVisible();

    await page.getByRole("link", { name: /^Metti in programma\s?: Torta salata di verdure/ }).click();
    await expect(page.getByLabel("Piatto")).toHaveValue(/^local_meal_/);
    const date = await page.getByLabel("Giorno di ritiro").inputValue();
    await page.getByLabel("Prezzo a porzione (€)").fill("0,20");
    await page.getByRole("button", { name: "Salva data" }).click();
    await expect(page.getByText("Inserisci un prezzo tra 1 € e 50 €, ad esempio 8,50.").first()).toBeVisible();
    await page.getByLabel("Prezzo a porzione (€)").fill("7,50");
    await page.getByRole("button", { name: "Salva data" }).click();
    await expect(page.getByText("Modifiche salvate in questa demo.")).toBeVisible();

    // The same visitor now sees the new dish among the public meals for that day.
    await page.goto(`/it/meals?date=${date}`);
    const card = page.locator("article", { hasText: "Torta salata di verdure" });
    await expect(card).toContainText("7,50 €");
    await card.locator("h3 a").click();
    await expect(page.getByRole("img", { name: /Foto non disponibile/ })).toBeVisible();
    await expect(page.getByText("Cereali contenenti glutine")).toBeVisible();

    // Edit the price, then unpublish.
    await page.goto("/it/cook-workspace");
    await page.getByRole("link", { name: /^Modifica\s?: Torta salata di verdure, / }).click();
    await page.getByLabel("Prezzo a porzione (€)").fill("8");
    await page.getByRole("button", { name: "Salva data" }).click();
    await expect(page.getByText("Modifiche salvate in questa demo.")).toBeVisible();
    await page.getByRole("button", { name: /^Ritira\s?: Torta salata di verdure/ }).click();
    await expect(page.getByText("Data ritirata: non è più visibile tra i pasti.")).toBeVisible();

    await page.goto(`/it/meals?date=${date}`);
    await expect(page.locator("article", { hasText: "Torta salata di verdure" })).toHaveCount(0);
  });

  test("refuses capacity below portions already reserved", async ({ page }) => {
    await page.goto("/it/cook-workspace");
    await page.getByRole("link", { name: /^Modifica\s?: Lasagna al ragù/ }).first().click();
    await page.getByLabel("Porzioni disponibili").fill("2");
    await page.getByLabel("Massimo per prenotazione").fill("1");
    await page.getByRole("button", { name: "Salva data" }).click();
    await expect(page.getByText(/porzioni prenotate: non puoi prevederne di meno/).first()).toBeVisible();
  });

  test("confirms a sample reservation and moves focus to the outcome", async ({ page }) => {
    await page.goto("/it/cook-workspace#reservations");
    // The workspace renders from browser storage, so wait for it before counting.
    await expect(page.getByRole("button", { name: /^Conferma\s?:/ }).first()).toBeVisible();
    const before = await page.getByRole("button", { name: /^Conferma\s?:/ }).count();
    expect(before).toBeGreaterThan(0);
    await page.getByRole("button", { name: /^Conferma\s?:/ }).first().click();
    await expect(page.locator(":focus")).toContainText("Stato aggiornato: Confermata dal cuoco");
    await expect(page.getByRole("button", { name: /^Conferma\s?:/ })).toHaveCount(before - 1);
  });
});
