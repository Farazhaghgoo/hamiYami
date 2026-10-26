import { defaultLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localeUrl } from "@/shared/seo/metadata";
import { listPublicPages } from "@/shared/seo/public-pages";

/** llms.txt (https://llmstxt.org): a plain-text map of the indexable pages, built from the same list as sitemap.xml. */
export const dynamic = "force-static";

export async function GET() {
  const lines = ["# HamiYami", "", `> ${getDictionary(defaultLocale).meta.siteDescription}`];
  for (const locale of locales) {
    lines.push("", `## ${locale === "it" ? "Italiano" : "English"}`, "");
    for (const page of await listPublicPages(locale)) {
      lines.push(`- [${page.title}](${localeUrl(locale, page.path)}): ${page.description}`);
    }
  }
  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
