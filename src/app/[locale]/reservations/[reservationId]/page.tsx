import type { Metadata } from "next";
import { ReservationDetail } from "@/features/reservations/components/ReservationDetail";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/reservations/[reservationId]">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { reservationId } = await params;
  const { t } = i18n;
  return pageMetadata(i18n, `/reservations/${reservationId}`, { title: t.reservations.title, description: t.reservations.lead, index: false });
}

export default async function ReservationPage({ params, searchParams }: PageProps<"/[locale]/reservations/[reservationId]">) {
  await getI18n(params);
  const { reservationId } = await params;
  const { new: isNew } = await searchParams;
  return (
    <main id="main" tabIndex={-1} className="container">
      <ReservationDetail reservationId={reservationId} isNew={isNew === "1"} />
    </main>
  );
}
