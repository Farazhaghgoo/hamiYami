import type { CookProfile, Meal, Neighborhood } from "@/domain/catalog";
import { menuWindow } from "@/domain/menu-window";
import { multiplyMoney } from "@/domain/money";
import { pickupStart, reservationCutoff, type Offering } from "@/domain/offering";
import type { Reservation } from "@/domain/reservation";
import { addDays, romeDateTimeToInstant, weekdayOf, type CivilDate } from "@/domain/time";
import { cooks, meals, neighborhoods } from "../fixtures/catalog";
import { DEFAULT_CUTOFF_MINUTES, weeklyMenu } from "../fixtures/weekly-menu";

export interface SeedCatalog {
  anchor: CivilDate;
  neighborhoods: Neighborhood[];
  cooks: CookProfile[];
  meals: Meal[];
  offerings: Offering[];
  /** Reservations by fictional customers, shown in the cook workspace and counted in availability. */
  sampleReservations: Reservation[];
}

export function seedOfferingId(scheduleKey: string, date: CivilDate): string {
  return `off-${scheduleKey}-${date}`;
}

/**
 * Builds the fictional catalog relative to an anchor date ("today" in Rome). The same anchor always
 * yields the same identifiers, so links and stored demo data stay stable for the day.
 */
export function buildSeedCatalog(anchor: CivilDate): SeedCatalog {
  const offerings: Offering[] = [];
  const sampleReservations: Reservation[] = [];

  for (const date of menuWindow(anchor).dates) {
    const weekday = weekdayOf(date);
    for (const schedule of weeklyMenu.filter((s) => s.weekday === weekday)) {
      const meal = meals.find((m) => m.id === schedule.mealId);
      const cook = meal && cooks.find((c) => c.id === meal.cookId);
      const neighborhood = cook && neighborhoods.find((n) => n.id === cook.neighborhoodId);
      const pickupPoint = neighborhood?.pickupPoints.find((p) => p.id === cook?.pickupPointId);
      if (!meal || !cook || !neighborhood || !pickupPoint) {
        throw new Error(`Fixture schedule ${schedule.key} references missing catalog data`);
      }

      const offering: Offering = {
        id: seedOfferingId(schedule.key, date),
        mealId: meal.id,
        cookId: cook.id,
        neighborhoodId: neighborhood.id,
        pickupPointId: pickupPoint.id,
        pickupDate: date,
        pickupWindow: schedule.pickupWindow,
        cutoffMinutesBefore: DEFAULT_CUTOFF_MINUTES,
        price: schedule.price,
        capacity: schedule.capacity,
        maxPerReservation: schedule.maxPerReservation,
        status: "published",
      };
      offerings.push(offering);

      const createdAt = romeDateTimeToInstant(addDays(anchor, -1), "10:00").toISOString();
      schedule.seedReservations.forEach((seed, index) => {
        sampleReservations.push({
          id: `sample-${offering.id}-${index + 1}`,
          idempotencyKey: `sample-${offering.id}-${index + 1}`,
          offeringId: offering.id,
          mealId: meal.id,
          cookId: cook.id,
          quantity: seed.quantity,
          unitPrice: offering.price,
          total: multiplyMoney(offering.price, seed.quantity),
          pickup: {
            date,
            window: offering.pickupWindow,
            slot: offering.pickupWindow.start,
            neighborhoodName: neighborhood.name,
            area: pickupPoint.area,
          },
          mealTitle: meal.title,
          cookName: cook.displayName,
          status: seed.status,
          history:
            seed.status === "requested"
              ? [{ status: "requested", at: createdAt, actor: "customer" }]
              : [
                  { status: "requested", at: createdAt, actor: "customer" },
                  { status: seed.status, at: createdAt, actor: "cook" },
                ],
          createdAt,
          cancellableUntil: reservationCutoff(offering).toISOString(),
          pickupStartsAt: pickupStart(offering).toISOString(),
          simulated: true,
        });
      });
    }
  }

  return { anchor, neighborhoods, cooks, meals, offerings, sampleReservations };
}
