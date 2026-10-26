import type { Metadata } from "next";
import { defaultLocale, intlLocale, locales, type Locale } from "@/i18n/config";
import type { I18n } from "@/i18n/i18n";

/** The public address. SITE_URL (set in wrangler.jsonc) wins; the production domain is the fallback. */
export function siteUrl(): string {
  return (process.env.SITE_URL || "https://hamiyami.com").replace(/\/+$/, "");
}

/** Absolute URL of an in-app path (without locale prefix) in the given locale. */
export function localeUrl(locale: Locale, path: string): string {
  return `${siteUrl()}/${locale}${path === "/" ? "" : path}`;
}

/** hreflang alternates for a path: every locale plus x-default (the default locale). */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = localeUrl(locale, path);
  languages["x-default"] = localeUrl(defaultLocale, path);
  return languages;
}

export function openGraphBase(i18n: I18n): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: "HamiYami",
    locale: intlLocale[i18n.locale].replace("-", "_"),
    images: [{ url: "/assets/images/og-image.png", width: 1200, height: 630, alt: i18n.t.footer.tagline }],
  };
}

/**
 * Per-page metadata: title, description, canonical URL, hreflang alternates, robots and social
 * previews. `path` is the in-app path without the locale prefix, e.g. "/meals".
 *
 * Pages are indexable unless `index: false`: use that for pages whose content lives only in the
 * visitor's browser or expires within days (single meal dates, reservations, the cook workspace).
 */
export function pageMetadata(
  i18n: I18n,
  path: string,
  { title, description, index = true }: { title: Metadata["title"]; description: string; index?: boolean },
): Metadata {
  const url = localeUrl(i18n.locale, path);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    robots: { index, follow: true },
    openGraph: { ...openGraphBase(i18n), url, description },
  };
}
