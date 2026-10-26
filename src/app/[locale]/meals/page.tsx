import type { Metadata } from "next";
import { getServerCatalog } from "@/data/server/catalog";
import { menuWindow } from "@/domain/menu-window";
import { DiscoveryView } from "@/features/meals/components/DiscoveryView";
import { discoverMeals, parseDiscoveryFilters } from "@/features/meals/discovery";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { PageHeader } from "@/shared/layout/PageHeader";
import { Notice } from "@/shared/ui/Notice";

export async function generateMetadata({ params }: PageProps<"/[locale]/meals">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/meals", { title: t.meals.title, description: t.meals.lead });
}

export default async function MealsPage({ params, searchParams }: PageProps<"/[locale]/meals">) {
  const { t } = await getI18n(params);
  const now = new Date();
  const { anchor, catalog } = getServerCatalog(now);
  const menu = menuWindow(anchor);
  const filters = parseDiscoveryFilters(await searchParams, menu);
  const result = await discoverMeals(catalog, menu, filters, now);

  return (
    <main id="main" tabIndex={-1} className="container">
      <PageHeader title={t.meals.title} lead={t.meals.lead}>
        <Notice tone="info" title={t.meals.noticeTitle}>
          {t.meals.notice}
        </Notice>
      </PageHeader>
      <DiscoveryView menu={menu} initialFilters={filters} initialResult={result} />
    </main>
  );
}
