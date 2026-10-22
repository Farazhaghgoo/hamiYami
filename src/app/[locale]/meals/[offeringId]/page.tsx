import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerCatalog } from "@/data/server/catalog";
import { isLocalId } from "@/domain/ids";
import { pickText } from "@/domain/localized";
import { menuWindow } from "@/domain/menu-window";
import { getOfferingDetail } from "@/features/meals/detail";
import { OfferingDetail } from "@/features/meals/components/OfferingDetail";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/meals/[offeringId]">): Promise<Metadata> {
  const { locale, t } = await getI18n(params);
  const { offeringId } = await params;
  const { anchor, catalog } = getServerCatalog();
  const detail = await getOfferingDetail(catalog, offeringId, menuWindow(anchor), new Date());
  return { title: detail ? pickText(detail.meal.title, locale) : t.detail.notFoundTitle };
}

export default async function OfferingPage({ params }: PageProps<"/[locale]/meals/[offeringId]">) {
  await getI18n(params);
  const { offeringId } = await params;
  const now = new Date();
  const { anchor, catalog } = getServerCatalog(now);
  const menu = menuWindow(anchor);
  const detail = await getOfferingDetail(catalog, offeringId, menu, now);

  // Offerings created in a visitor's browser are unknown to the server; the client resolves them.
  if (!detail && !isLocalId(offeringId)) notFound();

  return (
    <main id="main" tabIndex={-1} className="container">
      <OfferingDetail offeringId={offeringId} menu={menu} initial={detail} />
    </main>
  );
}
