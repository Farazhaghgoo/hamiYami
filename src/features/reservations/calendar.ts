import type { Reservation } from "@/domain/reservation";
import { romeDateTimeToInstant } from "@/domain/time";

/*
 * Builds an iCalendar (RFC 5545) file for a reservation's pickup, entirely in the browser: nothing
 * is sent anywhere. Times are written in UTC, so no time-zone block is needed and calendar apps
 * show the pickup at the right local time.
 */

export interface CalendarText {
  summary: string;
  description: string;
  location: string;
  alarm: string;
}

/** How long the calendar entry lasts: one pickup slot, never past the end of the window. */
export const CALENDAR_SLOT_MINUTES = 15;

function utcStamp(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** Folds a content line at 75 octets without splitting a multi-byte character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
      // Continuation lines start with a space, which counts towards the 75 octets.
      limit = 74;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function reservationCalendarFile(reservation: Reservation, text: CalendarText): string {
  const { pickup } = reservation;
  const start = romeDateTimeToInstant(pickup.date, pickup.slot);
  const windowEnd = romeDateTimeToInstant(pickup.date, pickup.window.end);
  const end = new Date(Math.min(start.getTime() + CALENDAR_SLOT_MINUTES * 60_000, windowEnd.getTime()));
  // The latest status change dates this version of the entry, so re-downloads update it.
  const lastChange = reservation.history[reservation.history.length - 1]?.at ?? reservation.createdAt;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HamiYami//Demo//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reservation.id}@demo.hamiyami`,
    `DTSTAMP:${utcStamp(new Date(lastChange))}`,
    `SEQUENCE:${Math.max(0, reservation.history.length - 1)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(text.summary)}`,
    `DESCRIPTION:${escapeText(text.description)}`,
    `LOCATION:${escapeText(text.location)}`,
    `STATUS:${reservation.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(text.alarm)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function calendarFileName(reservation: Pick<Reservation, "pickup">): string {
  return `hamiyami-pickup-${reservation.pickup.date}.ics`;
}

/** A data: URL for a download link, so the file is created without any request. */
export function calendarDataUrl(ics: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
