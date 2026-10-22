import { z } from "zod";

/*
 * One checkout attempt = one idempotency key. The key is kept in sessionStorage (this tab only) so
 * that a double click, a page refresh or going Back and confirming again cannot create a second
 * reservation for the same choice. It holds no personal data.
 */
const PREFIX = "hamiyami.checkout.";

const attemptSchema = z.object({
  key: z.string().min(8).max(100),
  quantity: z.int(),
  slot: z.string(),
});

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function newKey(): string {
  return `attempt_${crypto.randomUUID()}`;
}

export function attemptKey(offeringId: string, quantity: number, slot: string): string {
  const storage = session();
  try {
    const parsed = attemptSchema.safeParse(JSON.parse(storage?.getItem(PREFIX + offeringId) ?? "null"));
    if (parsed.success && parsed.data.quantity === quantity && parsed.data.slot === slot) return parsed.data.key;
  } catch {
    // Unreadable data: start a fresh attempt.
  }
  const key = newKey();
  try {
    storage?.setItem(PREFIX + offeringId, JSON.stringify({ key, quantity, slot }));
  } catch {
    /* storage blocked: the in-memory guard still prevents double clicks */
  }
  return key;
}

export function forgetAttempt(offeringId: string): void {
  try {
    session()?.removeItem(PREFIX + offeringId);
  } catch {
    /* ignore */
  }
}
