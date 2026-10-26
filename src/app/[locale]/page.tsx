import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerCatalog } from "@/data/server/catalog";
import { menuWindow } from "@/domain/menu-window";
import { featuredMeals } from "@/features/meals/discovery";
import { FeaturedMeals } from "@/features/meals/components/FeaturedMeals";
import { getI18n } from "@/i18n/server";
import { buttonClass } from "@/shared/ui/button";
import { Icon, type IconName } from "@/shared/ui/Icon";
import styles from "./home.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: { absolute: `HamiYami — ${t.home.title}` } };
}

const STEP_ICONS: IconName[] = ["search", "calendar", "bag"];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { t, format, href } = await getI18n(params);
  const now = new Date();
  const { anchor, catalog } = getServerCatalog(now);
  const menu = menuWindow(anchor);
  const [featured, neighborhoods] = await Promise.all([featuredMeals(catalog, menu, now), catalog.listNeighborhoods()]);
  const pilot = neighborhoods.find((n) => n.isPilot);

  return (
    <main id="main" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Icon name="sprout" />
              {t.home.eyebrow}
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              {t.home.heroTitle}
            </h1>
            <p className={styles.lead}>{t.home.heroLead}</p>
            <div className={styles.actions}>
              <Link href={href("/meals")} className={buttonClass({ size: "lg" })}>
                {t.home.explore}
              </Link>
              <Link href={href("/become-a-cook")} className={buttonClass({ variant: "secondary", size: "lg" })}>
                {t.home.becomeCook}
              </Link>
            </div>
          </div>

          <aside className={styles.status} aria-labelledby="status-title">
            <h2 id="status-title" className={styles.statusTitle}>
              {t.home.statusTitle}
            </h2>
            <p className={styles.statusText}>{t.home.statusText}</p>
            <ul className={styles.statusList}>
              {t.home.statusPoints.map((point) => (
                <li key={point}>
                  <Icon name="info" />
                  {point}
                </li>
              ))}
            </ul>
            <p className={styles.statusLinks}>
              <Link href={href("/demo")}>{t.footer.aboutDemo}</Link>
              <Link href={href("/waitlist")}>{t.home.statusCta}</Link>
            </p>
          </aside>
        </div>
      </section>

      <section className={`container ${styles.section} ${styles.preview}`} aria-labelledby="preview-title">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="preview-title">{format(t.home.previewTitle, { neighborhood: pilot?.name ?? "" })}</h2>
            <p>
              {t.home.previewLead} <span className={styles.fictional}>{t.home.heroNote}</span>
            </p>
          </div>
          <Link href={href("/meals")} className={buttonClass({ variant: "secondary" })}>
            {t.home.seeAll}
            <Icon name="arrowRight" />
          </Link>
        </div>
        <FeaturedMeals menu={menu} initial={featured} />
      </section>

      <section id="how-it-works" className={`band ${styles.section}`} aria-labelledby="how-title">
        <div className="container">
          <h2 id="how-title">{t.home.howTitle}</h2>
          <ol className={styles.steps}>
            {t.home.howSteps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepIcon}>
                  <Icon name={STEP_ICONS[index] ?? "check"} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className={styles.howNote}>{t.home.howNote}</p>
          <Link href={href("/story")} className={styles.panelLink}>
            {t.story.homeLink}
            <Icon name="arrowRight" />
          </Link>
        </div>
      </section>

      <div className={`container ${styles.section} ${styles.split}`}>
        <section className={styles.panel} aria-labelledby="trust-title">
          <span className={styles.panelIcon}>
            <Icon name="shield" />
          </span>
          <h2 id="trust-title">{t.home.trustTitle}</h2>
          <ul className={styles.checks}>
            {t.home.trustPoints.map((point) => (
              <li key={point}>
                <Icon name="check" />
                {point}
              </li>
            ))}
          </ul>
          <p className={styles.muted}>{t.home.trustNote}</p>
          <Link href={href("/trust")} className={styles.panelLink}>
            {t.home.trustLink}
            <Icon name="arrowRight" />
          </Link>
        </section>

        <section className={`${styles.panel} ${styles.cookPanel}`} aria-labelledby="cook-title">
          <div className={styles.cookMedia}>
            <Image
              src="/assets/images/cook-640.webp"
              alt={t.home.cookImageAlt}
              width={640}
              height={800}
              sizes="(min-width: 900px) 200px, 40vw"
            />
          </div>
          <div className={styles.cookCopy}>
            <h2 id="cook-title">{t.home.cookTitle}</h2>
            <p>{t.home.cookText}</p>
            <div className={styles.actions}>
              <Link href={href("/become-a-cook")} className={buttonClass()}>
                {t.home.cookPrimary}
              </Link>
              <Link href={href("/cook-workspace")} className={buttonClass({ variant: "quiet" })}>
                {t.home.cookSecondary}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
