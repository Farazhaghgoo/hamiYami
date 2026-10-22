import { z } from "zod";
import { idSchema } from "./ids";
import { localizedTextSchema } from "./localized";
import { moneySchema } from "./money";
import { OFFERING_LIMITS } from "./offering";
import { fail, ok, type Result } from "./result";
import { civilDateSchema, localTimeSchema, pickupWindowSchema } from "./time";

/**
 * Reservation lifecycle:
 *
 *   requested ──cook──▶ confirmed ──cook──▶ collected
 *      │  │                 │   └──cook──▶ not_collected
 *      │  └──cook──▶ declined_by_cook
 *      └──customer──▶ cancelled_by_customer ◀──customer── (from confirmed, before cut-off)
 *
 * Customers may cancel until the reservation cut-off. Cooks may mark a reservation collected or
 * not collected only once its pickup window has started. All other statuses are final.
 */
export const RESERVATION_STATUSES = [
  "requested",
  "confirmed",
  "collected",
  "not_collected",
  "cancelled_by_customer",
  "declined_by_cook",
] as const;
export const reservationStatusSchema = z.enum(RESERVATION_STATUSES);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const reservationActorSchema = z.enum(["customer", "cook"]);
export type ReservationActor = z.infer<typeof reservationActorSchema>;

const TRANSITIONS: Record<ReservationStatus, Partial<Record<ReservationStatus, ReservationActor>>> = {
  requested: { confirmed: "cook", declined_by_cook: "cook", cancelled_by_customer: "customer" },
  confirmed: { collected: "cook", not_collected: "cook", cancelled_by_customer: "customer" },
  collected: {},
  not_collected: {},
  cancelled_by_customer: {},
  declined_by_cook: {},
};

/** Statuses whose portions count against an offering's capacity. */
export function holdsCapacity(status: ReservationStatus): boolean {
  return status !== "cancelled_by_customer" && status !== "declined_by_cook";
}

export function isFinal(status: ReservationStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

export const reservationSchema = z.object({
  id: idSchema,
  /** One checkout attempt = one key. Re-submitting the same key returns the same reservation. */
  idempotencyKey: z.string().min(8).max(100),
  offeringId: idSchema,
  mealId: idSchema,
  cookId: idSchema,
  quantity: z.int().min(1).max(OFFERING_LIMITS.maxPerReservationMax),
  /** Price snapshot taken at reservation time; later price edits do not change it. */
  unitPrice: moneySchema,
  total: moneySchema,
  pickup: z.object({
    date: civilDateSchema,
    window: pickupWindowSchema,
    slot: localTimeSchema,
    neighborhoodName: z.string(),
    area: localizedTextSchema,
  }),
  /** Display snapshot, so a reservation stays readable if the meal is later edited. */
  mealTitle: localizedTextSchema,
  cookName: z.string(),
  status: reservationStatusSchema,
  history: z.array(
    z.object({
      status: reservationStatusSchema,
      at: z.iso.datetime(),
      actor: reservationActorSchema,
    }),
  ),
  createdAt: z.iso.datetime(),
  /** Reservation cut-off of the offering at booking time (ISO instant). */
  cancellableUntil: z.iso.datetime(),
  pickupStartsAt: z.iso.datetime(),
  /** Every reservation in this build is a simulation stored only in the visitor's browser. */
  simulated: z.literal(true),
});
export type Reservation = z.infer<typeof reservationSchema>;

export type TransitionError = "not_allowed" | "wrong_actor" | "cutoff_passed" | "pickup_not_started";

export function checkTransition(
  reservation: Pick<Reservation, "status" | "cancellableUntil" | "pickupStartsAt">,
  to: ReservationStatus,
  actor: ReservationActor,
  now: Date,
): TransitionError | null {
  const allowedActor = TRANSITIONS[reservation.status][to];
  if (!allowedActor) return "not_allowed";
  if (allowedActor !== actor) return "wrong_actor";
  if (to === "cancelled_by_customer" && now.getTime() >= Date.parse(reservation.cancellableUntil)) {
    return "cutoff_passed";
  }
  if ((to === "collected" || to === "not_collected") && now.getTime() < Date.parse(reservation.pickupStartsAt)) {
    return "pickup_not_started";
  }
  return null;
}

export function transitionReservation(
  reservation: Reservation,
  to: ReservationStatus,
  actor: ReservationActor,
  now: Date,
): Result<Reservation, TransitionError> {
  const error = checkTransition(reservation, to, actor, now);
  if (error) return fail(error);
  return ok({
    ...reservation,
    status: to,
    history: [...reservation.history, { status: to, at: now.toISOString(), actor }],
  });
}

export function allowedTransitions(
  reservation: Pick<Reservation, "status" | "cancellableUntil" | "pickupStartsAt">,
  actor: ReservationActor,
  now: Date,
): ReservationStatus[] {
  return (Object.keys(TRANSITIONS[reservation.status]) as ReservationStatus[]).filter(
    (to) => checkTransition(reservation, to, actor, now) === null,
  );
}

export const newReservationInputSchema = z.object({
  offeringId: idSchema,
  quantity: z.int({ error: "not_a_whole_number" }).min(1, { error: "below_minimum" }),
  slot: localTimeSchema,
  idempotencyKey: z.string().min(8).max(100),
});
export type NewReservationInput = z.infer<typeof newReservationInputSchema>;
