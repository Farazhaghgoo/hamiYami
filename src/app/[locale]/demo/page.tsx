import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { PageHeader } from "@/shared/layout/PageHeader";
import { ResetDemoButton } from "@/shared/layout/ResetDemoButton";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import styles from "../content.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/demo">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/demo", { title: t.aboutDemo.title, description: t.aboutDemo.lead });
}

export default async function AboutDemoPage({ params }: PageProps<"/[locale]/demo">) {
  const { t, href } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1} className="container">
      <div className={styles.narrow}>
        <PageHeader title={t.aboutDemo.title} lead={t.aboutDemo.lead} />

        <section className={styles.panel} aria-labelledby="not-real-title">
          <h2 id="not-real-title">{t.aboutDemo.notRealTitle}</h2>
          <ul className={styles.list}>
            {t.aboutDemo.notReal.map((item) => (
              <li key={item}>
                <Icon name="close" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.block} aria-labelledby="storage-title">
          <h2 id="storage-title">{t.aboutDemo.storageTitle}</h2>
          <p>{t.aboutDemo.storageText}</p>
        </section>

        <section className={styles.block} aria-labelledby="dates-title">
          <h2 id="dates-title">{t.aboutDemo.datesTitle}</h2>
          <p>{t.aboutDemo.datesText}</p>
        </section>

        <section className={styles.block} aria-labelledby="reset-title">
          <h2 id="reset-title">{t.aboutDemo.resetTitle}</h2>
          <p>{t.aboutDemo.resetText}</p>
          <ResetDemoButton />
        </section>

        <section className={styles.block} aria-labelledby="follow-title">
          <h2 id="follow-title">{t.aboutDemo.waitlistTitle}</h2>
          <p>{t.aboutDemo.waitlistText}</p>
          <Link href={href("/waitlist")} className={buttonClass({ variant: "secondary" })}>
            {t.aboutDemo.waitlistCta}
          </Link>
        </section>
      </div>
    </main>
  );
}
