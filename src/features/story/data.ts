import type { CatalogRepository } from "@/data/contracts";
import { ALLERGENS } from "@/domain/food-info";
import type { LocalizedText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import { PICKUP_CODE_LENGTH } from "@/domain/pickup-code";
import { priceStats, unitPricePer100, type PriceStats } from "@/domain/pricing";
import { PICKUP_SLOT_MINUTES, type CivilDate, type LocalTime } from "@/domain/time";

/*
 * The numbers behind the "how we solve it" story, computed from the catalog through the same
 * data-access contracts as the rest of the app. Today that is the fictional demo menu, so every
 * screen that shows these numbers labels them as demo data; with a database they become real.
 */

export interface StoryOffering {
  offeringId: string;
  mealTitle: LocalizedText;
  cookName: string;
  date: CivilDate;
  start: LocalTime;
  priceCents: number;
  capacity: number;
  reserved: number;
}

export interface StoryDish {
  mealId: string;
  title: LocalizedText;
  priceCents: number;
  /** Price per 100 g or 100 ml, when the dish has a portion size. */
  unitPriceCents: number;
  amount: number;
  unit: "g" | "ml";
}

export interface StoryData {
  neighborhoodName: string;
  cookCount: number;
  dishCount: number;
  offeringCount: number;
  eveningCount: number;
  prices: PriceStats;
  offerings: StoryOffering[];
  /** One entry per dish with a known portion size, cheapest per 100 g first. */
  dishes: StoryDish[];
  capacityTotal: number;
  reservedTotal: number;
  cutoffHours: number;
  allergenCount: number;
  slotMinutes: number;
  pickupCodeLength: number;
}

export interface EveningLoad {
  date: CivilDate;
  reserved: number;
  capacity: number;
}

/** Portions reserved and planned, added up per evening, earliest first. */
export function eveningLoads(offerings: StoryOffering[]): EveningLoad[] {
  const byDate = new Map<CivilDate, EveningLoad>();
  for (const o of offerings) {
    const load = byDate.get(o.date) ?? { date: o.date, reserved: 0, capacity: 0 };
    load.reserved += o.reserved;
    load.capacity += o.capacity;
    byDate.set(o.date, load);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function buildStoryData(catalog: CatalogRepository, menu: MenuWindow): Promise<StoryData | null> {
  const [neighborhoods, cooks, meals] = await Promise.all([
    catalog.listNeighborhoods(),
    catalog.listCooks(),
    catalog.listMeals(),
  ]);
  const pilot = neighborhoods.find((n) => n.isPilot);
  if (!pilot) return null;
  const snapshots = await catalog.listOfferings({ from: menu.from, to: menu.to, neighborhoodId: pilot.id });
  const prices = priceStats(snapshots.map((s) => s.offering.price.amountCents));
  if (!prices) return null;

  const offerings: StoryOffering[] = snapshots.flatMap(({ offering, reservedPortions }) => {
    const meal = meals.find((m) => m.id === offering.mealId);
    const cook = cooks.find((c) => c.id === offering.cookId);
    if (!meal || !cook) return [];
    return [
      {
        offeringId: offering.id,
        mealTitle: meal.title,
        cookName: cook.displayName,
        date: offering.pickupDate,
        start: offering.pickupWindow.start,
        priceCents: offering.price.amountCents,
        capacity: offering.capacity,
        reserved: Math.min(reservedPortions, offering.capacity),
      },
    ];
  });

  const dishes: StoryDish[] = [];
  for (const { offering } of snapshots) {
    const meal = meals.find((m) => m.id === offering.mealId);
    if (!meal?.portionSize || dishes.some((d) => d.mealId === meal.id)) continue;
    dishes.push({
      mealId: meal.id,
      title: meal.title,
      priceCents: offering.price.amountCents,
      unitPriceCents: unitPricePer100(offering.price, meal.portionSize).amountCents,
      amount: meal.portionSize.amount,
      unit: meal.portionSize.unit,
    });
  }
  dishes.sort((a, b) => a.unitPriceCents - b.unitPriceCents);

  // The most common cut-off, in hours: what a customer should expect.
  const cutoffs = snapshots.map((s) => s.offering.cutoffMinutesBefore);
  const cutoffMinutes = [...new Set(cutoffs)].sort(
    (a, b) => cutoffs.filter((c) => c === b).length - cutoffs.filter((c) => c === a).length,
  )[0]!;

  return {
    neighborhoodName: pilot.name,
    cookCount: new Set(offerings.map((o) => o.cookName)).size,
    dishCount: new Set(snapshots.map((s) => s.offering.mealId)).size,
    offeringCount: offerings.length,
    eveningCount: new Set(offerings.map((o) => o.date)).size,
    prices,
    offerings,
    dishes,
    capacityTotal: offerings.reduce((sum, o) => sum + o.capacity, 0),
    reservedTotal: offerings.reduce((sum, o) => sum + o.reserved, 0),
    cutoffHours: Math.round(cutoffMinutes / 60),
    allergenCount: ALLERGENS.length,
    slotMinutes: PICKUP_SLOT_MINUTES,
    pickupCodeLength: PICKUP_CODE_LENGTH,
  };
}
