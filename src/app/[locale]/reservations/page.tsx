import type { Metadata } from "next";
import { ReservationsList } from "@/features/reservations/components/ReservationsList";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/shared/layout/PageHeader";

export async function generateMetadata({ params }: PageProps<"/[locale]/reservations">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.reservations.title };
}

/** Demo reservations exist only in the visitor's browser, so this page renders them client-side. */
export default async function ReservationsPage({ params }: PageProps<"/[locale]/reservations">) {
  const { t } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1} className="container">
      <PageHeader title={t.reservations.title} lead={t.reservations.lead} />
      <ReservationsList />
    </main>
  );
}
