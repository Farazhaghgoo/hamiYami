import {
  DEMO_STORAGE_KEY,
  EMPTY_DEMO_STATE,
  isEmptyDemoState,
  parseStoredDemoState,
  type DemoState,
  type DemoStorageIssue,
} from "./demo-state";

/**
 * A tiny observable store for one visitor's demo state, shaped for React's useSyncExternalStore.
 * The browser implementation persists to localStorage; the static one backs server rendering,
 * where no visitor state exists and nothing may be written.
 */
export interface DemoStore {
  getState(): DemoState;
  getIssue(): DemoStorageIssue | null;
  subscribe(listener: () => void): () => void;
  update(change: (state: DemoState) => DemoState): void;
  reset(): void;
  dismissIssue(): void;
}

export function createStaticDemoStore(state: DemoState = EMPTY_DEMO_STATE): DemoStore {
  return {
    getState: () => state,
    getIssue: () => null,
    subscribe: () => () => {},
    update: () => {
      throw new Error("Demo state is read-only here: visitor changes are kept in the browser.");
    },
    reset: () => {},
    dismissIssue: () => {},
  };
}

function safeStorage(getStorage: () => Storage | null): Storage | null {
  try {
    return getStorage();
  } catch {
    // Access can throw when storage is blocked (privacy settings, sandboxed frames).
    return null;
  }
}

export function createBrowserDemoStore(getStorage: () => Storage | null = () => window.localStorage): DemoStore {
  const storage = safeStorage(getStorage);
  const listeners = new Set<() => void>();
  let state: DemoState = EMPTY_DEMO_STATE;
  let issue: DemoStorageIssue | null = storage ? null : "unavailable";

  function load() {
    if (!storage) return;
    let raw: string | null = null;
    try {
      raw = storage.getItem(DEMO_STORAGE_KEY);
    } catch {
      issue = "unavailable";
      return;
    }
    const parsed = parseStoredDemoState(raw);
    state = parsed.state;
    if (parsed.issue) {
      issue = parsed.issue;
      // Remove unreadable data so it cannot keep failing on every page.
      try {
        storage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  function persist() {
    if (!storage) return;
    try {
      if (isEmptyDemoState(state)) storage.removeItem(DEMO_STORAGE_KEY);
      else storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or blocked: keep working in memory for this page view.
      issue = "unavailable";
    }
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  load();

  if (typeof window !== "undefined") {
    // Keep several tabs of the same visitor in step.
    window.addEventListener("storage", (event) => {
      if (event.key !== DEMO_STORAGE_KEY && event.key !== null) return;
      load();
      emit();
    });
  }

  return {
    getState: () => state,
    getIssue: () => issue,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change) {
      state = change(state);
      persist();
      emit();
    },
    reset() {
      state = EMPTY_DEMO_STATE;
      issue = storage ? null : "unavailable";
      persist();
      emit();
    },
    dismissIssue() {
      if (issue === "unavailable") return;
      issue = null;
      emit();
    },
  };
}
