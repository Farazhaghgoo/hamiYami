import { describe, expect, it } from "vitest";
import { DEMO_COOK_ID } from "@/data/demo";
import { createDemoRepositories } from "@/data/demo/demo-repositories";
import { createStaticDemoStore } from "@/data/demo/demo-store";
import { buildSeedCatalog } from "@/data/demo/seed";
import { menuWindow } from "@/domain/menu-window";
import { buildStoryData, eveningLoads } from "@/features/story/data";

const anchor = "2026-10-25";
const { catalog } = createDemoRepositories({
  seed: buildSeedCatalog(anchor),
  store: createStaticDemoStore(),
  demoCookId: DEMO_COOK_ID,
});

describe("story numbers", () => {
  it("are computed from the menu through the data layer", async () => {
    const data = await buildStoryData(catalog, menuWindow(anchor));
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data).toMatchObject({
      neighborhoodName: "Borgo Lavanda",
      cookCount: 3,
      dishCount: 6,
      offeringCount: 10,
      eveningCount: 5,
      prices: { minCents: 650, maxCents: 900, medianCents: 850 },
      cutoffHours: 6,
      allergenCount: 14,
      slotMinutes: 15,
      pickupCodeLength: 4,
    });
    // Reserved never exceeds what was planned, and the totals add up.
    expect(data.reservedTotal).toBeLessThanOrEqual(data.capacityTotal);
    expect(data.capacityTotal).toBe(data.offerings.reduce((s, o) => s + o.capacity, 0));
  });

  it("lists each dish once, cheapest per 100 g first", async () => {
    const data = await buildStoryData(catalog, menuWindow(anchor));
    const dishes = data!.dishes;
    expect(dishes).toHaveLength(6);
    expect(dishes[0]).toMatchObject({ mealId: "meal-minestrone", unitPriceCents: 144, unit: "ml" });
    expect(dishes[dishes.length - 1]).toMatchObject({ mealId: "meal-lasagna", unitPriceCents: 257, unit: "g" });
    const perHundred = dishes.map((d) => d.unitPriceCents);
    expect(perHundred).toEqual([...perHundred].sort((a, b) => a - b));
  });

  it("adds up portions per evening, earliest first", async () => {
    const data = await buildStoryData(catalog, menuWindow(anchor));
    const loads = eveningLoads(data!.offerings);
    expect(loads).toHaveLength(data!.eveningCount);
    expect(loads.map((l) => l.date)).toEqual([...loads.map((l) => l.date)].sort());
    expect(loads.reduce((sum, l) => sum + l.reserved, 0)).toBe(data!.reservedTotal);
    expect(loads.reduce((sum, l) => sum + l.capacity, 0)).toBe(data!.capacityTotal);
    for (const load of loads) expect(load.reserved).toBeLessThanOrEqual(load.capacity);
  });
});
