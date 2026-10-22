"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { MarketplaceRepositories } from "@/data/contracts";
import { DEMO_COOK_ID } from "@/data/fixtures/catalog";
import type { CivilDate } from "@/domain/time";
import { createDemoRepositories } from "./demo-repositories";
import { EMPTY_DEMO_STATE, isEmptyDemoState, type DemoState, type DemoStorageIssue } from "./demo-state";
import { createBrowserDemoStore, createStaticDemoStore, type DemoStore } from "./demo-store";
import { buildSeedCatalog } from "./seed";

interface DemoContextValue {
  anchor: CivilDate;
  repositories: MarketplaceRepositories;
  /** Changes whenever the visitor's demo data changes; use it to refresh derived views. */
  state: DemoState;
  hasChanges: boolean;
  issue: DemoStorageIssue | null;
  /** False during server rendering and hydration, true once browser data has been read. */
  isClient: boolean;
  reset(): void;
  dismissIssue(): void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const noopSubscribe = () => () => {};

export function DemoProvider({ anchor, children }: { anchor: CivilDate; children: ReactNode }) {
  // One store per page load. Server rendering uses an empty, read-only store.
  const [store] = useState<DemoStore>(() =>
    typeof window === "undefined" ? createStaticDemoStore() : createBrowserDemoStore(),
  );
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const state = useSyncExternalStore(store.subscribe, store.getState, () => EMPTY_DEMO_STATE);
  const issue = useSyncExternalStore(store.subscribe, store.getIssue, () => null);

  const seed = useMemo(() => buildSeedCatalog(anchor), [anchor]);
  const repositories = useMemo(
    () => createDemoRepositories({ seed, store, demoCookId: DEMO_COOK_ID }),
    // `state` is listed so every change produces new repositories and consumers re-query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, store, state],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      anchor,
      repositories,
      state,
      hasChanges: !isEmptyDemoState(state),
      issue,
      isClient,
      reset: () => store.reset(),
      dismissIssue: () => store.dismissIssue(),
    }),
    [anchor, repositories, state, issue, isClient, store],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside <DemoProvider>");
  return context;
}

/**
 * Runs an async query against the visitor's demo repositories and re-runs it whenever their demo
 * data changes. `initial` is what the server rendered, so first paint matches the server HTML.
 */
export function useDemoQuery<T>(
  key: string,
  load: (repositories: MarketplaceRepositories, now: Date) => Promise<T>,
  initial: T,
): { data: T; ready: boolean } {
  const { repositories, isClient } = useDemo();
  const [result, setResult] = useState<{ data: T; key: string | null; source: MarketplaceRepositories | null }>(
    { data: initial, key: null, source: null },
  );

  const run = useEffectEvent(() => load(repositories, new Date()));

  useEffect(() => {
    if (!isClient) return;
    let active = true;
    run().then((data) => {
      if (active) setResult({ data, key, source: repositories });
    });
    return () => {
      active = false;
    };
  }, [isClient, key, repositories]);

  const ready = result.key === key && result.source === repositories;
  // Until the first browser query resolves, show the server-rendered data; afterwards keep showing
  // the latest result while a newer query is in flight, so the view never flashes back.
  return { data: result.key === null ? initial : result.data, ready };
}
