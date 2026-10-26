import type { Metadata } from "next";
import { ReservationsList } from "@/features/reservations/components/ReservationsList";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { PageHeader } from "@/shared/layout/PageHeader";
import styles from "../content.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/reservations">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/reservations", { title: t.reservations.title, description: t.reservations.lead, index: false });
}

/** Demo reservations exist only in the visitor's browser, so this page renders them client-side. */
export default async function ReservationsPage({ params }: PageProps<"/[locale]/reservations">) {
  const { t } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1} className="container">
      <PageHeader title={t.reservations.title} lead={t.reservations.lead} />
      <ReservationsList />
      <section className={styles.block} aria-labelledby="how-title">
        <h2 id="how-title">{t.reservations.howTitle}</h2>
        <ul className={styles.bullets}>
          {t.reservations.how.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
