import { expect, test, type Locator, type Page } from "@playwright/test";

/** Scrolls a step's words to just above the middle of the screen, where it becomes the active step. */
async function bringToMiddle(step: Locator) {
  await step.evaluate((el) => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.35));
}

function priceStep(page: Page) {
  return page.locator("[data-step]").filter({ hasText: "Il prezzo lo decide chi cucina." });
}

test.describe("story page", () => {
  test("tells three chapters and labels its numbers as demo data", async ({ page }) => {
    await page.goto("/it/story");
    await expect(page.getByRole("heading", { level: 1, name: "La cena di quartiere, ripensata." })).toBeVisible();
    for (const name of ["Com'era", "Com'è oggi", "Come lo risolviamo"]) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Numeri della demo: calcolati dal menu fittizio dei prossimi sette giorni.")).toBeVisible();
    await expect(page.getByText(/^\d+ cene in \d+ sere, da \d+ cuochi di Borgo Lavanda\./)).toBeVisible();
    // The problems chapter is narrative: no statistics about the world.
    await expect(page.locator("#chapter-present")).not.toContainText(/\d\s?%/);
  });

  test("puts every chart's numbers in a table, matching the words", async ({ page }) => {
    await page.goto("/it/story");
    const step = priceStep(page);
    await step.getByText("Vedi i dati").click();
    const prices = (await step.locator("tbody tr td:last-child").allInnerTexts()).map((text) =>
      Number(text.replace(/[^\d,]/g, "").replace(",", ".")),
    );
    expect(prices.length).toBeGreaterThan(2);
    const euro = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
    await expect(step).toContainText(`da ${euro(Math.min(...prices))} a ${euro(Math.max(...prices))} a porzione`);

    for (const title of ["Confronti onesti, ogni 100 grammi.", "Si cucina su prenotazione."]) {
      const other = page.locator("[data-step]").filter({ hasText: title });
      await other.getByText("Vedi i dati").click();
      await expect(other.getByRole("table").locator("tbody tr").first()).toBeVisible();
    }
  });

  test("pins the graphic on wide screens while the words scroll past", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/it/story");
    const step = priceStep(page);
    await bringToMiddle(step);
    const chart = page.getByRole("img", { name: /^Prezzo a porzione di ogni cena/ });
    const layer = page.locator("[data-active]").filter({ has: chart });
    await expect(layer).toHaveAttribute("data-active", "true");
    await expect(layer).not.toHaveAttribute("inert");
    // The graphics of the other steps are out of reach of keyboard and screen readers.
    expect(await page.locator("main [inert]").count()).toBeGreaterThan(5);

    const chartBefore = (await chart.boundingBox())!.y;
    const wordsBefore = (await step.boundingBox())!.y;
    await page.mouse.wheel(0, 120);
    await expect.poll(async () => (await step.boundingBox())!.y).toBeLessThan(wordsBefore - 60);
    expect(Math.abs((await chart.boundingBox())!.y - chartBefore)).toBeLessThan(2);
  });

  test("shows a tooltip for each dinner on the price strip", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/it/story");
    await bringToMiddle(priceStep(page));
    const chart = page.getByRole("img", { name: /^Prezzo a porzione di ogni cena/ });
    await expect(chart).not.toContainText(" · ");
    // Hover the cheapest dinner: the left-most mark in the strip.
    const marks = await chart.locator("span[style*='--stack']").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()).sort((a, b) => a.x - b.x).map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })),
    );
    expect(marks.length).toBeGreaterThan(2);
    await page.mouse.move(marks[0]!.x, marks[0]!.y);
    // The tooltip names the dish, its cook and evening, and the price.
    await expect(chart).toContainText(/ · .*\d+,\d{2}\s€/);
  });

  test("on phones each graphic follows its words", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await page.goto("/it/story");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main [inert]")).toHaveCount(0);
    const step = priceStep(page);
    const words = step.getByRole("heading", { level: 3 });
    const chart = step.getByRole("img", { name: /^Prezzo a porzione di ogni cena/ });
    await chart.scrollIntoViewIfNeeded();
    expect((await chart.boundingBox())!.y).toBeGreaterThan((await words.boundingBox())!.y);
  });

  test("keeps graphics still for visitors who ask for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/it/story");
    await expect(page.locator("main [inert]").first()).toBeAttached();
    const durations = await page.locator("[data-active]").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).transitionDuration),
    );
    expect(durations.every((d) => d.split(",").every((part) => parseFloat(part) === 0))).toBe(true);
  });

  test("is linked from the home page and the footer, and available in English", async ({ page }) => {
    await page.goto("/it");
    await page.getByRole("link", { name: "Perché HamiYami? Leggi la nostra storia" }).click();
    await expect(page).toHaveURL(/\/it\/story$/);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "La nostra storia" })).toHaveAttribute("href", "/it/story");

    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/story$/);
    await expect(page.getByRole("heading", { level: 1, name: "The neighborhood dinner, rethought." })).toBeVisible();
    await page.getByRole("link", { name: /How we solve it/ }).click();
    await expect(page).toHaveURL(/#chapter-solution$/);
    await expect(page.getByText("Demo numbers: computed from the fictional menu for the next seven days.")).toBeInViewport();
  });
});
