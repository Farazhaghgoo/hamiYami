import type { CatalogRepository } from "@/data/contracts";
import type { CookProfile, Meal } from "@/domain/catalog";
import type { LocalizedText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import { buildMealCards, type MealCardView } from "@/features/meals/discovery";

export interface CookProfileView {
  cook: CookProfile;
  neighborhoodName: string;
  pickupArea: LocalizedText | null;
  /** The cook's sample menu: every dish they offer, scheduled or not. */
  sampleMenu: Meal[];
  upcoming: MealCardView[];
}

export async function getCookProfile(
  catalog: CatalogRepository,
  cookId: string,
  window: MenuWindow,
  now: Date,
): Promise<CookProfileView | null> {
  const cook = await catalog.getCook(cookId);
  if (!cook) return null;
  const [neighborhoods, sampleMenu, snapshots] = await Promise.all([
    catalog.listNeighborhoods(),
    catalog.listMeals({ cookId }),
    catalog.listOfferings({ from: window.from, to: window.to, cookId }),
  ]);
  const neighborhood = neighborhoods.find((n) => n.id === cook.neighborhoodId);
  return {
    cook,
    neighborhoodName: neighborhood?.name ?? "",
    pickupArea: neighborhood?.pickupPoints.find((p) => p.id === cook.pickupPointId)?.area ?? null,
    sampleMenu,
    upcoming: await buildMealCards(catalog, snapshots, now),
  };
}
