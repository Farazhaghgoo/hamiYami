import { describe, expect, it } from "vitest";
import { eur } from "@/domain/money";
import {
  checkCapacityChange,
  checkQuantity,
  computeAvailability,
  offeringSchema,
  type Offering,
} from "@/domain/offering";
import {
  allowedTransitions,
  holdsCapacity,
  transitionReservation,
  type Reservation,
} from "@/domain/reservation";

const offering: Offering = {
  id: "off-test",
  mealId: "meal-test",
  cookId: "cook-test",
  neighborhoodId: "nb-test",
  pickupPointId: "pp-test",
  pickupDate: "2026-10-27",
  pickupWindow: { start: "18:30", end: "19:30" },
  cutoffMinutesBefore: 360,
  price: eur(900),
  capacity: 10,
  maxPerReservation: 4,
  status: "published",
};

// 27 Oct 2026 is CET (UTC+1): pickup starts 17:30Z, cut-off is six hours earlier at 11:30Z.
const beforeCutoff = new Date("2026-10-27T11:29:00Z");
const afterCutoff = new Date("2026-10-27T11:30:00Z");

describe("offering availability", () => {
  it("is available with plenty left, low near the end, sold out at zero", () => {
    expect(computeAvailability(offering, 2, beforeCutoff)).toMatchObject({ state: "available", remaining: 8, maxQuantity: 4 });
    expect(computeAvailability(offering, 8, beforeCutoff)).toMatchObject({ state: "low", remaining: 2, maxQuantity: 2 });
    expect(computeAvailability(offering, 10, beforeCutoff)).toMatchObject({ state: "sold_out", remaining: 0, reservable: false });
  });

  it("closes at the cut-off and when unpublished", () => {
    expect(computeAvailability(offering, 0, afterCutoff).state).toBe("closed");
    expect(computeAvailability({ ...offering, status: "unpublished" }, 0, beforeCutoff).state).toBe("unpublished");
    expect(computeAvailability(offering, 0, beforeCutoff).cutoff).toBe("2026-10-27T11:30:00.000Z");
  });

  it("validates quantities against the tighter limit", () => {
    const plenty = computeAvailability(offering, 0, beforeCutoff);
    expect(checkQuantity(2, offering, plenty)).toBeNull();
    expect(checkQuantity(0, offering, plenty)).toBe("below_minimum");
    expect(checkQuantity(1.5, offering, plenty)).toBe("not_a_whole_number");
    expect(checkQuantity(5, offering, plenty)).toBe("above_per_reservation");

    const low = computeAvailability(offering, 8, beforeCutoff);
    expect(checkQuantity(3, offering, low)).toBe("above_remaining");

    const soldOut = computeAvailability(offering, 10, beforeCutoff);
    expect(checkQuantity(1, offering, soldOut)).toBe("not_reservable");
  });

  it("rejects inconsistent offerings", () => {
    expect(offeringSchema.safeParse({ ...offering, maxPerReservation: 12, capacity: 10 }).success).toBe(false);
    expect(offeringSchema.safeParse({ ...offering, capacity: 0 }).success).toBe(false);
    expect(offeringSchema.safeParse({ ...offering, price: eur(20) }).success).toBe(false);
    expect(offeringSchema.safeParse(offering).success).toBe(true);
  });

  it("does not let a cook plan fewer portions than are already held", () => {
    expect(checkCapacityChange(4, 5)).toBe("below_reserved");
    expect(checkCapacityChange(5, 5)).toBeNull();
  });
});

describe("reservation lifecycle", () => {
  const reservation: Reservation = {
    id: "local_reservation_1",
    idempotencyKey: "key-12345678",
    offeringId: offering.id,
    mealId: offering.mealId,
    cookId: offering.cookId,
    quantity: 2,
    unitPrice: eur(900),
    total: eur(1800),
    pickup: {
      date: offering.pickupDate,
      window: offering.pickupWindow,
      slot: "18:45",
      neighborhoodName: "Test",
      area: { it: "Zona test", en: "Test area" },
    },
    mealTitle: { it: "Lasagna", en: "Lasagna" },
    cookName: "Test",
    status: "requested",
    history: [{ status: "requested", at: "2026-10-26T10:00:00.000Z", actor: "customer" }],
    createdAt: "2026-10-26T10:00:00.000Z",
    cancellableUntil: "2026-10-27T11:30:00.000Z",
    pickupStartsAt: "2026-10-27T17:30:00.000Z",
    simulated: true,
  };

  it("lets the customer cancel before the cut-off but not after", () => {
    const cancelled = transitionReservation(reservation, "cancelled_by_customer", "customer", beforeCutoff);
    expect(cancelled.ok && cancelled.value.status).toBe("cancelled_by_customer");
    expect(cancelled.ok && cancelled.value.history).toHaveLength(2);

    const late = transitionReservation(reservation, "cancelled_by_customer", "customer", afterCutoff);
    expect(late).toEqual({ ok: false, error: "cutoff_passed" });
  });

  it("only lets each actor make its own transitions", () => {
    expect(transitionReservation(reservation, "confirmed", "customer", beforeCutoff)).toEqual({ ok: false, error: "wrong_actor" });
    expect(transitionReservation(reservation, "collected", "cook", beforeCutoff)).toEqual({ ok: false, error: "not_allowed" });
    expect(allowedTransitions(reservation, "cook", beforeCutoff)).toEqual(["confirmed", "declined_by_cook"]);
  });

  it("allows collection only once the pickup window has started", () => {
    const confirmed = { ...reservation, status: "confirmed" as const };
    expect(transitionReservation(confirmed, "collected", "cook", beforeCutoff)).toEqual({ ok: false, error: "pickup_not_started" });
    const atPickup = new Date("2026-10-27T17:40:00Z");
    expect(transitionReservation(confirmed, "collected", "cook", atPickup).ok).toBe(true);
  });

  it("treats final statuses as final and releases capacity only when cancelled or declined", () => {
    const cancelled = { ...reservation, status: "cancelled_by_customer" as const };
    expect(allowedTransitions(cancelled, "customer", beforeCutoff)).toEqual([]);
    expect(holdsCapacity("requested")).toBe(true);
    expect(holdsCapacity("collected")).toBe(true);
    expect(holdsCapacity("cancelled_by_customer")).toBe(false);
    expect(holdsCapacity("declined_by_cook")).toBe(false);
  });
});
