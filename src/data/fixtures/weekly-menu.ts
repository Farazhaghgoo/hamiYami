/*
 * The fictional weekly menu. Offerings are generated for the seven days after "today" in Rome,
 * so the demo never fills up with expired dates. Each schedule repeats on one weekday.
 *
 * seedReservations are invented reservations by fictional customers. They only exist to show
 * partial, low and sold-out availability; they are not real demand.
 */
import { eur, type Money } from "@/domain/money";
import type { ReservationStatus } from "@/domain/reservation";
import type { PickupWindow } from "@/domain/time";

export interface WeeklySchedule {
  key: string;
  mealId: string;
  /** 1 = Monday … 5 = Friday. The pilot focuses on weekday dinners. */
  weekday: number;
  pickupWindow: PickupWindow;
  price: Money;
  capacity: number;
  maxPerReservation: number;
  seedReservations: { quantity: number; status: ReservationStatus }[];
}

const CONFIRMED = "confirmed" as const;
const REQUESTED = "requested" as const;

export const weeklyMenu: WeeklySchedule[] = [
  {
    key: "minestrone-mon",
    mealId: "meal-minestrone",
    weekday: 1,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(650),
    capacity: 12,
    maxPerReservation: 4,
    seedReservations: [
      { quantity: 2, status: CONFIRMED },
      { quantity: 1, status: REQUESTED },
    ],
  },
  {
    key: "curry-mon",
    mealId: "meal-curry",
    weekday: 1,
    pickupWindow: { start: "19:00", end: "20:00" },
    price: eur(800),
    capacity: 10,
    maxPerReservation: 4,
    seedReservations: [{ quantity: 2, status: CONFIRMED }, { quantity: 2, status: CONFIRMED }],
  },
  {
    key: "lasagna-tue",
    mealId: "meal-lasagna",
    weekday: 2,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(900),
    capacity: 8,
    maxPerReservation: 4,
    // Fully reserved, to show the sold-out state.
    seedReservations: [
      { quantity: 3, status: CONFIRMED },
      { quantity: 2, status: CONFIRMED },
      { quantity: 2, status: REQUESTED },
      { quantity: 1, status: CONFIRMED },
    ],
  },
  {
    key: "lenticchie-tue",
    mealId: "meal-lenticchie",
    weekday: 2,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(700),
    capacity: 12,
    maxPerReservation: 4,
    seedReservations: [{ quantity: 2, status: REQUESTED }],
  },
  {
    key: "curry-wed",
    mealId: "meal-curry",
    weekday: 3,
    pickupWindow: { start: "19:00", end: "20:00" },
    price: eur(800),
    capacity: 10,
    maxPerReservation: 4,
    seedReservations: [{ quantity: 3, status: CONFIRMED }],
  },
  {
    key: "peperoni-wed",
    mealId: "meal-peperoni",
    weekday: 3,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(850),
    capacity: 8,
    maxPerReservation: 3,
    // Two portions left, to show the low-availability state.
    seedReservations: [
      { quantity: 3, status: CONFIRMED },
      { quantity: 2, status: CONFIRMED },
      { quantity: 1, status: REQUESTED },
    ],
  },
  {
    key: "lasagna-thu",
    mealId: "meal-lasagna",
    weekday: 4,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(900),
    capacity: 10,
    maxPerReservation: 4,
    seedReservations: [
      { quantity: 2, status: CONFIRMED },
      { quantity: 2, status: REQUESTED },
    ],
  },
  {
    key: "polpette-thu",
    mealId: "meal-polpette",
    weekday: 4,
    pickupWindow: { start: "19:00", end: "20:00" },
    price: eur(850),
    capacity: 10,
    maxPerReservation: 4,
    seedReservations: [{ quantity: 2, status: REQUESTED }],
  },
  {
    key: "peperoni-fri",
    mealId: "meal-peperoni",
    weekday: 5,
    pickupWindow: { start: "18:00", end: "19:00" },
    price: eur(850),
    capacity: 8,
    maxPerReservation: 3,
    seedReservations: [{ quantity: 1, status: CONFIRMED }],
  },
  {
    key: "polpette-fri",
    mealId: "meal-polpette",
    weekday: 5,
    pickupWindow: { start: "18:30", end: "19:30" },
    price: eur(850),
    capacity: 10,
    maxPerReservation: 4,
    seedReservations: [
      { quantity: 3, status: CONFIRMED },
      { quantity: 2, status: CONFIRMED },
      { quantity: 2, status: REQUESTED },
    ],
  },
];

/** Reservations close this long before pickup starts. */
export const DEFAULT_CUTOFF_MINUTES = 6 * 60;
