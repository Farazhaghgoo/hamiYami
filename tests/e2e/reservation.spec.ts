import { expect, test } from "@playwright/test";
import { openReservableMeal, reserveCurrentMeal, storedDemo } from "./helpers";

test.describe("simulated reservation", () => {
  test("completes, shows the demo confirmation, and can be cancelled", async ({ page }) => {
    const title = await openReservableMeal(page);
    await reserveCurrentMeal(page, { quantity: 2 });

    await expect(page.getByText("Nessun cuoco l'ha ricevuta e non è stato addebitato nulla.")).toBeVisible();
    await expect(page.getByText("Richiesta (simulata)")).toBeVisible();
    await expect(page.getByText(/Puoi annullare fino a/)).toBeVisible();

    await page.getByRole("link", { name: "Le mie prenotazioni" }).first().click();
    await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();

    await page.getByRole("button", { name: "Annulla prenotazione" }).click();
    const dialog = page.getByRole("dialog", { name: "Annullare questa prenotazione demo?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Sì, annulla" }).click();
    await expect(page.getByText("Prenotazione annullata.")).toBeVisible();
    await expect(page.getByText("Annullata da te")).toBeVisible();
    expect((await storedDemo(page))?.reservations[0]?.status).toBe("cancelled_by_customer");
  });

  test("gives a pickup code and a calendar file made in the browser", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await openReservableMeal(page);
    await reserveCurrentMeal(page, { quantity: 2 });

    const pass = page.getByRole("region", { name: "Codice di ritiro" });
    const code = (await pass.locator("p").first().innerText()).trim();
    expect(code).toMatch(/^[BCDFGHJKMNPQRSTVWXYZ2-9]{4}$/);

    const link = pass.getByRole("link", { name: "Aggiungi al calendario" });
    const href = (await link.getAttribute("href")) ?? "";
    expect(href.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
    const ics = decodeURIComponent(href.slice(href.indexOf(",") + 1)).replace(/\r\n /g, "");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toContain(`Codice di ritiro: ${code}`);
    expect(ics).toContain("SUMMARY:Ritiro HamiYami (demo)");

    // The browser really downloads it, and making it contacted nothing.
    const before = requests.length;
    const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(download.suggestedFilename()).toMatch(/^hamiyami-pickup-\d{4}-\d{2}-\d{2}\.ics$/);
    expect(requests.slice(before).filter((url) => !url.startsWith("data:"))).toEqual([]);

    await page.goto("/it/reservations");
    await expect(page.getByText(`Codice ${code}`)).toBeVisible();
  });

  test("never asks for payment or personal details and says so plainly", async ({ page }) => {
    await openReservableMeal(page);
    await page.getByRole("button", { name: "Prenota (simulazione)" }).click();
    await expect(page.getByText("Demo — nessun ordine o pagamento reale.")).toBeVisible();
    await expect(page.locator("input[type=email], input[autocomplete^=cc-], input[name*=card]")).toHaveCount(0);
  });

  test("prevents duplicate submissions from double clicks and from going back", async ({ page }) => {
    await openReservableMeal(page);
    await page.getByRole("button", { name: "Prenota (simulazione)" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("radio").first().check({ force: true });
    await page.getByRole("button", { name: "Continua" }).click();

    await page.getByRole("button", { name: "Conferma la prenotazione demo" }).dblclick();
    await expect(page.getByRole("heading", { name: "Prenotazione demo registrata" })).toBeVisible();
    const firstUrl = page.url();
    expect((await storedDemo(page))?.reservations).toHaveLength(1);

    // The confirmation replaced the review step in history, so Back returns to the pickup step.
    // Choosing the same time and confirming again is the same attempt, not a new reservation.
    await page.goBack();
    await expect(page.getByRole("heading", { name: /Passo 2 di 3/ })).toBeVisible();
    await page.getByRole("radio").first().check({ force: true });
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Conferma la prenotazione demo" }).click();
    await expect(page.getByRole("heading", { name: "Prenotazione demo registrata" })).toBeVisible();
    expect(page.url()).toBe(firstUrl);
    expect((await storedDemo(page))?.reservations).toHaveLength(1);
  });

  test("validates quantities against what is left and recovers", async ({ page }) => {
    await page.goto("/it/meals");
    const low = page.locator("article", { hasText: "Ultime 2 porzioni" }).first();
    const href = await low.locator("h3 a").getAttribute("href");
    await page.goto(`${href}/reserve?qty=3`);
    await expect(page.getByText("Sono rimaste solo 2 porzioni.")).toBeVisible();
    await expect(page.getByRole("spinbutton")).toHaveAttribute("aria-invalid", "true");

    await page.getByRole("spinbutton").fill("2");
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page.getByRole("heading", { name: /Passo 2 di 3/ })).toBeVisible();
    await expect(page).toHaveURL(/qty=2/);
  });

  test("requires a pickup time before review", async ({ page }) => {
    await openReservableMeal(page);
    await page.getByRole("button", { name: "Prenota (simulazione)" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page.getByText("Scegli un orario di ritiro.")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Passo 2 di 3/ })).toBeVisible();
  });

  test("keeps choices across Back and Forward", async ({ page }) => {
    await openReservableMeal(page);
    await page.getByRole("button", { name: "Aggiungi una porzione" }).click();
    await page.getByRole("button", { name: "Prenota (simulazione)" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("radio").nth(2).check({ force: true });
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page).toHaveURL(/step=3&qty=2&slot=/);
    await page.goBack();
    await expect(page.getByRole("radio").nth(2)).toBeChecked();
    await page.goBack();
    await expect(page.getByRole("spinbutton")).toHaveValue("2");
  });
});
