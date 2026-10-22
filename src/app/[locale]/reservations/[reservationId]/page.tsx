import type { Metadata } from "next";
import { ReservationDetail } from "@/features/reservations/components/ReservationDetail";
import { getI18n } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/reservations/[reservationId]">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.reservations.title };
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
