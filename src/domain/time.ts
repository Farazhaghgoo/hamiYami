import { z } from "zod";

/**
 * Pickup scheduling is always expressed in the pilot's local time zone, whatever the visitor's
 * device is set to. Dates are civil dates ("2026-10-27") and times are wall-clock times ("18:30")
 * in Europe/Rome. Instants (Date) are only used for comparisons such as reservation cut-offs.
 */
export const PILOT_TIME_ZONE = "Europe/Rome";

export type CivilDate = string; // YYYY-MM-DD in Europe/Rome
export type LocalTime = string; // HH:mm, 24-hour, in Europe/Rome

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isCivilDate(value: string): boolean {
  const match = CIVIL_DATE.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const civilDateSchema = z.string().refine(isCivilDate, { error: "invalid_date" });
export const localTimeSchema = z.string().regex(LOCAL_TIME, { error: "invalid_time" });

/**
 * Pickup windows must sit inside daytime hours. This keeps every pickup time clear of the
 * 02:00–03:00 daylight-saving transitions, where local times can be missing or repeated.
 */
export const EARLIEST_PICKUP: LocalTime = "07:00";
export const LATEST_PICKUP: LocalTime = "23:00";

// Window rules only apply once both times are well-formed (Zod still runs refinements otherwise).
const bothTimesValid = (w: { start: string; end: string }) => LOCAL_TIME.test(w.start) && LOCAL_TIME.test(w.end);

export const pickupWindowSchema = z
  .object({ start: localTimeSchema, end: localTimeSchema })
  .refine((w) => !bothTimesValid(w) || (w.start >= EARLIEST_PICKUP && w.end <= LATEST_PICKUP), {
    error: "window_outside_hours",
    path: ["start"],
  })
  .refine((w) => !bothTimesValid(w) || minutesBetween(w.start, w.end) >= 15, {
    error: "window_too_short",
    path: ["end"],
  })
  .refine((w) => !bothTimesValid(w) || minutesBetween(w.start, w.end) <= 4 * 60, {
    error: "window_too_long",
    path: ["end"],
  });
export type PickupWindow = z.infer<typeof pickupWindowSchema>;

function toMinutes(time: LocalTime): number {
  const match = LOCAL_TIME.exec(time);
  if (!match) throw new RangeError(`Invalid local time: ${time}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesBetween(start: LocalTime, end: LocalTime): number {
  return toMinutes(end) - toMinutes(start);
}

function fromMinutes(total: number): LocalTime {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Customers choose a pickup time in steps of this many minutes. */
export const PICKUP_SLOT_MINUTES = 15;

/** Pickup slots a customer can choose within a window, e.g. every 15 minutes. */
export function pickupSlots(window: PickupWindow, stepMinutes = PICKUP_SLOT_MINUTES): LocalTime[] {
  const slots: LocalTime[] = [];
  for (let t = toMinutes(window.start); t < toMinutes(window.end); t += stepMinutes) {
    slots.push(fromMinutes(t));
  }
  return slots;
}

const romeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PILOT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function romeParts(instant: Date) {
  const parts = Object.fromEntries(
    romeFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** The civil date in Rome at the given instant. */
export function romeDateOf(instant: Date): CivilDate {
  const { year, month, day } = romeParts(instant);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The Rome wall-clock time (HH:mm) at the given instant. */
export function romeTimeOf(instant: Date): LocalTime {
  const { hour, minute } = romeParts(instant);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Rome's offset from UTC in minutes at an instant: 60 in winter, 120 in summer. */
export function romeOffsetMinutes(instant: Date): number {
  const p = romeParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Converts a Rome wall-clock date and time to an instant. */
export function romeDateTimeToInstant(date: CivilDate, time: LocalTime): Date {
  const match = CIVIL_DATE.exec(date);
  if (!match || !isCivilDate(date)) throw new RangeError(`Invalid civil date: ${date}`);
  const minutes = toMinutes(time);
  const wallAsUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Math.floor(minutes / 60),
    minutes % 60,
  );
  // Two passes settle the offset, including on the days the clocks change.
  let guess = wallAsUtc - romeOffsetMinutes(new Date(wallAsUtc)) * 60000;
  guess = wallAsUtc - romeOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess);
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const match = CIVIL_DATE.exec(date);
  if (!match) throw new RangeError(`Invalid civil date: ${date}`);
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, like Date#getDay. */
export function weekdayOf(date: CivilDate): number {
  const match = CIVIL_DATE.exec(date);
  if (!match) throw new RangeError(`Invalid civil date: ${date}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

/** Formats a civil date for display without shifting it through the device time zone. */
export function formatCivilDate(
  date: CivilDate,
  intlLocale: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
): string {
  const match = CIVIL_DATE.exec(date);
  if (!match) return date;
  const noonUtc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat(intlLocale, { ...options, timeZone: "UTC" }).format(noonUtc);
}

export function formatInstantInRome(instant: Date, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: PILOT_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}
