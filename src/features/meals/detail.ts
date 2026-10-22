import type { CatalogRepository } from "@/data/contracts";
import type { CookProfile, Meal } from "@/domain/catalog";
import type { LocalizedText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import { computeAvailability, type Availability, type Offering } from "@/domain/offering";
import { pickupSlots, type CivilDate, type LocalTime } from "@/domain/time";

export interface OfferingDetailView {
  offering: Offering;
  meal: Meal;
  cook: Pick<CookProfile, "id" | "displayName" | "cookingStyle" | "isFictional">;
  neighborhoodName: string;
  pickupArea: LocalizedText;
  availability: Availability;
  slots: LocalTime[];
  /** Other upcoming dates for the same meal, to recover from sold-out or closed offerings. */
  otherDates: { offeringId: string; date: CivilDate; reservable: boolean }[];
}

export async function getOfferingDetail(
  catalog: CatalogRepository,
  offeringId: string,
  window: MenuWindow,
  now: Date,
): Promise<OfferingDetailView | null> {
  const snapshot = await catalog.getOffering(offeringId);
  if (!snapshot || snapshot.offering.status !== "published") return null;
  const { offering } = snapshot;

  const [meal, cook, neighborhoods, sameMeal] = await Promise.all([
    catalog.getMeal(offering.mealId),
    catalog.getCook(offering.cookId),
    catalog.listNeighborhoods(),
    catalog.listOfferings({ from: window.from, to: window.to, cookId: offering.cookId }),
  ]);
  const neighborhood = neighborhoods.find((n) => n.id === offering.neighborhoodId);
  const pickupPoint = neighborhood?.pickupPoints.find((p) => p.id === offering.pickupPointId);
  if (!meal || !cook || !neighborhood || !pickupPoint) return null;

  return {
    offering,
    meal,
    cook: { id: cook.id, displayName: cook.displayName, cookingStyle: cook.cookingStyle, isFictional: cook.isFictional },
    neighborhoodName: neighborhood.name,
    pickupArea: pickupPoint.area,
    availability: computeAvailability(offering, snapshot.reservedPortions, now),
    slots: pickupSlots(offering.pickupWindow),
    otherDates: sameMeal
      .filter((s) => s.offering.mealId === meal.id && s.offering.id !== offering.id)
      .map((s) => ({
        offeringId: s.offering.id,
        date: s.offering.pickupDate,
        reservable: computeAvailability(s.offering, s.reservedPortions, now).reservable,
      })),
  };
}
