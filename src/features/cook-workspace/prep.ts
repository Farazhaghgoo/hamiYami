import type { OfferingSnapshot } from "@/data/contracts";
import type { Meal } from "@/domain/catalog";
import type { LocalizedText } from "@/domain/localized";
import type { Offering } from "@/domain/offering";
import { holdsCapacity, type Reservation } from "@/domain/reservation";
import type { CivilDate } from "@/domain/time";

/** One dish on one day: what to cook and who comes to collect it. */
export interface PrepItem {
  offering: Offering;
  mealTitle: LocalizedText | null;
  /** Portions in reservations the cook has confirmed. */
  confirmedPortions: number;
  /** Portions in requests still waiting for the cook's decision. */
  requestedPortions: number;
  /** What to cook if every open request is accepted. */
  toPrepare: number;
  /** Portions nobody holds yet. */
  remaining: number;
  /** Reservations still to hand over (or already handled), in pickup order. */
  reservations: Reservation[];
  /** Cancelled or declined reservations: they no longer need cooking. */
  releasedCount: number;
}

export interface PrepDay {
  date: CivilDate;
  items: PrepItem[];
  toPrepare: number;
  /** Number of requests waiting for the cook's decision. */
  pendingRequests: number;
}

/**
 * Turns a cook's offerings and reservations into a per-day preparation plan. An offering appears
 * when it is published or still has open reservations (unpublishing does not cancel them).
 */
export function buildPrepPlan(offerings: OfferingSnapshot[], meals: Meal[], reservations: Reservation[]): PrepDay[] {
  const byOffering = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    const list = byOffering.get(reservation.offeringId) ?? [];
    list.push(reservation);
    byOffering.set(reservation.offeringId, list);
  }

  const items: PrepItem[] = [];
  for (const { offering, reservedPortions } of offerings) {
    const all = byOffering.get(offering.id) ?? [];
    const sum = (status: Reservation["status"]) =>
      all.filter((r) => r.status === status).reduce((total, r) => total + r.quantity, 0);
    const confirmedPortions = sum("confirmed");
    const requestedPortions = sum("requested");
    if (offering.status !== "published" && confirmedPortions + requestedPortions === 0) continue;

    items.push({
      offering,
      mealTitle: meals.find((m) => m.id === offering.mealId)?.title ?? all[0]?.mealTitle ?? null,
      confirmedPortions,
      requestedPortions,
      toPrepare: confirmedPortions + requestedPortions,
      remaining: Math.max(0, offering.capacity - reservedPortions),
      reservations: all
        .filter((r) => holdsCapacity(r.status))
        .sort((a, b) => a.pickup.slot.localeCompare(b.pickup.slot) || a.createdAt.localeCompare(b.createdAt)),
      releasedCount: all.filter((r) => !holdsCapacity(r.status)).length,
    });
  }

  items.sort(
    (a, b) =>
      a.offering.pickupDate.localeCompare(b.offering.pickupDate) ||
      a.offering.pickupWindow.start.localeCompare(b.offering.pickupWindow.start),
  );

  const days: PrepDay[] = [];
  for (const item of items) {
    let day = days[days.length - 1];
    if (!day || day.date !== item.offering.pickupDate) {
      day = { date: item.offering.pickupDate, items: [], toPrepare: 0, pendingRequests: 0 };
      days.push(day);
    }
    day.items.push(item);
    day.toPrepare += item.toPrepare;
    day.pendingRequests += item.reservations.filter((r) => r.status === "requested").length;
  }
  return days;
}
