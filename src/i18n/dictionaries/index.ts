import type { Locale } from "../config";
import { en } from "./en";
import { it } from "./it";

/** The Italian dictionary defines the shape; every language must provide the same keys. */
export type Dictionary = typeof it;

const dictionaries: Record<Locale, Dictionary> = { it, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
