import type { Locale } from "@/i18n/config";

/*
 * Approved consent wording. The server stores the wording and version from this registry, never
 * text sent by the browser. To change the wording: add a new version, point CURRENT at it, and keep
 * old versions here so submissions from pages loaded before the change can still be resolved.
 */
export const MARKETING_CONSENT_VERSIONS = {
  "marketing-2026-10-v2": {
    it: "Inviatemi anche notizie occasionali su HamiYami oltre al pilota. Facoltativo: potrai annullare l'iscrizione in qualsiasi momento.",
    en: "Also send me occasional HamiYami news beyond the pilot. Optional — you can unsubscribe at any time.",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type MarketingConsentVersion = keyof typeof MARKETING_CONSENT_VERSIONS;

export const CURRENT_MARKETING_CONSENT: MarketingConsentVersion = "marketing-2026-10-v2";

export function marketingConsentText(locale: Locale, version: MarketingConsentVersion = CURRENT_MARKETING_CONSENT): string {
  return MARKETING_CONSENT_VERSIONS[version][locale];
}

/** Returns the approved wording for a version the visitor was shown, or null if it is unknown. */
export function resolveMarketingConsent(version: string, locale: Locale): { version: MarketingConsentVersion; text: string } | null {
  if (!Object.hasOwn(MARKETING_CONSENT_VERSIONS, version)) return null;
  const known = version as MarketingConsentVersion;
  return { version: known, text: MARKETING_CONSENT_VERSIONS[known][locale] };
}
