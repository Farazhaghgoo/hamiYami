"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useDemoQuery } from "@/data/demo/DemoProvider";
import { pickText } from "@/domain/localized";
import type { MenuWindow } from "@/domain/menu-window";
import { multiplyMoney } from "@/domain/money";
import { checkQuantity } from "@/domain/offering";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/fields";
import { Icon } from "@/shared/ui/Icon";
import { MealImage } from "@/shared/ui/MealImage";
import { Notice } from "@/shared/ui/Notice";
import { QuantityStepper } from "@/shared/ui/QuantityStepper";
import { getOfferingDetail, type OfferingDetailView } from "../detail";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { FoodInfo } from "./FoodInfo";
import { PortionSizeNote } from "./PortionSizeNote";
import { useQuantityMessage } from "./useQuantityMessage";
import styles from "./OfferingDetail.module.css";

export function OfferingDetail({
  offeringId,
  menu,
  initial,
}: {
  offeringId: string;
  menu: MenuWindow;
  initial: OfferingDetailView | null;
}) {
  const { t, locale, format, href, date, instant, money } = useI18n();
  const { data: detail, ready } = useDemoQuery(
    `detail:${offeringId}`,
    (repos, now) => getOfferingDetail(repos.catalog, offeringId, menu, now),
    initial,
  );

  if (!detail) {
    if (!ready) return <p className={styles.loading}>{t.common.loading}</p>;
    return (
      <div className={styles.missing}>
        <h1>{t.detail.notFoundTitle}</h1>
        <p>{t.detail.notFoundText}</p>
        <Link href={href("/meals")} className={buttonClass()}>
          {t.detail.browseOthers}
        </Link>
      </div>
    );
  }

  const { offering, meal, cook, availability } = detail;
  const title = pickText(meal.title, locale);

  return (
    <>
      <nav aria-label={t.detail.breadcrumb} className={styles.breadcrumb}>
        <Link href={href("/meals")}>
          <Icon name="arrowLeft" />
          {t.detail.backToMeals}
        </Link>
      </nav>

      <div className={styles.layout}>
        <div className={styles.media}>
          <MealImage image={meal.image} title={title} sizes="(min-width: 960px) 600px, 100vw" priority />
        </div>

        <div className={styles.heading}>
          <p className={styles.fictional}>
            <Icon name="info" />
            {t.detail.fictionalExample}
          </p>
          <h1>{title}</h1>
          <p className={styles.byline}>
            {format(t.detail.cookedBy, { cook: cook.displayName })} · {detail.neighborhoodName}
          </p>
        </div>

        <aside className={styles.reserve} aria-labelledby="reserve-title">
          <h2 id="reserve-title" className="visually-hidden">
            {t.detail.priceTitle}
          </h2>
          <div>
            <p className={styles.price}>
              <strong>{money(offering.price)}</strong> {t.common.perPortion}
            </p>
            <PortionSizeNote size={meal.portionSize} price={offering.price} className={styles.small} />
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>
                <Icon name="calendar" />
                {t.detail.pickupTitle}
              </dt>
              <dd>
                {format(t.detail.pickupWhen, {
                  date: date(offering.pickupDate),
                  start: offering.pickupWindow.start,
                  end: offering.pickupWindow.end,
                })}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="pin" />
                {t.reserve.where}
              </dt>
              <dd>
                {format(t.detail.pickupWhere, { area: pickText(detail.pickupArea, locale), neighborhood: detail.neighborhoodName })}
              </dd>
            </div>
          </dl>
          <div className={styles.availability}>
            <AvailabilityBadge availability={availability} />
            <span className={styles.fictionalSmall}>{t.demo.fictionalAvailability}</span>
          </div>

          {availability.reservable ? (
            <ReserveForm detail={detail} />
          ) : (
            <Notice tone="warning" title={availability.state === "sold_out" ? t.detail.soldOutTitle : t.detail.closedTitle}>
              {availability.state === "sold_out" ? t.detail.soldOutText : t.detail.closedText}
            </Notice>
          )}

          {availability.reservable ? (
            <p className={styles.small}>{format(t.detail.reserveBy, { when: instant(availability.cutoff) })}</p>
          ) : null}

          <div className={styles.otherDates}>
            <h3>{t.detail.otherDates}</h3>
            {detail.otherDates.length ? (
              <ul>
                {detail.otherDates.map((other) => (
                  <li key={other.offeringId}>
                    <Link href={href(`/meals/${other.offeringId}`)}>{date(other.date)}</Link>
                    {!other.reservable ? <span className={styles.small}> · {t.card.soldOut}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.small}>{t.detail.noOtherDates}</p>
            )}
          </div>
        </aside>

        <div className={styles.info}>
          <section aria-labelledby="about-title" className={styles.section}>
            <h2 id="about-title">{t.detail.about}</h2>
            <p>{pickText(meal.description, locale)}</p>
            <dl className={styles.details}>
              <div>
                <dt>{t.detail.portion}</dt>
                <dd>{pickText(meal.portion, locale)}</dd>
              </div>
              <div>
                <dt>{t.detail.ingredients}</dt>
                <dd>{pickText(meal.ingredients, locale)}</dd>
              </div>
            </dl>
          </section>

          <FoodInfo meal={meal} />

          <section aria-labelledby="cook-title" className={`${styles.section} ${styles.cook}`}>
            <h2 id="cook-title">{t.detail.cookTitle}</h2>
            <p className={styles.cookName}>
              <span className={styles.avatar} aria-hidden="true">
                {cook.displayName.slice(0, 1)}
              </span>
              <span>
                <strong>{cook.displayName}</strong>
                <span className={styles.small}> · {t.common.fictionalProfile}</span>
              </span>
            </p>
            <p>{pickText(cook.cookingStyle, locale)}</p>
            <Link href={href(`/cooks/${cook.id}`)}>{format(t.detail.viewCook, { cook: cook.displayName })}</Link>
          </section>

          <p className={styles.small}>
            {t.detail.addressNote} {t.common.romeTimeNote}
          </p>
        </div>
      </div>
    </>
  );
}

function ReserveForm({ detail }: { detail: OfferingDetailView }) {
  const { t, href, money, format } = useI18n();
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-qty`;
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const quantityMessage = useQuantityMessage(detail);

  const numeric = Number(quantity);
  const issue = checkQuantity(numeric, detail.offering, detail.availability);
  const total = issue ? null : multiplyMoney(detail.offering.price, numeric);

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (issue) {
          setError(quantityMessage(issue));
          inputRef.current?.querySelector("input")?.focus();
          return;
        }
        router.push(href(`/meals/${detail.offering.id}/reserve?qty=${numeric}`));
      }}
    >
      <div className={styles.quantityRow} ref={inputRef}>
        <label htmlFor={inputId} className={styles.quantityLabel}>
          {t.detail.quantity}
        </label>
        <QuantityStepper
          id={inputId}
          value={quantity}
          min={1}
          max={detail.availability.maxQuantity}
          onChange={(value) => {
            setQuantity(value);
            setError(null);
          }}
          decreaseLabel={t.detail.decrease}
          increaseLabel={t.detail.increase}
          describedBy={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
          invalid={Boolean(error)}
        />
      </div>
      <p id={`${inputId}-hint`} className={styles.small}>
        {format(t.detail.maxPerReservation, { count: detail.availability.maxQuantity })}
      </p>
      <FieldError id={inputId} error={error ?? undefined} />
      <p className={styles.total} aria-live="polite">
        {t.detail.total}: <strong>{total ? money(total) : "—"}</strong>
      </p>
      <button type="submit" className={buttonClass({ size: "lg", block: true })}>
        {t.detail.reserve}
      </button>
      <p className={styles.small}>{t.detail.reserveHint}</p>
    </form>
  );
}
