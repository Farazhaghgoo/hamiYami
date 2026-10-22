import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRepositories } from "@/data/demo/demo-repositories";
import { createBrowserDemoStore, createStaticDemoStore } from "@/data/demo/demo-store";
import { buildSeedCatalog } from "@/data/demo/seed";
import { DEMO_COOK_ID } from "@/data/demo";
import { eur } from "@/domain/money";
import { computeAvailability } from "@/domain/offering";
import { MemoryStorage } from "../../support/memory-storage";

// Sunday 25 Oct 2026 in Rome; the menu covers Monday 26 Oct to Sunday 1 Nov.
const anchor = "2026-10-25";
const now = new Date("2026-10-25T09:00:00Z");
const seed = buildSeedCatalog(anchor);

function setup(storage = new MemoryStorage()) {
  const store = createBrowserDemoStore(() => storage);
  return { storage, store, ...createDemoRepositories({ seed, store, demoCookId: DEMO_COOK_ID }) };
}

const LASAGNA_THU = "off-lasagna-thu-2026-10-29";
const LASAGNA_TUE_SOLD_OUT = "off-lasagna-tue-2026-10-27";
const PEPERONI_WED_LOW = "off-peperoni-wed-2026-10-28";

describe("seed catalog", () => {
  it("generates the weekly menu for the seven days after the anchor", () => {
    expect(seed.offerings).toHaveLength(10);
    expect(seed.offerings.every((o) => o.pickupDate > anchor && o.pickupDate <= "2026-11-01")).toBe(true);
    expect(buildSeedCatalog(anchor).offerings.map((o) => o.id)).toEqual(seed.offerings.map((o) => o.id));
  });

  it("never expires: a later anchor still yields a full future week", () => {
    const later = buildSeedCatalog("2027-03-01");
    expect(later.offerings).toHaveLength(10);
    expect(later.offerings.every((o) => o.pickupDate > "2027-03-01")).toBe(true);
  });

  it("includes sold-out and low-availability examples", async () => {
    const { catalog } = createDemoRepositories({ seed, store: createStaticDemoStore(), demoCookId: DEMO_COOK_ID });
    const soldOut = await catalog.getOffering(LASAGNA_TUE_SOLD_OUT);
    const low = await catalog.getOffering(PEPERONI_WED_LOW);
    expect(computeAvailability(soldOut!.offering, soldOut!.reservedPortions, now).state).toBe("sold_out");
    expect(computeAvailability(low!.offering, low!.reservedPortions, now)).toMatchObject({ state: "low", remaining: 2 });
  });
});

describe("simulated reservations", () => {
  let repos: ReturnType<typeof setup>;
  beforeEach(() => {
    repos = setup();
  });

  it("creates a reservation that snapshots price and pickup details", async () => {
    const result = await repos.reservations.create(
      { offeringId: LASAGNA_THU, quantity: 2, slot: "18:45", idempotencyKey: "attempt-0001" },
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      quantity: 2,
      unitPrice: eur(900),
      total: eur(1800),
      status: "requested",
      simulated: true,
      pickup: { date: "2026-10-29", slot: "18:45" },
    });
    expect((await repos.catalog.getOffering(LASAGNA_THU))!.reservedPortions).toBe(6);
  });

  it("returns the same reservation when the same attempt is submitted twice", async () => {
    const input = { offeringId: LASAGNA_THU, quantity: 1, slot: "18:30", idempotencyKey: "attempt-dup-1" };
    const [first, second] = await Promise.all([
      repos.reservations.create(input, now),
      repos.reservations.create(input, now),
    ]);
    expect(first.ok && second.ok && first.value.id === second.value.id).toBe(true);
    expect(await repos.reservations.listMine()).toHaveLength(1);
  });

  it("refuses sold-out offerings, excess quantities and invalid slots", async () => {
    const key = (n: number) => `attempt-err-${n}`;
    expect(
      await repos.reservations.create({ offeringId: LASAGNA_TUE_SOLD_OUT, quantity: 1, slot: "18:30", idempotencyKey: key(1) }, now),
    ).toEqual({ ok: false, error: "not_reservable" });
    expect(
      await repos.reservations.create({ offeringId: PEPERONI_WED_LOW, quantity: 3, slot: "18:30", idempotencyKey: key(2) }, now),
    ).toEqual({ ok: false, error: "insufficient_capacity" });
    expect(
      await repos.reservations.create({ offeringId: LASAGNA_THU, quantity: 1, slot: "21:00", idempotencyKey: key(3) }, now),
    ).toEqual({ ok: false, error: "invalid_slot" });
    expect(
      await repos.reservations.create({ offeringId: "off-missing", quantity: 1, slot: "18:30", idempotencyKey: key(4) }, now),
    ).toEqual({ ok: false, error: "offering_not_found" });
    expect(await repos.reservations.listMine()).toHaveLength(0);
  });

  it("refuses reservations after the cut-off", async () => {
    // Pickup on 29 Oct starts 17:30Z; reservations close six hours earlier.
    const late = new Date("2026-10-29T11:30:00Z");
    expect(
      await repos.reservations.create({ offeringId: LASAGNA_THU, quantity: 1, slot: "18:30", idempotencyKey: "attempt-late" }, late),
    ).toEqual({ ok: false, error: "not_reservable" });
  });

  it("releases capacity when the customer cancels", async () => {
    const created = await repos.reservations.create(
      { offeringId: PEPERONI_WED_LOW, quantity: 2, slot: "18:30", idempotencyKey: "attempt-cancel" },
      now,
    );
    if (!created.ok) throw new Error(created.error);
    expect((await repos.catalog.getOffering(PEPERONI_WED_LOW))!.reservedPortions).toBe(8);

    const cancelled = await repos.reservations.transition(created.value.id, "cancelled_by_customer", "customer", now);
    expect(cancelled.ok && cancelled.value.status).toBe("cancelled_by_customer");
    expect((await repos.catalog.getOffering(PEPERONI_WED_LOW))!.reservedPortions).toBe(6);
  });

  it("keeps each visitor's demo separate and survives a reload", async () => {
    await repos.reservations.create({ offeringId: LASAGNA_THU, quantity: 1, slot: "18:30", idempotencyKey: "attempt-iso" }, now);

    const otherVisitor = setup(new MemoryStorage());
    expect(await otherVisitor.reservations.listMine()).toHaveLength(0);
    expect((await otherVisitor.catalog.getOffering(LASAGNA_THU))!.reservedPortions).toBe(4);

    const sameVisitorLater = setup(repos.storage);
    expect(await sameVisitorLater.reservations.listMine()).toHaveLength(1);
  });

  it("forgets everything on reset", async () => {
    await repos.reservations.create({ offeringId: LASAGNA_THU, quantity: 1, slot: "18:30", idempotencyKey: "attempt-reset" }, now);
    repos.store.reset();
    expect(await repos.reservations.listMine()).toHaveLength(0);
    expect(repos.storage.length).toBe(0);
  });
});

describe("cook workspace", () => {
  let repos: ReturnType<typeof setup>;
  beforeEach(() => {
    repos = setup();
  });

  const mealDraft = {
    title: { it: "Torta salata", en: "Torta salata" },
    description: { it: "Sfoglia con verdure.", en: "Sfoglia con verdure." },
    portion: { it: "Una fetta", en: "Una fetta" },
    ingredients: { it: "Farina, spinaci, ricotta", en: "Farina, spinaci, ricotta" },
    allergens: ["milk", "gluten"] as const,
    mayContain: ["gluten", "eggs"] as const,
    dietary: ["vegan"] as const,
    image: null,
  };

  it("creates meals for the demo cook with normalized allergens and dietary tags", async () => {
    const saved = await repos.cookWorkspace.saveMeal({ ...mealDraft, allergens: [...mealDraft.allergens], mayContain: [...mealDraft.mayContain], dietary: [...mealDraft.dietary] });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.value.cookId).toBe(DEMO_COOK_ID);
    expect(saved.value.allergens).toEqual(["gluten", "milk"]);
    // "May contain" never repeats a declared allergen.
    expect(saved.value.mayContain).toEqual(["eggs"]);
    expect(saved.value.dietary).toEqual(["vegetarian", "vegan"]);
  });

  it("publishes and unpublishes offerings in the visitor's public catalog", async () => {
    const draft = {
      mealId: "meal-polpette",
      pickupDate: "2026-11-03",
      pickupWindow: { start: "19:00", end: "20:00" },
      cutoffMinutesBefore: 360,
      price: eur(800),
      capacity: 6,
      maxPerReservation: 2,
      status: "unpublished" as const,
    };
    const saved = await repos.cookWorkspace.saveOffering(draft, now);
    if (!saved.ok) throw new Error(saved.error);
    const range = { from: "2026-10-26", to: "2026-11-20" };
    expect(await repos.catalog.listOfferings(range)).not.toContainEqual(expect.objectContaining({ offering: saved.value }));

    await repos.cookWorkspace.setOfferingStatus(saved.value.id, "published");
    const published = await repos.catalog.getOffering(saved.value.id);
    expect(published?.offering.status).toBe("published");
  });

  it("keeps reservation price snapshots when the cook edits the price", async () => {
    const created = await repos.reservations.create(
      { offeringId: LASAGNA_THU, quantity: 1, slot: "18:30", idempotencyKey: "attempt-price" },
      now,
    );
    if (!created.ok) throw new Error(created.error);
    const { offering } = (await repos.catalog.getOffering(LASAGNA_THU))!;
    const edited = await repos.cookWorkspace.saveOffering({ ...offering, price: eur(1000) }, now);
    expect(edited.ok).toBe(true);
    expect((await repos.reservations.get(created.value.id))!.unitPrice).toEqual(eur(900));
  });

  it("refuses capacity below the portions already held and dates outside the range", async () => {
    const { offering } = (await repos.catalog.getOffering(LASAGNA_THU))!;
    expect(await repos.cookWorkspace.saveOffering({ ...offering, capacity: 3 }, now)).toEqual({
      ok: false,
      error: "capacity_below_reserved",
    });
    expect(await repos.cookWorkspace.saveOffering({ ...offering, id: undefined, pickupDate: "2026-10-25" }, now)).toEqual({
      ok: false,
      error: "date_in_past",
    });
  });

  it("only lets the demo cook manage their own offerings", async () => {
    expect(await repos.cookWorkspace.setOfferingStatus("off-curry-wed-2026-10-28", "unpublished")).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("releases capacity when the cook declines a sample reservation", async () => {
    const held = (await repos.catalog.getOffering(LASAGNA_THU))!.reservedPortions;
    const sample = (await repos.cookWorkspace.listReservations()).find(
      (r) => r.offeringId === LASAGNA_THU && r.status === "requested",
    )!;
    const declined = await repos.cookWorkspace.transitionReservation(sample.id, "declined_by_cook", now);
    expect(declined.ok).toBe(true);
    expect((await repos.catalog.getOffering(LASAGNA_THU))!.reservedPortions).toBe(held - sample.quantity);
  });
});
