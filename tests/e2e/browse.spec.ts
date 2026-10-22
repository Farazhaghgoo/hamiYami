import { expect, test } from "@playwright/test";
import { openReservableMeal } from "./helpers";

test.describe("browsing", () => {
  test("homepage states the use case, the demo status and leads to meals", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/it$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Trova la tua prossima cena, cucinata vicino a te, pronta da ritirare.",
    );
    await expect(page.getByText("Demo — nessun ordine o pagamento reale")).toBeVisible();
    await expect(page.locator("article")).not.toHaveCount(0);

    await page.getByRole("link", { name: "Esplora la demo" }).click();
    await expect(page).toHaveURL(/\/it\/meals$/);
    await expect(page.getByRole("heading", { level: 1, name: "Pasti della settimana" })).toBeVisible();
  });

  test("filters by day, dietary preference, price and neighborhood, and resets", async ({ page }) => {
    await page.goto("/it/meals");
    const results = page.getByRole("status").filter({ hasText: /trovat/ });
    await expect(results).toHaveText("10 pasti trovati");

    // A day without dishes (the pilot focuses on weekdays) shows the helpful empty state.
    await page.locator("label", { hasText: "0 piatti" }).first().click();
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("heading", { name: "Nessun pasto con questi filtri" })).toBeVisible();
    await page.getByRole("button", { name: "Azzera filtri" }).first().click();
    await expect(results).toHaveText("10 pasti trovati");

    await page.getByRole("checkbox", { name: "Vegano" }).check();
    await expect(page).toHaveURL(/diet=vegan/);
    await expect(results).toHaveText("4 pasti trovati");
    const vegan = page.locator("article");
    const count = await vegan.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) await expect(vegan.nth(i)).toContainText("Vegano");

    await page.getByRole("radio", { name: "Fino a 7,00 €" }).check();
    await expect(page.locator("article")).toHaveCount(2);
    for (const price of await page.locator("article").getByText(/€/).allInnerTexts()) {
      expect(Number(price.replace(/[^\d,]/g, "").replace(",", "."))).toBeLessThanOrEqual(7);
    }

    await page.getByRole("combobox", { name: "Quartiere" }).selectOption({ label: "Rione Melograno (non ancora attivo)" });
    await expect(page.getByRole("heading", { name: "HamiYami non è ancora disponibile a Rione Melograno" })).toBeVisible();
    await page.getByRole("button", { name: "Torna a Borgo Lavanda" }).click();
    await expect(results).toHaveText("10 pasti trovati");
  });

  test("filters in the URL survive a reload", async ({ page }) => {
    await page.goto("/it/meals?diet=vegetarian&maxPrice=800");
    await expect(page.getByRole("checkbox", { name: "Vegetariano" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Fino a 8,00 €" })).toBeChecked();
  });

  test("meal details show allergens apart from dietary preferences, the cook and the pickup", async ({ page }) => {
    await openReservableMeal(page);
    await expect(page.getByText("Esempio fittizio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Allergeni" })).toBeVisible();
    await expect(page.getByText("Le preferenze alimentari non escludono contaminazioni")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chi lo cucina" })).toBeVisible();
    await expect(page.getByText("Profilo fittizio").first()).toBeVisible();
    await expect(page.getByText("Disponibilità fittizia")).toBeVisible();

    await page.getByRole("link", { name: /Vedi il profilo di/ }).click();
    await expect(page.getByText("Questo è un profilo inventato per la demo.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verifiche completate" })).toBeVisible();
    await expect(page.getByText(/Nessuna\. HamiYami prevede controlli/)).toBeVisible();
  });

  test("sold-out meals cannot be reserved and point to other dates", async ({ page }) => {
    await page.goto("/it/meals");
    await page.locator("article", { hasText: "Esaurito" }).first().locator("h3 a").click();
    await expect(page.getByText("Tutte le porzioni di questa data sono prenotate.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Prenota (simulazione)" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Altre date per questo piatto" })).toBeVisible();
  });

  test("unknown pages show a translated 404", async ({ page }) => {
    const response = await page.goto("/it/meals/off-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Pagina non trovata" })).toBeVisible();
  });
});
