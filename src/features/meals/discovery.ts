import type { CatalogRepository, OfferingSnapshot } from "@/data/contracts";
import type { CookProfile, Meal, MealImage, Neighborhood, PortionSize } from "@/domain/catalog";
import { dietaryTagSchema, type Allergen, type DietaryTag } from "@/domain/food-info";
import type { LocalizedText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import type { Money } from "@/domain/money";
import { computeAvailability, OFFERING_LIMITS, type Availability } from "@/domain/offering";
import {
  civilDateSchema,
  romeDateOf,
  romeTimeOf,
  type CivilDate,
  type LocalTime,
  type PickupWindow,
} from "@/domain/time";

/** Everything a meal card shows, already joined and ready to render. */
export interface MealCardView {
  offeringId: string;
  pickupDate: CivilDate;
  pickupWindow: PickupWindow;
  price: Money;
  availability: Availability;
  meal: {
    id: string;
    title: LocalizedText;
    image: MealImage | null;
    portionSize?: PortionSize;
    dietary: DietaryTag[];
    allergens: Allergen[];
  };
  cook: { id: string; displayName: string };
  neighborhoodName: string;
}

export const SORT_ORDERS = ["time", "price_asc", "price_desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface DiscoveryFilters {
  neighborhood: string | null;
  date: CivilDate | null;
  diet: DietaryTag[];
  maxPriceCents: number | null;
  /** Pickup time (grouped by day) by default; customers can sort by price instead. */
  sort: SortOrder;
}

export const EMPTY_FILTERS: DiscoveryFilters = {
  neighborhood: null,
  date: null,
  diet: [],
  maxPriceCents: null,
  sort: "time",
};

type SearchParamsInput = Record<string, string | string[] | undefined> | URLSearchParams;

function readParam(params: SearchParamsInput, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const value = params[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Reads filters from the URL. Unknown or malformed values are ignored rather than trusted. */
export function parseDiscoveryFilters(params: SearchParamsInput, window: MenuWindow): DiscoveryFilters {
  const neighborhood = readParam(params, "area")[0] ?? null;
  const date = readParam(params, "date")[0];
  const diet = readParam(params, "diet").flatMap((v) => v.split(","));
  const maxPrice = Number(readParam(params, "maxPrice")[0]);
  const sort = readParam(params, "sort")[0];
  return {
    neighborhood: neighborhood && /^[a-z0-9-]{3,60}$/.test(neighborhood) ? neighborhood : null,
    date: date && civilDateSchema.safeParse(date).success && window.dates.includes(date) ? date : null,
    diet: [...new Set(diet)].filter((d): d is DietaryTag => dietaryTagSchema.safeParse(d).success),
    // Price steps come from the prices on the menu, so any sensible amount in cents is accepted.
    maxPriceCents:
      Number.isInteger(maxPrice) && maxPrice >= OFFERING_LIMITS.priceMinCents && maxPrice <= OFFERING_LIMITS.priceMaxCents
        ? maxPrice
        : null,
    sort: (SORT_ORDERS as readonly string[]).includes(sort ?? "") ? (sort as SortOrder) : "time",
  };
}

/** The inverse of parseDiscoveryFilters, for shareable URLs. No personal data ever goes here. */
export function filtersToSearchParams(filters: DiscoveryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.neighborhood) params.set("area", filters.neighborhood);
  if (filters.date) params.set("date", filters.date);
  if (filters.diet.length) params.set("diet", filters.diet.join(","));
  if (filters.maxPriceCents !== null) params.set("maxPrice", String(filters.maxPriceCents));
  if (filters.sort !== "time") params.set("sort", filters.sort);
  return params;
}

export function hasActiveFilters(filters: DiscoveryFilters, defaultNeighborhood: string | null): boolean {
  return (
    (filters.neighborhood !== null && filters.neighborhood !== defaultNeighborhood) ||
    filters.date !== null ||
    filters.diet.length > 0 ||
    filters.maxPriceCents !== null
  );
}

export function toMealCard(
  snapshot: OfferingSnapshot,
  meal: Meal,
  cook: CookProfile,
  neighborhood: Neighborhood,
  now: Date,
): MealCardView {
  const { offering } = snapshot;
  return {
    offeringId: offering.id,
    pickupDate: offering.pickupDate,
    pickupWindow: offering.pickupWindow,
    price: offering.price,
    availability: computeAvailability(offering, snapshot.reservedPortions, now),
    meal: {
      id: meal.id,
      title: meal.title,
      image: meal.image,
      ...(meal.portionSize ? { portionSize: meal.portionSize } : {}),
      dietary: meal.dietary,
      allergens: meal.allergens,
    },
    cook: { id: cook.id, displayName: cook.displayName },
    neighborhoodName: neighborhood.name,
  };
}

export async function buildMealCards(
  catalog: CatalogRepository,
  snapshots: OfferingSnapshot[],
  now: Date,
): Promise<MealCardView[]> {
  const [meals, cooks, neighborhoods] = await Promise.all([
    catalog.listMeals(),
    catalog.listCooks(),
    catalog.listNeighborhoods(),
  ]);
  return snapshots.flatMap((snapshot) => {
    const meal = meals.find((m) => m.id === snapshot.offering.mealId);
    const cook = cooks.find((c) => c.id === snapshot.offering.cookId);
    const neighborhood = neighborhoods.find((n) => n.id === snapshot.offering.neighborhoodId);
    return meal && cook && neighborhood ? [toMealCard(snapshot, meal, cook, neighborhood, now)] : [];
  });
}

export interface DiscoveryResult {
  neighborhoods: Neighborhood[];
  /** The neighborhood being browsed (the pilot neighborhood unless another was chosen). */
  neighborhood: Neighborhood | null;
  /** Offerings per date in the window for the chosen neighborhood, before other filters. */
  countsByDate: Record<CivilDate, number>;
  /** "Up to" price steps (cents) based on the prices currently on the menu. */
  priceOptions: number[];
  cards: MealCardView[];
}

/**
 * Builds "up to" price steps from the prices on the menu: whole-euro points, leaving out the top one
 * (it would include every dish). Cooks set prices freely, so fixed steps would soon stop fitting.
 */
export function priceFilterOptions(cards: Pick<MealCardView, "price">[], maxOptions = 4): number[] {
  const points = [...new Set(cards.map((c) => Math.ceil(c.price.amountCents / 100) * 100))].sort((a, b) => a - b);
  const steps = points.slice(0, -1);
  if (steps.length <= maxOptions) return steps;
  // Spread the steps evenly when there are many distinct prices.
  return [...new Set(Array.from({ length: maxOptions }, (_, i) => steps[Math.round((i * (steps.length - 1)) / (maxOptions - 1))]!))];
}

export function sortCards(cards: MealCardView[], sort: SortOrder): MealCardView[] {
  const byTime = (a: MealCardView, b: MealCardView) =>
    a.pickupDate.localeCompare(b.pickupDate) || a.pickupWindow.start.localeCompare(b.pickupWindow.start);
  const sorted = [...cards];
  if (sort === "time") return sorted.sort(byTime);
  const direction = sort === "price_asc" ? 1 : -1;
  // Ties keep pickup-time order, so equal prices never reshuffle between visits.
  return sorted.sort((a, b) => direction * (a.price.amountCents - b.price.amountCents) || byTime(a, b));
}

export async function discoverMeals(
  catalog: CatalogRepository,
  window: MenuWindow,
  filters: DiscoveryFilters,
  now: Date,
): Promise<DiscoveryResult> {
  const neighborhoods = await catalog.listNeighborhoods();
  const neighborhood =
    neighborhoods.find((n) => n.id === filters.neighborhood) ?? neighborhoods.find((n) => n.isPilot) ?? null;

  const snapshots = neighborhood
    ? await catalog.listOfferings({ from: window.from, to: window.to, neighborhoodId: neighborhood.id })
    : [];
  const all = await buildMealCards(catalog, snapshots, now);

  const countsByDate = Object.fromEntries(window.dates.map((d) => [d, 0])) as Record<CivilDate, number>;
  for (const card of all) countsByDate[card.pickupDate] = (countsByDate[card.pickupDate] ?? 0) + 1;

  const cards = all.filter(
    (card) =>
      (!filters.date || card.pickupDate === filters.date) &&
      filters.diet.every((tag) => card.meal.dietary.includes(tag)) &&
      (filters.maxPriceCents === null || card.price.amountCents <= filters.maxPriceCents),
  );

  // A step chosen earlier (e.g. from a shared link) stays visible even if the menu has changed.
  const priceOptions = priceFilterOptions(all);
  if (filters.maxPriceCents !== null && !priceOptions.includes(filters.maxPriceCents)) {
    priceOptions.push(filters.maxPriceCents);
    priceOptions.sort((a, b) => a - b);
  }

  return { neighborhoods, neighborhood, countsByDate, priceOptions, cards: sortCards(cards, filters.sort) };
}

export interface DayGroup {
  date: CivilDate;
  cards: MealCardView[];
}

/** Groups cards by pickup day, keeping their order (days in date order, dishes by pickup time). */
export function groupByDay(cards: MealCardView[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const card of [...cards].sort(
    (a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.pickupWindow.start.localeCompare(b.pickupWindow.start),
  )) {
    const last = groups[groups.length - 1];
    if (last && last.date === card.pickupDate) last.cards.push(card);
    else groups.push({ date: card.pickupDate, cards: [card] });
  }
  return groups;
}

export interface ReservationDeadline {
  date: CivilDate;
  time: LocalTime;
  /** True when reservations close on the pickup day itself, so the day can be left out. */
  sameDayAsPickup: boolean;
}

/** When reservations close, in Rome time, for showing on a card. */
export function reservationDeadline(card: Pick<MealCardView, "availability" | "pickupDate">): ReservationDeadline {
  const cutoff = new Date(card.availability.cutoff);
  const date = romeDateOf(cutoff);
  return { date, time: romeTimeOf(cutoff), sameDayAsPickup: date === card.pickupDate };
}

/** A few upcoming meals for the homepage, preferring dishes with photos and open availability. */
export async function featuredMeals(catalog: CatalogRepository, window: MenuWindow, now: Date, limit = 3) {
  const snapshots = await catalog.listOfferings({ from: window.from, to: window.to });
  const cards = await buildMealCards(catalog, snapshots, now);
  const seen = new Set<string>();
  const ranked = cards
    .filter((c) => c.availability.reservable)
    .sort((a, b) => Number(Boolean(b.meal.image)) - Number(Boolean(a.meal.image)));
  return ranked.filter((c) => (seen.has(c.meal.id) ? false : (seen.add(c.meal.id), true))).slice(0, limit);
}

