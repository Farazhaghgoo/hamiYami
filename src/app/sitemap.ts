import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { languageAlternates, localeUrl } from "@/shared/seo/metadata";
import { listPublicPages } from "@/shared/seo/public-pages";

/** Every indexable page in every locale, each with its hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Paths are the same in every locale, so the default locale's list drives the order.
  const pages = await listPublicPages(locales[0]);
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: localeUrl(locale, page.path),
      alternates: { languages: languageAlternates(page.path) },
    })),
  );
}
