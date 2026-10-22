import "server-only";

/** What is stored for one signup. Built only from validated input and server-resolved consent. */
export interface WaitlistRecord {
  audience: "customer" | "cook";
  email: string;
  city: string;
  neighborhood: string | null;
  locale: "it" | "en";
  answers: Record<string, string | null>;
  marketing_consent: boolean;
  marketing_consent_text: string | null;
  marketing_consent_version: string | null;
  marketing_consent_at: string | null;
}

/**
 * Storage contract. `insertIfNew` must never modify an existing (email, audience) record: emails are
 * not verified, so a repeat submission could come from someone else. Updating details requires a
 * verified channel (e.g. a confirmation email link), which is future work.
 */
export interface WaitlistStore {
  insertIfNew(record: WaitlistRecord): Promise<void>;
}

export class StoreError extends Error {
  constructor(readonly status: number | "timeout" | "network") {
    super(`Waitlist storage failed (${status})`);
  }
}

export const STORE_TIMEOUT_MS = 5000;

/** Inserts through Supabase's REST API with a server-side secret key. Duplicates are ignored. */
export function supabaseWaitlistStore({
  url,
  secretKey,
  table = "waitlist_signups",
  fetchImpl = fetch,
}: {
  url: string;
  secretKey: string;
  table?: string;
  fetchImpl?: typeof fetch;
}): WaitlistStore {
  const endpoint = `${url}/rest/v1/${table}?on_conflict=email,audience`;
  const headers: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
    // ignore-duplicates: an existing (email, audience) row is left exactly as it was.
    Prefer: "resolution=ignore-duplicates,return=minimal",
  };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys must not.
  if (secretKey.startsWith("eyJ")) headers.Authorization = `Bearer ${secretKey}`;

  return {
    async insertIfNew(record) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
          cache: "no-store",
        });
      } catch (error) {
        throw new StoreError(error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network");
      }
      // The response body can echo submitted values, so only the status is kept.
      if (!response.ok) throw new StoreError(response.status);
    },
  };
}
