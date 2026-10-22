import { allowedTransitions, type Reservation } from "@/domain/reservation";
import { romeDateTimeToInstant } from "@/domain/time";

export interface ReservationTiming {
  /** Still ahead: requested or confirmed, and the pickup window has not ended. */
  upcoming: boolean;
  canCancel: boolean;
}

export function reservationTiming(reservation: Reservation, now: Date): ReservationTiming {
  const pickupEnd = romeDateTimeToInstant(reservation.pickup.date, reservation.pickup.window.end);
  const open = reservation.status === "requested" || reservation.status === "confirmed";
  return {
    upcoming: open && now.getTime() < pickupEnd.getTime(),
    canCancel: allowedTransitions(reservation, "customer", now).includes("cancelled_by_customer"),
  };
}

export function splitReservations(reservations: Reservation[], now: Date) {
  const upcoming: Reservation[] = [];
  const past: Reservation[] = [];
  for (const reservation of reservations) {
    (reservationTiming(reservation, now).upcoming ? upcoming : past).push(reservation);
  }
  upcoming.sort((a, b) => a.pickupStartsAt.localeCompare(b.pickupStartsAt));
  return { upcoming, past };
}
