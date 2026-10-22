import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerCatalog } from "@/data/server/catalog";
import { isLocalId } from "@/domain/ids";
import { menuWindow } from "@/domain/menu-window";
import { getOfferingDetail } from "@/features/meals/detail";
import { ReserveFlow } from "@/features/reservations/components/ReserveFlow";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/meals/[offeringId]/reserve">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.reserve.steps.join(" · ") };
}

export default async function ReservePage({ params }: PageProps<"/[locale]/meals/[offeringId]/reserve">) {
  await getI18n(params);
  const { offeringId } = await params;
  const now = new Date();
  const { anchor, catalog } = getServerCatalog(now);
  const menu = menuWindow(anchor);
  const detail = await getOfferingDetail(catalog, offeringId, menu, now);
  if (!detail && !isLocalId(offeringId)) notFound();

  return (
    <main id="main" tabIndex={-1} className="container">
      <ReserveFlow offeringId={offeringId} menu={menu} initial={detail} />
    </main>
  );
}
