import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { PageHeader } from "@/shared/layout/PageHeader";
import { buttonClass } from "@/shared/ui/button";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import styles from "../content.module.css";

/*
 * Food safety and provider accountability: a PLANNED approach. Everything here must stay
 * future-facing. Wording rules (carried over from the original landing page):
 * - Keep "we plan to", "proposed", "will". Never describe checks, records or recalls as happening.
 * - Never use: "100% safe", "guaranteed hygiene", "government-approved kitchens", "certified by
 *   HamiYami", "every meal inspected", "AI-verified food safety".
 * - Don't claim photos prove safety, or that provider agreements remove HamiYami's responsibility.
 * - Don't add partners, insurance, approvals, scores, pilot results or testimonials until real.
 * - Keep the closing disclaimer.
 */

export async function generateMetadata({ params }: PageProps<"/[locale]/trust">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/trust", { title: t.trust.title, description: t.trust.metaDescription });
}

const CARD_ICONS: IconName[] = ["docSearch", "thermometer", "tag", "bell"];

export default async function TrustPage({ params }: PageProps<"/[locale]/trust">) {
  const { t, href } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1} className="container">
      <PageHeader eyebrow={t.trust.eyebrow} title={t.trust.heroTitle} lead={t.trust.heroLead}>
        <Notice tone="demo">{t.trust.demoNote}</Notice>
      </PageHeader>

      <ol className={styles.cards}>
        {t.trust.cards.map((card, index) => (
          <li key={card.title} className={styles.card}>
            <span className={`${styles.cardIcon} ${styles.cardIconGreen}`}>
              <Icon name={CARD_ICONS[index] ?? "check"} />
            </span>
            <h2 className={styles.cardTitle}>{card.title}</h2>
            <p>{card.text}</p>
            {card.note ? <p className={styles.cardNote}>{card.note}</p> : null}
          </li>
        ))}
      </ol>

      <section className={styles.block} aria-labelledby="practice-title">
        <h2 id="practice-title">{t.trust.practiceTitle}</h2>
        <div className={styles.faq}>
          {t.trust.faq.map((item) => (
            <details key={item.q} className={styles.faqItem}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <figure className={styles.workflow}>
          <figcaption>{t.trust.workflowTitle}</figcaption>
          <ol>
            {t.trust.workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </figure>
      </section>

      <section className={`${styles.panel} ${styles.closing}`} aria-labelledby="closing-title">
        <h2 id="closing-title">{t.trust.closingTitle}</h2>
        <p>{t.trust.closingText}</p>
        <div className={styles.actions}>
          <Link href={href("/waitlist")} className={buttonClass()}>
            {t.home.statusCta}
          </Link>
          <Link href={href("/become-a-cook")} className={buttonClass({ variant: "secondary" })}>
            {t.nav.becomeCook}
          </Link>
        </div>
        <p className={styles.disclaimer}>{t.trust.disclaimer}</p>
      </section>
    </main>
  );
}
