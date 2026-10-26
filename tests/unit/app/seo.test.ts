import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { locales } from "@/i18n/config";
import { listPublicPages } from "@/shared/seo/public-pages";

describe("SEO", () => {
  it("lists every public page once per locale, with hreflang alternates", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://hamiyami.com/it");
    expect(urls).toContain("https://hamiyami.com/en/cooks/cook-marta");
    // Pages that are noindex must never be in the sitemap.
    expect(urls.some((u) => /\/(meals\/off-|reservations|cook-workspace)/.test(u))).toBe(false);
    for (const entry of entries) expect(Object.keys(entry.alternates?.languages ?? {})).toEqual(["it", "en", "x-default"]);
  });

  it("gives every public page a unique title and a description of at most 160 characters", async () => {
    const titles = new Set<string>();
    for (const locale of locales) {
      for (const page of await listPublicPages(locale)) {
        expect(titles.has(page.title), page.title).toBe(false);
        titles.add(page.title);
        expect([...page.description].length, page.description).toBeLessThanOrEqual(160);
      }
    }
  });

  it("allows crawling everything but the API and points to the sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://hamiyami.com/sitemap.xml");
    for (const rule of [result.rules].flat()) expect(rule).toMatchObject({ allow: "/", disallow: "/api/" });
  });
});
