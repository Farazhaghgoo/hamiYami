import { z } from "zod";

/**
 * Identifiers are opaque, stable strings. Catalog records use readable slugs (e.g. "cook-marta");
 * records created in a visitor's browser use the LOCAL_ID_PREFIX so they can never collide with
 * catalog identifiers and are never looked up on the server.
 */
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,79}$/, { error: "invalid_id" });

export const LOCAL_ID_PREFIX = "local_";

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function newLocalId(kind: "meal" | "offering" | "reservation"): string {
  return `${LOCAL_ID_PREFIX}${kind}_${crypto.randomUUID().replaceAll("-", "")}`;
}
