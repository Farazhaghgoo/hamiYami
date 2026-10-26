import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerCatalog } from "@/data/server/catalog";
import { eur } from "@/domain/money";
import { menuWindow } from "@/domain/menu-window";
import { buildStoryData } from "@/features/story/data";
import { BowlsArt, ClockArt, KitchenArt, QuestionsArt, StoryPhoto } from "@/features/story/components/Illustrations";
import { Scrolly } from "@/features/story/components/Scrolly";
import { MenuWeek, PriceStrip, ReservedMeters, StatTiles, UnitPriceBars } from "@/features/story/components/StoryCharts";
import { DishesTable, EveningsTable, OfferingsTable } from "@/features/story/components/StoryTables";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import styles from "./story.module.css";

/*
 * The HamiYami story in three chapters: how it was, how it is now, how we solve it.
 * Wording rules: chapters 1 and 2 are narrative and carry no statistics; every number in chapter 3
 * is computed from the catalog and labelled as demo data. No launch dates, partners, results,
 * reviews or verified cooks.
 */

export async function generateMetadata({ params }: PageProps<"/[locale]/story">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return pageMetadata(i18n, "/story", { title: t.story.title, description: t.story.description });
}

const PAST_PHOTOS = [
  { src: "/assets/images/lasagna-800.webp", width: 800, height: 600 },
  { src: "/assets/images/cook-960.webp", width: 960, height: 1200 },
  { src: "/assets/images/hero-960.webp", width: 960, height: 1200 },
];

export default async function StoryPage({ params }: PageProps<"/[locale]/story">) {
  const { t, format, money, href } = await getI18n(params);
  const { anchor, catalog } = getServerCatalog(new Date());
  const menu = menuWindow(anchor);
  const data = await buildStoryData(catalog, menu);
  // The demo catalog always has a pilot menu; without one there is no story to tell.
  if (!data) notFound();

  const s = t.story;
  const price = (cents: number) => money(eur(cents));
  const unitPrices = data.dishes.map((d) => d.unitPriceCents);

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className={styles.progress} aria-hidden="true" />

      <section className={styles.hero} aria-labelledby="story-title">
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Icon name="sprout" />
              {s.heroEyebrow}
            </p>
            <h1 id="story-title" className={styles.heroTitle}>
              {s.heroTitle}
            </h1>
            <p className={styles.heroLead}>{s.heroLead}</p>
            <ol className={styles.chapters}>
              {[
                { id: "chapter-past", title: s.past.title },
                { id: "chapter-present", title: s.present.title },
                { id: "chapter-solution", title: s.solution.title },
              ].map((chapter, index) => (
                <li key={chapter.id}>
                  <a href={`#${chapter.id}`} className={styles.chapterLink}>
                    <span className={styles.chapterNumber}>{index + 1}</span>
                    {chapter.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.collage} aria-hidden="true">
            <Image src="/assets/images/lasagna-800.webp" alt="" width={800} height={600} sizes="(min-width: 900px) 340px, 60vw" priority />
            <Image src="/assets/images/stuffed-800.webp" alt="" width={800} height={600} sizes="(min-width: 900px) 260px, 45vw" />
            <Image src="/assets/images/curry-800.webp" alt="" width={800} height={600} sizes="(min-width: 900px) 240px, 40vw" />
          </div>
        </div>
        <a href="#chapter-past" className={styles.scrollCue}>
          {s.scrollCue}
          <Icon name="arrowRight" className={styles.scrollCueIcon} />
        </a>
      </section>

      <section id="chapter-past" className={`${styles.chapter} ${styles.past}`} aria-labelledby="past-title">
        <div className="container">
          <header className={styles.chapterHead}>
            <p className={styles.chapterLabel}>{format(s.chapterLabel, { n: 1 })}</p>
            <h2 id="past-title" className={styles.chapterTitle}>
              {s.past.title}
            </h2>
            <p className={styles.chapterLead}>{s.past.lead}</p>
          </header>
          <Scrolly
            steps={s.past.steps.map((step, index) => ({
              key: step.title,
              text: (
                <>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p>{step.text}</p>
                </>
              ),
              graphic: <StoryPhoto {...PAST_PHOTOS[index]!} alt={s.past.imageAlts[index] ?? ""} note={s.photoNote} />,
            }))}
          />
        </div>
      </section>

      <section id="chapter-present" className={`${styles.chapter} ${styles.present}`} aria-labelledby="present-title">
        <div className="container">
          <header className={styles.chapterHead}>
            <p className={styles.chapterLabel}>{format(s.chapterLabel, { n: 2 })}</p>
            <h2 id="present-title" className={styles.chapterTitle}>
              {s.present.title}
            </h2>
            <p className={styles.chapterLead}>{s.present.lead}</p>
          </header>
          <Scrolly
            tone="dark"
            steps={s.present.steps.map((step, index) => ({
              key: step.title,
              text: (
                <>
                  <p className={styles.tag}>{step.tag}</p>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p>{step.text}</p>
                </>
              ),
              graphic: [
                <ClockArt key="clock" caption={s.present.clockCaption} />,
                <KitchenArt key="kitchen" caption={s.present.kitchenCaption} />,
                <BowlsArt key="bowls" caption={s.present.bowlsCaption} price={price(data.prices.medianCents)} />,
                <QuestionsArt key="questions" caption={s.present.questionsCaption} questions={s.present.questions} />,
              ][index],
            }))}
          />
          <p className={styles.presentNote}>
            <Icon name="info" />
            {s.present.note}
          </p>
        </div>
      </section>

      <section id="chapter-solution" className={`${styles.chapter} ${styles.solution}`} aria-labelledby="solution-title">
        <div className="container">
          <header className={styles.chapterHead}>
            <p className={styles.chapterLabel}>{format(s.chapterLabel, { n: 3 })}</p>
            <h2 id="solution-title" className={styles.chapterTitle}>
              {s.solution.title}
            </h2>
            <p className={styles.chapterLead}>{s.solution.lead}</p>
            <Notice tone="demo" className={styles.demoData}>
              {s.solution.demoData}
            </Notice>
          </header>
          <Scrolly
            steps={[
              {
                key: "menu",
                text: (
                  <>
                    <h3 className={styles.stepTitle}>{s.solution.steps.menu.title}</h3>
                    <p>
                      {format(s.solution.steps.menu.text, {
                        offerings: data.offeringCount,
                        evenings: data.eveningCount,
                        cooks: data.cookCount,
                        neighborhood: data.neighborhoodName,
                      })}
                    </p>
                  </>
                ),
                graphic: <MenuWeek dates={menu.dates} offerings={data.offerings} />,
              },
              {
                key: "prices",
                text: (
                  <>
                    <h3 className={styles.stepTitle}>{s.solution.steps.prices.title}</h3>
                    <p>
                      {format(s.solution.steps.prices.text, {
                        min: price(data.prices.minCents),
                        max: price(data.prices.maxCents),
                        median: price(data.prices.medianCents),
                      })}
                    </p>
                    <OfferingsTable offerings={data.offerings} />
                  </>
                ),
                graphic: <PriceStrip offerings={data.offerings} prices={data.prices} />,
              },
              {
                key: "fair",
                text: (
                  <>
                    <h3 className={styles.stepTitle}>{s.solution.steps.fair.title}</h3>
                    <p>
                      {format(s.solution.steps.fair.text, {
                        min: price(Math.min(...unitPrices)),
                        max: price(Math.max(...unitPrices)),
                      })}
                    </p>
                    <DishesTable dishes={data.dishes} />
                  </>
                ),
                graphic: <UnitPriceBars dishes={data.dishes} />,
              },
              {
                key: "planned",
                text: (
                  <>
                    <h3 className={styles.stepTitle}>{s.solution.steps.planned.title}</h3>
                    <p>
                      {format(s.solution.steps.planned.text, {
                        cutoff: data.cutoffHours,
                        reserved: data.reservedTotal,
                        capacity: data.capacityTotal,
                      })}
                    </p>
                    <EveningsTable offerings={data.offerings} />
                  </>
                ),
                graphic: <ReservedMeters data={data} />,
              },
              {
                key: "trust",
                text: (
                  <>
                    <h3 className={styles.stepTitle}>{s.solution.steps.trust.title}</h3>
                    <p>
                      {format(s.solution.steps.trust.text, {
                        allergens: data.allergenCount,
                        slot: data.slotMinutes,
                      })}
                    </p>
                  </>
                ),
                graphic: <StatTiles data={data} />,
              },
            ]}
          />
        </div>
      </section>

      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={`container ${styles.ctaInner}`}>
          <h2 id="cta-title" className={styles.ctaTitle}>
            {s.solution.ctaTitle}
          </h2>
          <p className={styles.ctaText}>{s.solution.ctaText}</p>
          <div className={styles.ctaActions}>
            <Link href={href("/meals")} className={buttonClass({ variant: "light", size: "lg" })}>
              {s.solution.ctaPrimary}
            </Link>
            <Link href={href("/become-a-cook")} className={buttonClass({ variant: "secondary", size: "lg", className: styles.ctaSecondary })}>
              {s.solution.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
