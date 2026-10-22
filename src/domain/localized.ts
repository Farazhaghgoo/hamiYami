import { z } from "zod";
import type { Locale } from "@/i18n/config";

/** Catalog text authored in both interface languages. */
export const localizedTextSchema = z.object({
  it: z.string(),
  en: z.string(),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export function pickText(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.it;
}

/** Text a demo cook typed once; shown as written in either language. */
export function sameText(value: string): LocalizedText {
  return { it: value, en: value };
}
