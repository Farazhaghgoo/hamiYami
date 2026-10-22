import { describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY, EMPTY_DEMO_STATE, parseStoredDemoState } from "@/data/demo/demo-state";
import { createBrowserDemoStore } from "@/data/demo/demo-store";
import { MemoryStorage } from "../../support/memory-storage";

describe("stored demo state", () => {
  it("treats missing data as an empty demo", () => {
    expect(parseStoredDemoState(null)).toEqual({ state: EMPTY_DEMO_STATE, issue: null });
  });

  it("discards malformed JSON and reports it", () => {
    expect(parseStoredDemoState("{not json")).toEqual({ state: EMPTY_DEMO_STATE, issue: "corrupted" });
  });

  it("discards data that does not match the schema", () => {
    const tampered = JSON.stringify({
      version: 1,
      meals: [],
      offerings: [],
      reservations: [{ id: "local_reservation_x", quantity: 999, total: { amountCents: -5, currency: "EUR" } }],
    });
    expect(parseStoredDemoState(tampered).issue).toBe("corrupted");
  });

  it("resets data written by an unknown version", () => {
    const future = JSON.stringify({ version: 2, everything: "different" });
    expect(parseStoredDemoState(future)).toEqual({ state: EMPTY_DEMO_STATE, issue: "unsupported_version" });
  });

  it("accepts valid data", () => {
    const valid = JSON.stringify(EMPTY_DEMO_STATE);
    expect(parseStoredDemoState(valid).issue).toBeNull();
  });

  it("removes unreadable data from storage and recovers on reset", () => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, "garbage");
    const store = createBrowserDemoStore(() => storage);
    expect(store.getIssue()).toBe("corrupted");
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
    store.reset();
    expect(store.getIssue()).toBeNull();
  });

  it("keeps working in memory when storage is blocked", () => {
    const store = createBrowserDemoStore(() => {
      throw new Error("SecurityError");
    });
    expect(store.getIssue()).toBe("unavailable");
    store.update((s) => ({ ...s, meals: [] }));
    expect(store.getState().meals).toEqual([]);
  });
});
