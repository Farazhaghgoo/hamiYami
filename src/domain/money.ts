import { z } from "zod";

/** The pilot trades in euros only. Add currencies here, never by passing free-form strings. */
export const currencySchema = z.enum(["EUR"]);
export type Currency = z.infer<typeof currencySchema>;

/** Money is always integer minor units (cents) plus an explicit currency. Never use floats. */
export const moneySchema = z.object({
  amountCents: z.int().nonnegative().max(100_000_00),
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

export function eur(amountCents: number): Money {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new RangeError(`Invalid amount in cents: ${amountCents}`);
  }
  return { amountCents, currency: "EUR" };
}

export function multiplyMoney(money: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Invalid quantity: ${quantity}`);
  }
  return { amountCents: money.amountCents * quantity, currency: money.currency };
}

export function formatMoney(money: Money, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: money.currency,
  }).format(money.amountCents / 100);
}

/**
 * Parses a price typed by a person ("8", "8.5", "8,50") into cents without floating-point maths.
 * Returns null for anything that is not a plain non-negative amount with at most two decimals.
 */
export function parseEuroInput(input: string): number | null {
  const match = /^\s*(\d{1,5})(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!match) return null;
  const euros = Number(match[1]);
  const cents = Number((match[2] ?? "0").padEnd(2, "0"));
  return euros * 100 + cents;
}

/** Formats cents for an editable input field, e.g. 850 → "8,50" (it) or "8.50" (en). */
export function centsToInput(amountCents: number, decimalSeparator: "," | "."): string {
  const euros = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, "0");
  return `${euros}${decimalSeparator}${cents}`;
}
