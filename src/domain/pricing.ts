/*
 * Cooks set their own prices: HamiYami does not control them. These helpers only describe the
 * local market (so cooks and customers can compare) and catch likely typos, such as 85 € typed
 * instead of 8,50 €. A cook can always confirm an unusual price and keep it.
 */

export interface PriceStats {
  count: number;
  minCents: number;
  maxCents: number;
  medianCents: number;
}

export function priceStats(prices: readonly number[]): PriceStats | null {
  if (!prices.length) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianCents = sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  return { count: sorted.length, minCents: sorted[0]!, maxCents: sorted[sorted.length - 1]!, medianCents };
}

/** A price more than this many times above (or below) the local median asks for confirmation. */
export const UNUSUAL_PRICE_FACTOR = 2;
/** With fewer local prices than this there is no meaningful "usual" price, so nothing is flagged. */
export const MIN_PRICES_FOR_CHECK = 3;

export function isUnusualPrice(amountCents: number, stats: PriceStats | null): boolean {
  if (!stats || stats.count < MIN_PRICES_FOR_CHECK) return false;
  return amountCents > stats.medianCents * UNUSUAL_PRICE_FACTOR || amountCents < stats.medianCents / UNUSUAL_PRICE_FACTOR;
}
