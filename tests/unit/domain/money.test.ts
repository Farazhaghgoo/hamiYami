import { describe, expect, it } from "vitest";
import { centsToInput, eur, formatMoney, moneySchema, multiplyMoney, parseEuroInput } from "@/domain/money";

describe("money", () => {
  it("keeps amounts as integer cents with an explicit currency", () => {
    expect(eur(850)).toEqual({ amountCents: 850, currency: "EUR" });
    expect(() => eur(8.5)).toThrow(RangeError);
    expect(moneySchema.safeParse({ amountCents: 8.5, currency: "EUR" }).success).toBe(false);
    expect(moneySchema.safeParse({ amountCents: 850, currency: "USD" }).success).toBe(false);
  });

  it("multiplies without floating-point drift", () => {
    expect(multiplyMoney(eur(110), 3)).toEqual(eur(330));
  });

  it("formats per locale", () => {
    expect(formatMoney(eur(850), "it-IT")).toBe("8,50 €");
    expect(formatMoney(eur(850), "en-GB")).toBe("€8.50");
  });

  it("parses typed prices in either decimal style", () => {
    expect(parseEuroInput("8")).toBe(800);
    expect(parseEuroInput("8,5")).toBe(850);
    expect(parseEuroInput("8.50")).toBe(850);
    expect(parseEuroInput(" 12,05 ")).toBe(1205);
    expect(parseEuroInput("8,505")).toBeNull();
    expect(parseEuroInput("-3")).toBeNull();
    expect(parseEuroInput("abc")).toBeNull();
    expect(centsToInput(850, ",")).toBe("8,50");
  });
});
