import { describe, expect, it } from "vitest";
import {
  addDays,
  formatCivilDate,
  isCivilDate,
  pickupSlots,
  pickupWindowSchema,
  romeDateOf,
  romeDateTimeToInstant,
  weekdayOf,
} from "@/domain/time";

describe("Europe/Rome scheduling", () => {
  it("converts summer and winter wall-clock times to the right instants", () => {
    // CEST (UTC+2) in summer, CET (UTC+1) in winter.
    expect(romeDateTimeToInstant("2026-07-15", "18:30").toISOString()).toBe("2026-07-15T16:30:00.000Z");
    expect(romeDateTimeToInstant("2026-12-15", "18:30").toISOString()).toBe("2026-12-15T17:30:00.000Z");
  });

  it("handles the days the clocks change", () => {
    // Clocks go back at 03:00 on 25 Oct 2026 and forward at 02:00 on 29 Mar 2026.
    expect(romeDateTimeToInstant("2026-10-25", "18:30").toISOString()).toBe("2026-10-25T17:30:00.000Z");
    expect(romeDateTimeToInstant("2026-10-24", "18:30").toISOString()).toBe("2026-10-24T16:30:00.000Z");
    expect(romeDateTimeToInstant("2026-03-29", "12:00").toISOString()).toBe("2026-03-29T10:00:00.000Z");
  });

  it("reads the civil date in Rome, not in the device time zone", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Rome.
    expect(romeDateOf(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(romeDateOf(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
    expect(romeDateOf(new Date("2026-06-30T22:00:00Z"))).toBe("2026-07-01");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("validates civil dates and weekdays", () => {
    expect(isCivilDate("2026-02-30")).toBe(false);
    expect(isCivilDate("2026-2-3")).toBe(false);
    expect(isCivilDate("2026-10-22")).toBe(true);
    expect(weekdayOf("2026-10-22")).toBe(4); // Thursday
  });

  it("formats civil dates without shifting them", () => {
    expect(formatCivilDate("2026-10-27", "it-IT")).toBe("martedì 27 ottobre");
    expect(formatCivilDate("2026-10-27", "en-GB")).toBe("Tuesday 27 October");
  });

  it("keeps pickup windows inside daytime hours and a sensible length", () => {
    expect(pickupWindowSchema.safeParse({ start: "18:30", end: "19:30" }).success).toBe(true);
    expect(pickupWindowSchema.safeParse({ start: "02:00", end: "03:00" }).success).toBe(false);
    expect(pickupWindowSchema.safeParse({ start: "19:30", end: "19:30" }).success).toBe(false);
    expect(pickupWindowSchema.safeParse({ start: "12:00", end: "18:00" }).success).toBe(false);
  });

  it("splits a window into 15-minute pickup slots", () => {
    expect(pickupSlots({ start: "18:30", end: "19:30" })).toEqual(["18:30", "18:45", "19:00", "19:15"]);
  });
});
