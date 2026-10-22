"use client";

import Link from "next/link";
import { pickText } from "@/domain/localized";
import { useI18n } from "@/i18n/I18nProvider";
import { Icon } from "@/shared/ui/Icon";
import { MealImage } from "@/shared/ui/MealImage";
import type { MealCardView } from "../discovery";
import { AvailabilityBadge } from "./AvailabilityBadge";
import styles from "./MealCard.module.css";

export function MealCard({
  card,
  headingLevel = 3,
  priority = false,
}: {
  card: MealCardView;
  headingLevel?: 2 | 3;
  priority?: boolean;
}) {
  const { t, locale, format, shortDate, money, href } = useI18n();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const title = pickText(card.meal.title, locale);
  const dimmed = !card.availability.reservable;

  return (
    <article className={styles.card} data-dimmed={dimmed || undefined}>
      <MealImage
        image={card.meal.image}
        title={title}
        sizes="(min-width: 1100px) 360px, (min-width: 640px) 45vw, 100vw"
        priority={priority}
        className={styles.media}
      />
      <div className={styles.body}>
        <Heading className={styles.title}>
          {/* The link covers the whole card (see .title a::after) but is announced by its title. */}
          <Link href={href(`/meals/${card.offeringId}`)}>{title}</Link>
        </Heading>
        <p className={styles.meta}>
          {format(t.card.by, { cook: card.cook.displayName })} · {card.neighborhoodName}
        </p>
        <p className={styles.pickup}>
          <Icon name="clock" />
          {format(t.card.pickup, {
            date: shortDate(card.pickupDate),
            start: card.pickupWindow.start,
            end: card.pickupWindow.end,
          })}
        </p>
        {card.meal.dietary.length ? (
          <ul className={styles.tags} aria-label={t.detail.dietary}>
            {card.meal.dietary.map((tag) => (
              <li key={tag}>{t.food.dietary[tag]}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.footer}>
          <p className={styles.price}>
            <strong>{money(card.price)}</strong> <span>{t.common.perPortion}</span>
          </p>
          <AvailabilityBadge availability={card.availability} />
        </div>
      </div>
    </article>
  );
}
