import { z } from "zod";
import { mealSchema } from "@/domain/catalog";
import { offeringSchema } from "@/domain/offering";
import { reservationSchema } from "@/domain/reservation";

/**
 * Everything one visitor changes in the demo. It lives only in that visitor's browser
 * (localStorage) and contains fictional demo records only: no names, contact details or payments.
 *
 * Records here override catalog records with the same id, or add new ones (ids prefixed "local_").
 */
export const DEMO_STATE_VERSION = 1;
export const DEMO_STORAGE_KEY = "hamiyami.demo";

export const demoStateSchema = z.object({
  version: z.literal(DEMO_STATE_VERSION),
  meals: z.array(mealSchema).max(50),
  offerings: z.array(offeringSchema).max(100),
  reservations: z.array(reservationSchema).max(200),
});
export type DemoState = z.infer<typeof demoStateSchema>;

export const EMPTY_DEMO_STATE: DemoState = Object.freeze({
  version: DEMO_STATE_VERSION,
  meals: [],
  offerings: [],
  reservations: [],
}) as DemoState;

export type DemoStorageIssue = "corrupted" | "unsupported_version" | "unavailable";

export interface ParsedDemoState {
  state: DemoState;
  issue: DemoStorageIssue | null;
}

/**
 * Safely reads stored demo data. Anything unreadable is discarded (and reported) rather than
 * trusted: stored data can be edited by hand, truncated, or written by an older version.
 */
export function parseStoredDemoState(raw: string | null): ParsedDemoState {
  if (raw === null || raw === "") return { state: EMPTY_DEMO_STATE, issue: null };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { state: EMPTY_DEMO_STATE, issue: "corrupted" };
  }

  if (json && typeof json === "object" && "version" in json && json.version !== DEMO_STATE_VERSION) {
    // Future versions can add migrations here. Until then, older data is reset visibly.
    return { state: EMPTY_DEMO_STATE, issue: "unsupported_version" };
  }

  const parsed = demoStateSchema.safeParse(json);
  if (!parsed.success) return { state: EMPTY_DEMO_STATE, issue: "corrupted" };
  return { state: parsed.data, issue: null };
}

export function isEmptyDemoState(state: DemoState): boolean {
  return state.meals.length === 0 && state.offerings.length === 0 && state.reservations.length === 0;
}

/** Replaces the record with the same id, or appends it. */
export function upsertById<T extends { id: string }>(items: readonly T[], item: T): T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index === -1) return [...items, item];
  const next = items.slice();
  next[index] = item;
  return next;
}
