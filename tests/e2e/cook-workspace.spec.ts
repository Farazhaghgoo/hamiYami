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

  test("plans each day: portions to cook, requests to confirm, and the pickup list", async ({ page }) => {
    await page.goto("/it/cook-workspace#prep");
    const prep = page.getByRole("region", { name: "Da preparare" });
    // The workspace renders from browser storage, so wait for it before reading numbers.
    const firstDay = prep.getByRole("region").first();
    await expect(firstDay).toContainText(/\d+ porzion[ei] da preparare/);
    await expect(prep.getByRole("heading", { level: 4 }).first()).toBeVisible();
    await expect(prep.getByText(/^Codice [BCDFGHJKMNPQRSTVWXYZ2-9]{4}$/).first()).toBeVisible();

    const confirm = prep.getByRole("button", { name: /^Conferma\s?:/ });
    await expect(confirm.first()).toBeVisible();
    const before = await confirm.count();
    const pending = Number((await firstDay.getByText(/richiest[ae] da confermare/).innerText()).match(/\d+/)?.[0] ?? 0);
    await firstDay.getByRole("button", { name: /^Conferma\s?:/ }).first().click();

    // The button disappears, so focus moves to the outcome; the numbers follow the decision.
    await expect(page.locator(":focus")).toContainText("Stato aggiornato: Confermata dal cuoco");
    await expect(confirm).toHaveCount(before - 1);
    if (pending > 1) await expect(firstDay).toContainText(`${pending - 1} richiest`);
    else await expect(firstDay).not.toContainText(/richiest[ae] da confermare/);
  });

  test("a customer's simulated reservation reaches the same visitor's cook view, with the same code", async ({ page }) => {
    // Reserve Marta's lasagna as a customer.
    await page.goto("/it/meals");
    const card = page.locator("article", { hasText: "Lasagna al ragù" }).filter({ hasText: "porzioni disponibili" }).first();
    const href = await card.locator("h3 a").getAttribute("href");
    await page.goto(`${href}/reserve?step=3&qty=1&slot=19:15`);
    await page.getByRole("button", { name: "Conferma la prenotazione demo" }).click();
    await expect(page.getByRole("heading", { name: "Prenotazione demo registrata" })).toBeVisible();
    const code = (await page.getByRole("region", { name: "Codice di ritiro" }).locator("p").first().innerText()).trim();
    const reservationUrl = page.url();

    // As the cook, find it in the pickup list by its code and confirm it.
    await page.goto("/it/cook-workspace#prep");
    const row = page
      .getByRole("list", { name: /^Ritiri per Lasagna al ragù/ })
      .getByRole("listitem")
      .filter({ hasText: `Codice ${code}` });
    await expect(row).toContainText("Fatta da te in questa demo");
    await expect(row).toContainText("19:15");
    await row.getByRole("button", { name: /^Conferma\s?:/ }).click();
    await expect(row).toContainText("Confermata dal cuoco (simulata)");

    // Back as the customer, the decision shows on the reservation.
    await page.goto(reservationUrl.replace("?new=1", ""));
    await expect(page.getByText("Confermata dal cuoco (simulata)")).toBeVisible();
  });
});
