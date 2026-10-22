import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/shared/layout/PageHeader";
import { buttonClass } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/Notice";
import styles from "../content.module.css";

/*
 * PUBLICATION BLOCKER for real collection: this is a placeholder, not a privacy notice. Replace it
 * with a notice written for the actual operator, processors and retention practices before setting
 * PRIVACY_NOTICE_PUBLISHED=true. README.md → "Before a real pilot" lists what it must cover.
 */

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t.privacy.title };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { t, href } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1} className="container">
      <div className={styles.narrow}>
        <PageHeader title={t.privacy.title}>
          <Notice tone="warning" title={t.privacy.statusTitle}>
            {t.privacy.status}
          </Notice>
        </PageHeader>
        <p className={styles.lead}>{t.privacy.lead}</p>
        <section className={styles.block} aria-labelledby="today-title">
          <h2 id="today-title">{t.privacy.demoTitle}</h2>
          <ul className={styles.bullets}>
            {t.privacy.demo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <Link href={href("/")} className={buttonClass({ variant: "secondary" })}>
          {t.privacy.back}
        </Link>
      </div>
    </main>
  );
}
