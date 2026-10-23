import type { CatalogRepository, OfferingSnapshot } from "@/data/contracts";
import type { CookProfile, Meal, MealImage, Neighborhood } from "@/domain/catalog";
import { dietaryTagSchema, type Allergen, type DietaryTag } from "@/domain/food-info";
import type { LocalizedText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import type { Money } from "@/domain/money";
import { computeAvailability, type Availability } from "@/domain/offering";
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
    dietary: DietaryTag[];
    allergens: Allergen[];
  };
  cook: { id: string; displayName: string };
  neighborhoodName: string;
}

export const PRICE_FILTER_OPTIONS = [700, 800, 900] as const;

export interface DiscoveryFilters {
  neighborhood: string | null;
  date: CivilDate | null;
  diet: DietaryTag[];
  maxPriceCents: number | null;
}

export const EMPTY_FILTERS: DiscoveryFilters = { neighborhood: null, date: null, diet: [], maxPriceCents: null };

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
  return {
    neighborhood: neighborhood && /^[a-z0-9-]{3,60}$/.test(neighborhood) ? neighborhood : null,
    date: date && civilDateSchema.safeParse(date).success && window.dates.includes(date) ? date : null,
    diet: [...new Set(diet)].filter((d): d is DietaryTag => dietaryTagSchema.safeParse(d).success),
    maxPriceCents: (PRICE_FILTER_OPTIONS as readonly number[]).includes(maxPrice) ? maxPrice : null,
  };
}

/** The inverse of parseDiscoveryFilters, for shareable URLs. No personal data ever goes here. */
export function filtersToSearchParams(filters: DiscoveryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.neighborhood) params.set("area", filters.neighborhood);
  if (filters.date) params.set("date", filters.date);
  if (filters.diet.length) params.set("diet", filters.diet.join(","));
  if (filters.maxPriceCents !== null) params.set("maxPrice", String(filters.maxPriceCents));
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
  cards: MealCardView[];
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

  return { neighborhoods, neighborhood, countsByDate, cards };
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

