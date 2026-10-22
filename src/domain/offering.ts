import { z } from "zod";
import { idSchema } from "./ids";
import { moneySchema } from "./money";
import { civilDateSchema, pickupWindowSchema, romeDateTimeToInstant } from "./time";

/**
 * Capacity rules, in one place:
 * - An offering has a fixed number of portions (capacity) that the cook plans to prepare.
 * - A single reservation may take between 1 and maxPerReservation portions.
 * - Portions held by reservations in a "holding" status count against capacity
 *   (see holdsCapacity in reservation.ts); cancelled or declined reservations release them.
 * - A cook may not lower capacity below the portions already held.
 * - Reservations close at the cut-off: pickup start minus cutoffMinutesBefore.
 */
export const OFFERING_LIMITS = {
  capacityMax: 60,
  maxPerReservationMax: 8,
  cutoffMinutesMin: 60,
  cutoffMinutesMax: 48 * 60,
  lowStockThreshold: 3,
  priceMinCents: 100,
  priceMaxCents: 5000,
} as const;

export const offeringStatusSchema = z.enum(["published", "unpublished"]);
export type OfferingStatus = z.infer<typeof offeringStatusSchema>;

export const offeringSchema = z
  .object({
    id: idSchema,
    mealId: idSchema,
    cookId: idSchema,
    neighborhoodId: idSchema,
    pickupPointId: idSchema,
    pickupDate: civilDateSchema,
    pickupWindow: pickupWindowSchema,
    cutoffMinutesBefore: z
      .int()
      .min(OFFERING_LIMITS.cutoffMinutesMin)
      .max(OFFERING_LIMITS.cutoffMinutesMax),
    price: moneySchema.refine(
      (m) => m.amountCents >= OFFERING_LIMITS.priceMinCents && m.amountCents <= OFFERING_LIMITS.priceMaxCents,
      { error: "price_out_of_range" },
    ),
    capacity: z.int().min(1).max(OFFERING_LIMITS.capacityMax),
    maxPerReservation: z.int().min(1).max(OFFERING_LIMITS.maxPerReservationMax),
    status: offeringStatusSchema,
  })
  .refine((o) => o.maxPerReservation <= o.capacity, {
    error: "max_per_reservation_above_capacity",
    path: ["maxPerReservation"],
  });
export type Offering = z.infer<typeof offeringSchema>;

export type AvailabilityState = "available" | "low" | "sold_out" | "closed" | "unpublished";

export interface Availability {
  state: AvailabilityState;
  /** Portions not yet held by a reservation. */
  remaining: number;
  /** Largest quantity one reservation may take right now (0 when not reservable). */
  maxQuantity: number;
  /** ISO instant after which reservations (and customer cancellations) close. */
  cutoff: string;
  reservable: boolean;
}

export function reservationCutoff(offering: Pick<Offering, "pickupDate" | "pickupWindow" | "cutoffMinutesBefore">): Date {
  const pickupStart = romeDateTimeToInstant(offering.pickupDate, offering.pickupWindow.start);
  return new Date(pickupStart.getTime() - offering.cutoffMinutesBefore * 60_000);
}

export function pickupStart(offering: Pick<Offering, "pickupDate" | "pickupWindow">): Date {
  return romeDateTimeToInstant(offering.pickupDate, offering.pickupWindow.start);
}

export function computeAvailability(offering: Offering, reservedPortions: number, now: Date): Availability {
  const remaining = Math.max(0, offering.capacity - reservedPortions);
  const cutoff = reservationCutoff(offering);
  let state: AvailabilityState;
  if (offering.status !== "published") state = "unpublished";
  else if (now.getTime() >= cutoff.getTime()) state = "closed";
  else if (remaining === 0) state = "sold_out";
  else if (remaining <= OFFERING_LIMITS.lowStockThreshold) state = "low";
  else state = "available";

  const reservable = state === "available" || state === "low";
  return {
    state,
    remaining,
    maxQuantity: reservable ? Math.min(remaining, offering.maxPerReservation) : 0,
    cutoff: cutoff.toISOString(),
    reservable,
  };
}

export type QuantityIssue =
  | "not_a_whole_number"
  | "below_minimum"
  | "above_per_reservation"
  | "above_remaining"
  | "not_reservable";

export function checkQuantity(quantity: number, offering: Offering, availability: Availability): QuantityIssue | null {
  if (!availability.reservable) return "not_reservable";
  if (!Number.isInteger(quantity)) return "not_a_whole_number";
  if (quantity < 1) return "below_minimum";
  if (quantity > availability.maxQuantity) {
    // Report whichever limit is the tighter one.
    return availability.remaining < offering.maxPerReservation ? "above_remaining" : "above_per_reservation";
  }
  return null;
}

export type CapacityChangeIssue = "below_reserved";

/** A cook may not plan fewer portions than customers already hold. */
export function checkCapacityChange(newCapacity: number, reservedPortions: number): CapacityChangeIssue | null {
  return newCapacity < reservedPortions ? "below_reserved" : null;
}
