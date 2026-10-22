import "server-only";
import type { CatalogRepository } from "@/data/contracts";
import { createDemoRepositories } from "@/data/demo/demo-repositories";
import { createStaticDemoStore } from "@/data/demo/demo-store";
import { buildSeedCatalog } from "@/data/demo/seed";
import { DEMO_COOK_ID } from "@/data/fixtures/catalog";
import { todayInRome } from "@/domain/menu-window";
import type { CivilDate } from "@/domain/time";

/**
 * The catalog as the server sees it: public, read-only, identical for every visitor.
 * Server components render from this; the visitor's own demo changes are applied in the browser.
 *
 * Replace the body of this function with a database-backed CatalogRepository when one exists.
 */
export function getServerCatalog(now: Date = new Date()): { anchor: CivilDate; catalog: CatalogRepository } {
  const anchor = todayInRome(now);
  const { catalog } = createDemoRepositories({
    seed: buildSeedCatalog(anchor),
    store: createStaticDemoStore(),
    demoCookId: DEMO_COOK_ID,
  });
  return { anchor, catalog };
}
