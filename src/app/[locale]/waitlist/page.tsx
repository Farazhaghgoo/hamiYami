import type { Metadata } from "next";
import { WaitlistForm } from "@/features/waitlist/components/WaitlistForm";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { PageHeader } from "@/shared/layout/PageHeader";
import { isWaitlistCollectionEnabled } from "@/server/waitlist";
import styles from "../content.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/waitlist">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/waitlist", { title: t.waitlist.metaTitle, description: t.waitlist.lead });
}

export default async function WaitlistPage({ params, searchParams }: PageProps<"/[locale]/waitlist">) {
  const { t } = await getI18n(params);
  const { audience } = await searchParams;
  return (
    <main id="main" tabIndex={-1} className="container">
      <div className={styles.narrow}>
        <PageHeader title={t.waitlist.title} lead={t.waitlist.lead} />
        <WaitlistForm
          collectionEnabled={isWaitlistCollectionEnabled()}
          initialAudience={audience === "cook" ? "cook" : "customer"}
        />
      </div>
    </main>
  );
}
