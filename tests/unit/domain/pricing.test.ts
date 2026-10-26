import { describe, expect, it } from "vitest";
import { eur } from "@/domain/money";
import { offeringSchema, OFFERING_LIMITS } from "@/domain/offering";
import { mealSchema } from "@/domain/catalog";
import { isUnusualPrice, priceStats, unitPricePer100 } from "@/domain/pricing";

describe("open pricing", () => {
  it("accepts any price inside wide technical bounds", () => {
    expect(OFFERING_LIMITS.priceMinCents).toBe(50);
    expect(OFFERING_LIMITS.priceMaxCents).toBe(20000);
    const offering = {
      id: "off-test",
      mealId: "meal-test",
      cookId: "cook-test",
      neighborhoodId: "nb-test",
      pickupPointId: "pp-test",
      pickupDate: "2026-10-27",
      pickupWindow: { start: "18:30", end: "19:30" },
      cutoffMinutesBefore: 360,
      capacity: 10,
      maxPerReservation: 4,
      status: "published" as const,
    };
    for (const cents of [50, 120, 2500, 9900, 20000]) {
      expect(offeringSchema.safeParse({ ...offering, price: eur(cents) }).success, String(cents)).toBe(true);
    }
    expect(offeringSchema.safeParse({ ...offering, price: eur(49) }).success).toBe(false);
    expect(offeringSchema.safeParse({ ...offering, price: eur(20001) }).success).toBe(false);
  });

  it("summarises local prices", () => {
    expect(priceStats([])).toBeNull();
    expect(priceStats([900, 650, 850])).toEqual({ count: 3, minCents: 650, maxCents: 900, medianCents: 850 });
    expect(priceStats([800, 650, 900, 700])).toMatchObject({ medianCents: 750 });
  });

  it("flags only prices far from the local median, and only with enough prices to compare", () => {
    const stats = priceStats([650, 700, 800, 850, 900]);
    // Median 8,00 €: anything above 16,00 € or below 4,00 € asks for confirmation.
    expect(isUnusualPrice(8500, stats)).toBe(true);
    expect(isUnusualPrice(85, stats)).toBe(true);
    expect(isUnusualPrice(1500, stats)).toBe(false);
    expect(isUnusualPrice(450, stats)).toBe(false);
    expect(isUnusualPrice(8500, priceStats([800, 900]))).toBe(false);
    expect(isUnusualPrice(8500, null)).toBe(false);
  });
});

describe("comparing portions", () => {
  it("gives the price per 100 g or 100 ml, rounded to the cent", () => {
    expect(unitPricePer100(eur(900), { amount: 350, unit: "g" })).toEqual(eur(257));
    expect(unitPricePer100(eur(650), { amount: 450, unit: "ml" })).toEqual(eur(144));
    expect(unitPricePer100(eur(750), { amount: 250, unit: "g" })).toEqual(eur(300));
  });

  it("keeps portion size optional, so dishes saved before it existed still load", () => {
    const meal = {
      id: "local_meal_1",
      cookId: "cook-marta",
      title: { it: "Torta", en: "Torta" },
      description: { it: "Una torta salata.", en: "Una torta salata." },
      portion: { it: "Una fetta", en: "Una fetta" },
      ingredients: { it: "Farina", en: "Farina" },
      allergens: [],
      mayContain: [],
      dietary: [],
      image: null,
    };
    expect(mealSchema.safeParse(meal).success).toBe(true);
    expect(mealSchema.safeParse({ ...meal, portionSize: { amount: 250, unit: "g" } }).success).toBe(true);
    expect(mealSchema.safeParse({ ...meal, portionSize: { amount: 5, unit: "g" } }).success).toBe(false);
    expect(mealSchema.safeParse({ ...meal, portionSize: { amount: 250, unit: "kg" } }).success).toBe(false);
  });
});
