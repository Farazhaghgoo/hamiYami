import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "@/features/waitlist/components/WaitlistForm";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { isWaitlistCollectionEnabled } from "@/server/waitlist";
import { buttonClass } from "@/shared/ui/button";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "../content.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/become-a-cook">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/become-a-cook", { title: t.becomeCook.title, description: t.becomeCook.heroLead });
}

const STEP_ICONS: IconName[] = ["pot", "calendar", "bag"];

export default async function BecomeCookPage({ params }: PageProps<"/[locale]/become-a-cook">) {
  const { t, href } = await getI18n(params);
  return (
    <main id="main" tabIndex={-1}>
      <section className={styles.splitHero} aria-labelledby="cook-hero-title">
        <div className={`container ${styles.splitHeroGrid}`}>
          <div className={styles.splitHeroCopy}>
            <p className={styles.eyebrow}>{t.becomeCook.title}</p>
            <h1 id="cook-hero-title">{t.becomeCook.heroTitle}</h1>
            <p className={styles.lead}>{t.becomeCook.heroLead}</p>
            <div className={styles.actions}>
              <a href="#cook-interest" className={buttonClass({ size: "lg" })}>
                {t.becomeCook.formTitle}
              </a>
              <Link href={href("/cook-workspace")} className={buttonClass({ variant: "secondary", size: "lg" })}>
                {t.becomeCook.tryCta}
              </Link>
            </div>
          </div>
          <div className={styles.splitHeroMedia}>
            {/* Cooking-process photo (licensed stock): it illustrates the cook's side, not a dish on sale. */}
            <Image
              src="/assets/images/hero-960.webp"
              alt={t.becomeCook.imageAlt}
              width={960}
              height={1200}
              sizes="(min-width: 900px) 380px, 100vw"
              priority
            />
          </div>
        </div>
      </section>

      <div className="container">
        <section className={styles.block} aria-labelledby="cook-how-title">
          <h2 id="cook-how-title">{t.becomeCook.howTitle}</h2>
          <ol className={styles.cards}>
            {t.becomeCook.howSteps.map((step, index) => (
              <li key={step.title} className={styles.card}>
                <span className={styles.cardIcon}>
                  <Icon name={STEP_ICONS[index] ?? "check"} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.twoCol}>
          <section className={styles.panel} aria-labelledby="try-title">
            <h2 id="try-title">{t.becomeCook.tryTitle}</h2>
            <p>{t.becomeCook.tryText}</p>
            <Link href={href("/cook-workspace")} className={buttonClass({ variant: "secondary" })}>
              {t.becomeCook.tryCta}
            </Link>
          </section>
          <section className={styles.panel} aria-labelledby="req-title">
            <h2 id="req-title">{t.becomeCook.requirementsTitle}</h2>
            <p>{t.becomeCook.requirementsText}</p>
            <Link href={href("/trust")}>{t.home.trustLink}</Link>
          </section>
        </div>

        <section id="cook-interest" className={`${styles.block} ${styles.narrow}`} aria-labelledby="cook-form-title">
          <h2 id="cook-form-title">{t.becomeCook.formTitle}</h2>
          <WaitlistForm collectionEnabled={isWaitlistCollectionEnabled()} initialAudience="cook" />
        </section>
      </div>
    </main>
  );
}
