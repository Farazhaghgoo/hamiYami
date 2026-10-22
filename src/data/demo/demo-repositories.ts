/*
 * Demo implementation of the data-access contracts: the fictional seed catalog combined with the
 * changes stored in one visitor's browser. Nothing here talks to a server, so nothing is shared
 * between visitors and no real order, payment or message is ever created.
 */
import type {
  CatalogRepository,
  CookWorkspaceRepository,
  CreateReservationError,
  MarketplaceRepositories,
  OfferingQuery,
  OfferingSnapshot,
  ReservationRepository,
  SaveOfferingError,
} from "@/data/contracts";
import type { Meal } from "@/domain/catalog";
import { normalizeDietaryTags, sortAllergens } from "@/domain/food-info";
import { isLocalId, newLocalId } from "@/domain/ids";
import { schedulableRange, todayInRome } from "@/domain/menu-window";
import { multiplyMoney } from "@/domain/money";
import {
  checkCapacityChange,
  checkQuantity,
  computeAvailability,
  offeringSchema,
  pickupStart,
  reservationCutoff,
  type Offering,
} from "@/domain/offering";
import { fail, ok } from "@/domain/result";
import {
  holdsCapacity,
  newReservationInputSchema,
  transitionReservation,
  type Reservation,
} from "@/domain/reservation";
import { pickupSlots } from "@/domain/time";
import { upsertById } from "./demo-state";
import type { DemoStore } from "./demo-store";
import type { SeedCatalog } from "./seed";

/** Records in visitor state replace seed records with the same id; new ones are appended. */
function overlay<T extends { id: string }>(seed: readonly T[], changes: readonly T[]): T[] {
  return changes.reduce<T[]>((items, change) => upsertById(items, change), seed.slice());
}

export function createDemoRepositories({
  seed,
  store,
  demoCookId,
}: {
  seed: SeedCatalog;
  store: DemoStore;
  /** The fictional cook whose workspace the visitor can try. */
  demoCookId: string;
}): MarketplaceRepositories {
  const meals = () => overlay(seed.meals, store.getState().meals);
  const offerings = () => overlay(seed.offerings, store.getState().offerings);
  const reservations = () => overlay(seed.sampleReservations, store.getState().reservations);

  function reservedPortions(offeringId: string, all: readonly Reservation[] = reservations()): number {
    return all
      .filter((r) => r.offeringId === offeringId && holdsCapacity(r.status))
      .reduce((sum, r) => sum + r.quantity, 0);
  }

  function snapshot(offering: Offering, all?: readonly Reservation[]): OfferingSnapshot {
    return { offering, reservedPortions: reservedPortions(offering.id, all) };
  }

  function queryOfferings(query: OfferingQuery): OfferingSnapshot[] {
    const all = reservations();
    return offerings()
      .filter(
        (o) =>
          o.pickupDate >= query.from &&
          o.pickupDate <= query.to &&
          (query.includeUnpublished || o.status === "published") &&
          (!query.neighborhoodId || o.neighborhoodId === query.neighborhoodId) &&
          (!query.cookId || o.cookId === query.cookId),
      )
      .sort((a, b) =>
        a.pickupDate === b.pickupDate
          ? a.pickupWindow.start.localeCompare(b.pickupWindow.start)
          : a.pickupDate.localeCompare(b.pickupDate),
      )
      .map((o) => snapshot(o, all));
  }

  const catalog: CatalogRepository = {
    async listNeighborhoods() {
      return seed.neighborhoods;
    },
    async listCooks() {
      return seed.cooks;
    },
    async getCook(id) {
      return seed.cooks.find((c) => c.id === id) ?? null;
    },
    async listMeals(filter) {
      return meals().filter((m) => !filter?.cookId || m.cookId === filter.cookId);
    },
    async getMeal(id) {
      return meals().find((m) => m.id === id) ?? null;
    },
    async listOfferings(query) {
      return queryOfferings(query);
    },
    async getOffering(id) {
      const offering = offerings().find((o) => o.id === id);
      return offering ? snapshot(offering) : null;
    },
  };

  const reservationRepository: ReservationRepository = {
    async create(input, now) {
      const parsed = newReservationInputSchema.safeParse(input);
      if (!parsed.success) return fail<CreateReservationError>("invalid_quantity");
      const { offeringId, quantity, slot, idempotencyKey } = parsed.data;

      // Idempotency: the same checkout attempt never creates a second reservation.
      const existing = store.getState().reservations.find((r) => r.idempotencyKey === idempotencyKey);
      if (existing) return ok(existing);

      const offering = offerings().find((o) => o.id === offeringId);
      const meal = offering && meals().find((m) => m.id === offering.mealId);
      const cook = offering && seed.cooks.find((c) => c.id === offering.cookId);
      const neighborhood = offering && seed.neighborhoods.find((n) => n.id === offering.neighborhoodId);
      const area = neighborhood?.pickupPoints.find((p) => p.id === offering?.pickupPointId)?.area;
      if (!offering || !meal || !cook || !neighborhood || !area) return fail<CreateReservationError>("offering_not_found");

      // Capacity is checked against the latest state immediately before writing. A database
      // implementation must do this check and the insert atomically (see README.md).
      const availability = computeAvailability(offering, reservedPortions(offering.id), now);
      const issue = checkQuantity(quantity, offering, availability);
      if (issue === "not_reservable") return fail<CreateReservationError>("not_reservable");
      if (issue === "above_remaining") return fail<CreateReservationError>("insufficient_capacity");
      if (issue) return fail<CreateReservationError>("invalid_quantity");
      if (!pickupSlots(offering.pickupWindow).includes(slot)) return fail<CreateReservationError>("invalid_slot");

      const createdAt = now.toISOString();
      const reservation: Reservation = {
        id: newLocalId("reservation"),
        idempotencyKey,
        offeringId: offering.id,
        mealId: meal.id,
        cookId: cook.id,
        quantity,
        unitPrice: offering.price,
        total: multiplyMoney(offering.price, quantity),
        pickup: {
          date: offering.pickupDate,
          window: offering.pickupWindow,
          slot,
          neighborhoodName: neighborhood.name,
          area,
        },
        mealTitle: meal.title,
        cookName: cook.displayName,
        status: "requested",
        history: [{ status: "requested", at: createdAt, actor: "customer" }],
        createdAt,
        cancellableUntil: reservationCutoff(offering).toISOString(),
        pickupStartsAt: pickupStart(offering).toISOString(),
        simulated: true,
      };
      store.update((state) => ({ ...state, reservations: [...state.reservations, reservation] }));
      return ok(reservation);
    },

    async listMine() {
      // Only reservations this visitor made; fictional sample reservations are not theirs.
      return store
        .getState()
        .reservations.filter((r) => isLocalId(r.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async get(id) {
      return store.getState().reservations.find((r) => r.id === id && isLocalId(r.id)) ?? null;
    },

    async transition(id, to, actor, now) {
      const current = store.getState().reservations.find((r) => r.id === id && isLocalId(r.id));
      if (!current) return fail("not_found" as const);
      const result = transitionReservation(current, to, actor, now);
      if (!result.ok) return result;
      store.update((state) => ({ ...state, reservations: upsertById(state.reservations, result.value) }));
      return result;
    },
  };

  const cookWorkspace: CookWorkspaceRepository = {
    async listMeals() {
      return meals().filter((m) => m.cookId === demoCookId);
    },

    async saveMeal(draft) {
      if (draft.id && !meals().some((m) => m.id === draft.id && m.cookId === demoCookId)) {
        return fail("not_found" as const);
      }
      const meal: Meal = {
        ...draft,
        id: draft.id ?? newLocalId("meal"),
        cookId: demoCookId,
        allergens: sortAllergens(draft.allergens),
        mayContain: sortAllergens(draft.mayContain.filter((a) => !draft.allergens.includes(a))),
        dietary: normalizeDietaryTags(draft.dietary),
      };
      store.update((state) => ({ ...state, meals: upsertById(state.meals, meal) }));
      return ok(meal);
    },

    async listOfferings(range) {
      return queryOfferings({ ...range, cookId: demoCookId, includeUnpublished: true });
    },

    async saveOffering(draft, now) {
      const cook = seed.cooks.find((c) => c.id === demoCookId);
      if (!cook) return fail<SaveOfferingError>("not_found");
      if (!meals().some((m) => m.id === draft.mealId && m.cookId === demoCookId)) {
        return fail<SaveOfferingError>("meal_not_found");
      }

      const existing = draft.id ? offerings().find((o) => o.id === draft.id && o.cookId === demoCookId) : undefined;
      if (draft.id && !existing) return fail<SaveOfferingError>("not_found");

      // New dates must be in the schedulable range; an existing offering may keep its date.
      const { min, max } = schedulableRange(todayInRome(now));
      const dateChanged = !existing || existing.pickupDate !== draft.pickupDate;
      if (dateChanged && (draft.pickupDate < min || draft.pickupDate > max)) {
        return fail<SaveOfferingError>("date_in_past");
      }

      const held = existing ? reservedPortions(existing.id) : 0;
      if (checkCapacityChange(draft.capacity, held)) return fail<SaveOfferingError>("capacity_below_reserved");

      const offering = offeringSchema.parse({
        ...draft,
        id: existing?.id ?? newLocalId("offering"),
        cookId: cook.id,
        neighborhoodId: cook.neighborhoodId,
        pickupPointId: cook.pickupPointId,
      });
      store.update((state) => ({ ...state, offerings: upsertById(state.offerings, offering) }));
      return ok(offering);
    },

    async setOfferingStatus(id, status) {
      const existing = offerings().find((o) => o.id === id && o.cookId === demoCookId);
      if (!existing) return fail("not_found" as const);
      const offering = { ...existing, status };
      store.update((state) => ({ ...state, offerings: upsertById(state.offerings, offering) }));
      return ok(offering);
    },

    async listReservations() {
      return reservations()
        .filter((r) => r.cookId === demoCookId)
        .sort((a, b) =>
          a.pickup.date === b.pickup.date
            ? a.pickup.slot.localeCompare(b.pickup.slot)
            : a.pickup.date.localeCompare(b.pickup.date),
        );
    },

    async transitionReservation(id, to, now) {
      const current = reservations().find((r) => r.id === id && r.cookId === demoCookId);
      if (!current) return fail("not_found" as const);
      const result = transitionReservation(current, to, "cook", now);
      if (!result.ok) return result;
      store.update((state) => ({ ...state, reservations: upsertById(state.reservations, result.value) }));
      return result;
    },
  };

  return { catalog, reservations: reservationRepository, cookWorkspace };
}
