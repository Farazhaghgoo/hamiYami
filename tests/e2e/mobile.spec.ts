import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/it",
  "/it/meals",
  "/it/story",
  "/it/trust",
  "/it/become-a-cook",
  "/it/cook-workspace",
  "/it/cook-workspace/offerings/new",
  "/it/waitlist",
  "/it/demo",
  "/en/reservations",
];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const width of [320, 375, 768]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of PAGES) {
      await page.goto(path);
      expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0);
    }
    await page.goto("/it/meals");
    await page.locator("article h3 a").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await horizontalOverflow(page), "meal detail").toBeLessThanOrEqual(0);
  });
}

test("menu opens, closes with Escape and returns focus", async ({ page }) => {
  await page.goto("/it");
  const toggle = page.getByRole("button", { name: "Menu" });
  const mealsLink = page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Pasti", exact: true });
  await expect(mealsLink).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(mealsLink).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("meal browsing comes first and the reserve action sits in the page flow", async ({ page }) => {
  await page.goto("/it/meals");
  // The first meal card starts within the first two screens on a phone.
  const firstCard = await page.locator("article").first().boundingBox();
  expect(firstCard?.y ?? Infinity).toBeLessThan(2 * (page.viewportSize()?.height ?? 800));

  await page.locator("article", { hasText: "porzioni disponibili" }).first().locator("h3 a").click();
  const reserve = page.getByRole("button", { name: "Prenota (simulazione)" });
  await expect(reserve).toBeVisible();
  const position = await reserve.evaluate((el) => {
    let node: Element | null = el;
    while (node) {
      const p = getComputedStyle(node).position;
      if (p === "fixed" || p === "sticky") return p;
      node = node.parentElement;
    }
    return "static";
  });
  // No fixed bar: the button never covers content or the focused element.
  expect(position).toBe("static");
  // Touch targets are at least 44px tall.
  expect((await reserve.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect((await page.getByRole("button", { name: "Aggiungi una porzione" }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
});
