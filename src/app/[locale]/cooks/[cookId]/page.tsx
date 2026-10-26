import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerCatalog } from "@/data/server/catalog";
import { pickText } from "@/domain/localized";
import { menuWindow } from "@/domain/menu-window";
import { CookUpcoming } from "@/features/cooks/components/CookUpcoming";
import { getCookProfile } from "@/features/cooks/profile";
import { getI18n } from "@/i18n/server";
import { pageMetadata } from "@/shared/seo/metadata";
import { Notice } from "@/shared/ui/Notice";
import styles from "./cook.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/cooks/[cookId]">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { cookId } = await params;
  const { catalog } = getServerCatalog();
  const cook = await catalog.getCook(cookId);
  if (!cook) return {};
  return pageMetadata(i18n, `/cooks/${cookId}`, {
    title: i18n.format(i18n.t.cook.metaTitle, { name: cook.displayName }),
    description: pickText(cook.bio, i18n.locale),
  });
}

export default async function CookPage({ params }: PageProps<"/[locale]/cooks/[cookId]">) {
  const { t, locale } = await getI18n(params);
  const { cookId } = await params;
  const now = new Date();
  const { anchor, catalog } = getServerCatalog(now);
  const menu = menuWindow(anchor);
  const profile = await getCookProfile(catalog, cookId, menu, now);
  if (!profile) notFound();
  const { cook } = profile;

  return (
    <main id="main" tabIndex={-1} className="container">
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {cook.displayName.slice(0, 1)}
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>
            {t.cook.eyebrow} · {t.common.fictionalProfile}
          </p>
          <h1>{cook.displayName}</h1>
          <p className={styles.lead}>{pickText(cook.cookingStyle, locale)}</p>
        </div>
      </header>

      <Notice tone="demo">{t.cook.fictionalNotice}</Notice>

      <div className={styles.grid}>
        <section aria-labelledby="about-title" className={styles.card}>
          <h2 id="about-title">{t.cook.about}</h2>
          <p>{pickText(cook.bio, locale)}</p>
          <dl className={styles.facts}>
            <div>
              <dt>{t.cook.style}</dt>
              <dd>{pickText(cook.cookingStyle, locale)}</dd>
            </div>
            <div>
              <dt>{t.cook.pickupArea}</dt>
              <dd>
                {profile.pickupArea ? `${pickText(profile.pickupArea, locale)}, ` : ""}
                {profile.neighborhoodName}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="checks-title" className={styles.card}>
          <h2 id="checks-title">{t.cook.checksTitle}</h2>
          {/* Only real, completed checks may ever be listed here. Demo profiles have none. */}
          <p>{t.cook.checksNone}</p>
        </section>
      </div>

      <section aria-labelledby="menu-title" className={styles.section}>
        <h2 id="menu-title">{t.cook.sampleMenu}</h2>
        <ul className={styles.menu}>
          {profile.sampleMenu.map((meal) => (
            <li key={meal.id}>
              <strong>{pickText(meal.title, locale)}</strong>
              <span>{pickText(meal.description, locale)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="upcoming-title" className={styles.section}>
        <h2 id="upcoming-title">{t.cook.upcoming}</h2>
        <CookUpcoming cookId={cook.id} menu={menu} initial={profile.upcoming} />
      </section>
    </main>
  );
}
