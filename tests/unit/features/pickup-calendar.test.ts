import { describe, expect, it } from "vitest";
import { eur } from "@/domain/money";
import { PICKUP_CODE_PATTERN, pickupCodeFor } from "@/domain/pickup-code";
import type { Reservation } from "@/domain/reservation";
import {
  calendarDataUrl,
  calendarFileName,
  escapeText,
  foldLine,
  reservationCalendarFile,
} from "@/features/reservations/calendar";

const reservation: Reservation = {
  id: "local_reservation_0f6c2a9e8f1d4f0b9b7c4d2e1a3b5c7d",
  idempotencyKey: "attempt_1234567890",
  offeringId: "off-lasagna-thu-2026-10-29",
  mealId: "meal-lasagna",
  cookId: "cook-marta",
  quantity: 2,
  unitPrice: eur(900),
  total: eur(1800),
  pickup: {
    date: "2026-10-29",
    window: { start: "18:30", end: "19:30" },
    slot: "18:45",
    neighborhoodName: "Borgo Lavanda",
    area: { it: "Zona Piazza dei Tigli", en: "Piazza dei Tigli area" },
  },
  mealTitle: { it: "Lasagna al ragù", en: "Lasagna with ragù" },
  cookName: "Marta",
  status: "requested",
  history: [{ status: "requested", at: "2026-10-23T08:15:00.000Z", actor: "customer" }],
  createdAt: "2026-10-23T08:15:00.000Z",
  cancellableUntil: "2026-10-29T11:30:00.000Z",
  pickupStartsAt: "2026-10-29T17:30:00.000Z",
  simulated: true,
};

const text = {
  summary: "Ritiro HamiYami (demo): Lasagna al ragù",
  description: "Prenotazione dimostrativa; non è un ordine reale, e nessun cuoco l'ha ricevuta. Codice di ritiro: ABCD.",
  location: "Zona Piazza dei Tigli, Borgo Lavanda (quartiere fittizio)",
  alarm: "Ritiro tra un'ora (demo)",
};

/** Undoes line folding, as calendar apps do when reading the file. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("pickup codes", () => {
  it("are four easy-to-read characters, stable for a reservation", () => {
    const code = pickupCodeFor(reservation.id);
    expect(code).toMatch(PICKUP_CODE_PATTERN);
    expect(code).toMatch(/^[^AEIOU01L]{4}$/);
    expect(pickupCodeFor(reservation.id)).toBe(code);
  });

  it("differ between reservations", () => {
    const codes = new Set(Array.from({ length: 50 }, (_, i) => pickupCodeFor(`local_reservation_${i}`)));
    expect(codes.size).toBe(50);
  });
});

describe("calendar export", () => {
  const ics = reservationCalendarFile(reservation, text);

  it("is a valid calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("puts the chosen slot at the right instant, in UTC, across the clock change", () => {
    // 29 Oct 2026 is CET (UTC+1): 18:45 in Rome is 17:45 UTC; the entry lasts one 15-minute slot.
    expect(ics).toContain("DTSTART:20261029T174500Z\r\n");
    expect(ics).toContain("DTEND:20261029T180000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261023T081500Z\r\n");
  });

  it("never runs past the end of the pickup window", () => {
    const late = reservationCalendarFile({ ...reservation, pickup: { ...reservation.pickup, slot: "19:25" } }, text);
    expect(late).toContain("DTEND:20261029T183000Z");
  });

  it("escapes text and keeps the reservation's status tentative until the cook confirms", () => {
    const unfolded = unfold(ics);
    expect(unfolded).toContain("DESCRIPTION:Prenotazione dimostrativa\\; non è un ordine reale\\, e nessun cuoco");
    expect(unfolded).toContain("LOCATION:Zona Piazza dei Tigli\\, Borgo Lavanda (quartiere fittizio)");
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(reservationCalendarFile({ ...reservation, status: "confirmed" }, text)).toContain("STATUS:CONFIRMED");
    expect(escapeText("a\\b\nc")).toBe("a\\\\b\\nc");
  });

  it("folds long lines at 75 octets without breaking multi-byte characters", () => {
    const encoder = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    const long = `SUMMARY:${"è".repeat(60)}`;
    expect(unfold(foldLine(long))).toBe(long);
  });

  it("downloads as a named .ics file without any request", () => {
    expect(calendarFileName(reservation)).toBe("hamiyami-pickup-2026-10-29.ics");
    const url = calendarDataUrl(ics);
    expect(url.startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.split(",").slice(1).join(","))).toBe(ics);
  });
});
