export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

/** Italian is the default interface language; English is the alternative. */
export const defaultLocale: Locale = "it";

export function isLocale(value: string | undefined | null): value is Locale {
  return (locales as readonly string[]).includes(value ?? "");
}

/** BCP 47 tags used for Intl formatting. */
export const intlLocale: Record<Locale, string> = {
  it: "it-IT",
  en: "en-GB",
};

/** Swaps the locale prefix of an in-app path, e.g. /it/meals → /en/meals. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = target;
    return parts.join("/") || `/${target}`;
  }
  return `/${target}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
