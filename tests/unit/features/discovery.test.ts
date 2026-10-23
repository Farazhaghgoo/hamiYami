import { describe, expect, it } from "vitest";
import { DEMO_COOK_ID } from "@/data/demo";
import { createDemoRepositories } from "@/data/demo/demo-repositories";
import { createStaticDemoStore } from "@/data/demo/demo-store";
import { buildSeedCatalog } from "@/data/demo/seed";
import { menuWindow } from "@/domain/menu-window";
import { discoverMeals, EMPTY_FILTERS, groupByDay, reservationDeadline } from "@/features/meals/discovery";

// Sunday 25 Oct 2026; the menu covers Monday 26 Oct to Sunday 1 Nov.
const anchor = "2026-10-25";
const now = new Date("2026-10-25T09:00:00Z");
const { catalog } = createDemoRepositories({
  seed: buildSeedCatalog(anchor),
  store: createStaticDemoStore(),
  demoCookId: DEMO_COOK_ID,
});

describe("meals grouped by pickup day", () => {
  it("keeps days in order, dishes by pickup time, and skips days without dishes", async () => {
    const { cards } = await discoverMeals(catalog, menuWindow(anchor), EMPTY_FILTERS, now);
    const groups = groupByDay([...cards].reverse());
    expect(groups.map((g) => g.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(groups.flatMap((g) => g.cards)).toHaveLength(cards.length);
    for (const group of groups) {
      const starts = group.cards.map((c) => c.pickupWindow.start);
      expect(starts).toEqual([...starts].sort());
      expect(group.cards.every((c) => c.pickupDate === group.date)).toBe(true);
    }
  });

  it("returns no groups for no cards", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("reservation deadline on cards", () => {
  it("is shown as a Rome time on the pickup day when the cut-off falls that day", async () => {
    const { cards } = await discoverMeals(catalog, menuWindow(anchor), EMPTY_FILTERS, now);
    const lasagna = cards.find((c) => c.offeringId === "off-lasagna-thu-2026-10-29")!;
    // Pickup 18:30, reservations close six hours earlier (CET after the clock change).
    expect(reservationDeadline(lasagna)).toEqual({ date: "2026-10-29", time: "12:30", sameDayAsPickup: true });
  });

  it("names the day when the cut-off falls before the pickup day", () => {
    const card = {
      pickupDate: "2026-10-29",
      availability: {
        state: "available" as const,
        remaining: 4,
        maxQuantity: 4,
        reservable: true,
        // 24 hours before an 18:30 pickup.
        cutoff: "2026-10-28T17:30:00.000Z",
      },
    };
    expect(reservationDeadline(card)).toEqual({ date: "2026-10-28", time: "18:30", sameDayAsPickup: false });
  });
});
