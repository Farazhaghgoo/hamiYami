import { describe, expect, it } from "vitest";
import {
  collectIssues,
  EMPTY_MEAL_FORM,
  mealFormSchema,
  offeringFormSchema,
  offeringFormToDraft,
  type OfferingFormValues,
} from "@/features/cook-workspace/forms";

const today = "2026-10-22";

const validOffering: OfferingFormValues = {
  mealId: "meal-lasagna",
  pickupDate: "2026-10-30",
  start: "18:30",
  end: "19:30",
  price: "8,50",
  capacity: "10",
  maxPerReservation: "4",
  cutoffHours: "6",
  status: "published",
};

describe("meal form", () => {
  it("reports required and length problems per field", () => {
    const result = mealFormSchema.safeParse({ ...EMPTY_MEAL_FORM, title: "  ", description: "Short" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issues = collectIssues(result.error);
    expect(issues.title).toEqual({ code: "required", min: 1, max: undefined });
    expect(issues.description).toMatchObject({ code: "too_short", min: 10 });
    expect(issues.portion?.code).toBe("required");
  });

  it("accepts a complete meal and trims text", () => {
    const result = mealFormSchema.safeParse({
      ...EMPTY_MEAL_FORM,
      title: "  Torta salata ",
      description: "Sfoglia con verdure di stagione.",
      portion: "Una fetta",
      ingredients: "Farina, spinaci, ricotta",
      allergens: ["gluten", "milk"],
    });
    expect(result.success && result.data.title).toBe("Torta salata");
  });

  it("rejects unknown allergens", () => {
    expect(mealFormSchema.safeParse({ ...EMPTY_MEAL_FORM, allergens: ["chocolate"] }).success).toBe(false);
  });
});

describe("offering form", () => {
  const schema = offeringFormSchema(today);

  it("turns valid input into a draft with cents and minutes", () => {
    const result = schema.safeParse(validOffering);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(offeringFormToDraft(result.data, undefined)).toMatchObject({
      price: { amountCents: 850, currency: "EUR" },
      capacity: 10,
      maxPerReservation: 4,
      cutoffMinutesBefore: 360,
      pickupWindow: { start: "18:30", end: "19:30" },
    });
  });

  it.each([
    [{ pickupDate: "2026-10-22" }, "pickupDate", "date_out_of_range"],
    [{ pickupDate: "2026-12-30" }, "pickupDate", "date_out_of_range"],
    [{ pickupDate: "2026-02-30" }, "pickupDate", "invalid_date"],
    [{ start: "25:00" }, "start", "invalid_time"],
    [{ start: "05:00", end: "06:00" }, "start", "window_outside_hours"],
    [{ end: "18:35" }, "end", "window_too_short"],
    [{ price: "0,50" }, "price", "invalid_price"],
    [{ price: "8,505" }, "price", "invalid_price"],
    [{ capacity: "2.5" }, "capacity", "invalid_integer"],
    [{ capacity: "61" }, "capacity", "capacity_range"],
    [{ capacity: "3", maxPerReservation: "4" }, "maxPerReservation", "max_above_capacity"],
    [{ maxPerReservation: "9" }, "maxPerReservation", "max_per_reservation_range"],
    [{ cutoffHours: "5" }, "cutoffHours", "choose_option"],
  ] as const)("rejects %o on %s with %s", (patch, field, code) => {
    const result = schema.safeParse({ ...validOffering, ...patch });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(collectIssues(result.error)[field]?.code).toBe(code);
  });
});
