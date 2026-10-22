/**
 * Data-access contracts. Screens and application code depend on these interfaces only, never on
 * fixtures or on a particular storage technology.
 *
 * Today they are implemented by the demo layer (src/data/demo): fictional fixtures plus changes
 * kept in the visitor's own browser. A database-backed implementation must provide the same
 * operations, plus what the demo cannot: authentication, ownership checks, atomic inventory and
 * idempotency enforced by the database. See README.md → "Connecting a database".
 */
import type { CookProfile, Meal, Neighborhood } from "@/domain/catalog";
import type { Offering, OfferingStatus } from "@/domain/offering";
import type { Result } from "@/domain/result";
import type {
  NewReservationInput,
  Reservation,
  ReservationActor,
  ReservationStatus,
  TransitionError,
} from "@/domain/reservation";
import type { CivilDate } from "@/domain/time";

/** An offering together with the portions currently held against its capacity. */
export interface OfferingSnapshot {
  offering: Offering;
  reservedPortions: number;
}

export interface OfferingQuery {
  from: CivilDate;
  to: CivilDate;
  neighborhoodId?: string;
  cookId?: string;
  /** Public browsing sees published offerings only. Cook tools may include unpublished ones. */
  includeUnpublished?: boolean;
}

/** Public, read-only catalog: what anyone may browse without signing in. */
export interface CatalogRepository {
  listNeighborhoods(): Promise<Neighborhood[]>;
  listCooks(): Promise<CookProfile[]>;
  getCook(id: string): Promise<CookProfile | null>;
  listMeals(filter?: { cookId?: string }): Promise<Meal[]>;
  getMeal(id: string): Promise<Meal | null>;
  listOfferings(query: OfferingQuery): Promise<OfferingSnapshot[]>;
  getOffering(id: string): Promise<OfferingSnapshot | null>;
}

export type CreateReservationError =
  | "offering_not_found"
  | "not_reservable"
  | "invalid_quantity"
  | "insufficient_capacity"
  | "invalid_slot";

/**
 * Reservations of the current customer. A real implementation identifies the customer from the
 * authenticated session on the server, never from a client-supplied id.
 */
export interface ReservationRepository {
  /**
   * Must be atomic: check capacity and insert in one step, and return the existing reservation
   * when the same idempotency key is submitted again.
   */
  create(input: NewReservationInput, now: Date): Promise<Result<Reservation, CreateReservationError>>;
  listMine(): Promise<Reservation[]>;
  get(id: string): Promise<Reservation | null>;
  transition(
    id: string,
    to: ReservationStatus,
    actor: ReservationActor,
    now: Date,
  ): Promise<Result<Reservation, TransitionError | "not_found">>;
}

export type MealDraft = Omit<Meal, "id" | "cookId"> & { id?: string };

export type OfferingDraft = Omit<Offering, "id" | "cookId" | "neighborhoodId" | "pickupPointId"> & {
  id?: string;
};

export type SaveOfferingError = "meal_not_found" | "not_found" | "capacity_below_reserved" | "date_in_past";

/**
 * Tools for the signed-in cook. A real implementation takes the cook's identity from the
 * authenticated session and must check ownership of every meal, offering and reservation.
 */
export interface CookWorkspaceRepository {
  listMeals(): Promise<Meal[]>;
  saveMeal(draft: MealDraft): Promise<Result<Meal, "not_found">>;
  listOfferings(query: { from: CivilDate; to: CivilDate }): Promise<OfferingSnapshot[]>;
  saveOffering(draft: OfferingDraft, now: Date): Promise<Result<Offering, SaveOfferingError>>;
  setOfferingStatus(id: string, status: OfferingStatus): Promise<Result<Offering, "not_found">>;
  listReservations(): Promise<Reservation[]>;
  transitionReservation(
    id: string,
    to: ReservationStatus,
    now: Date,
  ): Promise<Result<Reservation, TransitionError | "not_found">>;
}

export interface MarketplaceRepositories {
  catalog: CatalogRepository;
  reservations: ReservationRepository;
  cookWorkspace: CookWorkspaceRepository;
}
