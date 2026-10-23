import { describe, expect, it } from "vitest";
import { DEMO_COOK_ID } from "@/data/demo";
import { createDemoRepositories } from "@/data/demo/demo-repositories";
import { createBrowserDemoStore } from "@/data/demo/demo-store";
import { buildSeedCatalog } from "@/data/demo/seed";
import { schedulableRange } from "@/domain/menu-window";
import { buildPrepPlan } from "@/features/cook-workspace/prep";
import { MemoryStorage } from "../../support/memory-storage";

// Sunday 25 Oct 2026. Marta (the demo cook) has lasagna on Tue and Thu, meatballs on Thu and Fri.
const anchor = "2026-10-25";
const now = new Date("2026-10-25T09:00:00Z");

function setup() {
  const store = createBrowserDemoStore(() => new MemoryStorage());
  return createDemoRepositories({ seed: buildSeedCatalog(anchor), store, demoCookId: DEMO_COOK_ID });
}

async function plan(repos: ReturnType<typeof setup>) {
  const range = schedulableRange(anchor);
  const [offerings, meals, reservations] = await Promise.all([
    repos.cookWorkspace.listOfferings({ from: range.min, to: range.max }),
    repos.cookWorkspace.listMeals(),
    repos.cookWorkspace.listReservations(),
  ]);
  return buildPrepPlan(offerings, meals, reservations);
}

describe("cook prep plan", () => {
  it("groups the demo cook's dishes by day with portions to cook and requests to confirm", async () => {
    const days = await plan(setup());
    expect(days.map((d) => d.date)).toEqual(["2026-10-27", "2026-10-29", "2026-10-30"]);

    const [tue, thu, fri] = days;
    // Tuesday's lasagna is fully reserved: 6 confirmed portions plus one request for 2.
    expect(tue).toMatchObject({ toPrepare: 8, pendingRequests: 1 });
    expect(tue!.items[0]).toMatchObject({ confirmedPortions: 6, requestedPortions: 2, remaining: 0 });

    // Thursday: lasagna (2 confirmed + 2 requested) at 18:30, then meatballs (2 requested) at 19:00.
    expect(thu!.items.map((i) => i.offering.mealId)).toEqual(["meal-lasagna", "meal-polpette"]);
    expect(thu).toMatchObject({ toPrepare: 6, pendingRequests: 2 });
    expect(fri).toMatchObject({ toPrepare: 7, pendingRequests: 1 });
  });

  it("includes the visitor's own reservations and stops counting declined ones", async () => {
    const repos = setup();
    const created = await repos.reservations.create(
      { offeringId: "off-lasagna-thu-2026-10-29", quantity: 3, slot: "19:00", idempotencyKey: "attempt-prep-1" },
      now,
    );
    if (!created.ok) throw new Error(created.error);

    let thursday = (await plan(repos))[1]!.items[0]!;
    expect(thursday).toMatchObject({ requestedPortions: 5, toPrepare: 7 });
    expect(thursday.reservations.map((r) => r.pickup.slot)).toEqual(["18:30", "18:30", "19:00"]);

    await repos.cookWorkspace.transitionReservation(created.value.id, "declined_by_cook", now);
    thursday = (await plan(repos))[1]!.items[0]!;
    expect(thursday).toMatchObject({ requestedPortions: 2, toPrepare: 4, releasedCount: 1 });
    expect(thursday.reservations).toHaveLength(2);
  });

  it("keeps unpublished dishes that still have reservations, and drops empty ones", async () => {
    const repos = setup();
    await repos.cookWorkspace.setOfferingStatus("off-polpette-thu-2026-10-29", "unpublished");
    expect((await plan(repos))[1]!.items.map((i) => i.offering.mealId)).toContain("meal-polpette");

    const draft = {
      mealId: "meal-polpette",
      pickupDate: "2026-11-03",
      pickupWindow: { start: "19:00", end: "20:00" },
      cutoffMinutesBefore: 360,
      price: { amountCents: 800, currency: "EUR" as const },
      capacity: 6,
      maxPerReservation: 2,
      status: "unpublished" as const,
    };
    await repos.cookWorkspace.saveOffering(draft, now);
    expect((await plan(repos)).map((d) => d.date)).not.toContain("2026-11-03");
  });
});
