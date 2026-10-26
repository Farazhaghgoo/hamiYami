import "server-only";
import { pickText } from "@/domain/localized";
import { getServerCatalog } from "@/data/server/catalog";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { format } from "@/i18n/format";

export interface PublicPage {
  /** In-app path without the locale prefix. */
  path: string;
  title: string;
  description: string;
}

/**
 * Every indexable page, in the order sitemap.xml and llms.txt list them. Pages left out here
 * (single meal dates, reservations, the cook workspace) are marked noindex on the page itself.
 */
export async function listPublicPages(locale: Locale): Promise<PublicPage[]> {
  const t = getDictionary(locale);
  const { catalog } = getServerCatalog();
  const cooks = await catalog.listCooks();
  return [
    { path: "/", title: `HamiYami — ${t.home.title}`, description: t.meta.siteDescription },
    { path: "/meals", title: t.meals.title, description: t.meals.lead },
    { path: "/story", title: t.story.title, description: t.story.description },
    { path: "/trust", title: t.trust.title, description: t.trust.metaDescription },
    { path: "/become-a-cook", title: t.becomeCook.title, description: t.becomeCook.heroLead },
    { path: "/waitlist", title: t.waitlist.metaTitle, description: t.waitlist.lead },
    { path: "/demo", title: t.aboutDemo.title, description: t.aboutDemo.lead },
    { path: "/privacy", title: t.privacy.title, description: t.privacy.description },
    ...cooks.map((cook) => ({
      path: `/cooks/${cook.id}`,
      title: format(t.cook.metaTitle, { name: cook.displayName }),
      description: pickText(cook.bio, locale),
    })),
  ];
}
