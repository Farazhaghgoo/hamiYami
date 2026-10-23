"use client";

import { isLocalId } from "@/domain/ids";
import { pickText } from "@/domain/localized";
import { pickupCodeFor } from "@/domain/pickup-code";
import { allowedTransitions, type Reservation, type ReservationStatus } from "@/domain/reservation";
import type { CivilDate } from "@/domain/time";
import { StatusBadge } from "@/features/reservations/components/StatusBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/button";
import type { PrepDay, PrepItem } from "../prep";
import styles from "./Workspace.module.css";

const COOK_ACTIONS: Partial<Record<ReservationStatus, "confirm" | "decline" | "markCollected" | "markNotCollected">> = {
  confirmed: "confirm",
  declined_by_cook: "decline",
  collected: "markCollected",
  not_collected: "markNotCollected",
};

/**
 * The cook's day-by-day plan: portions to cook per dish, requests to decide on, and the pickup
 * list with each customer's pickup code. Actions on a reservation live here, next to the numbers
 * they change.
 */
export function PrepView({
  days,
  tomorrow,
  onTransition,
}: {
  days: PrepDay[];
  tomorrow: CivilDate;
  onTransition: (reservation: Reservation, to: ReservationStatus) => void;
}) {
  const { t, date, plural } = useI18n();
  if (!days.length) return <p className={styles.empty}>{t.workspace.noPrep}</p>;

  return (
    <div className={styles.prepDays}>
      {days.map((day) => {
        const headingId = `prep-${day.date}`;
        const label = date(day.date);
        return (
          <section key={day.date} className={styles.prepDay} aria-labelledby={headingId}>
            <div className={styles.prepDayHead}>
              <h3 id={headingId} className={styles.prepDayTitle}>
                {day.date === tomorrow ? <span className={styles.dayRelative}>{t.meals.tomorrow}</span> : null}{" "}
                <span>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
              </h3>
              <p className={styles.prepDaySummary}>
                <strong>{plural(t.workspace.prepPortions, day.toPrepare)}</strong>
                {day.pendingRequests ? <span> · {plural(t.workspace.prepRequests, day.pendingRequests)}</span> : null}
              </p>
            </div>
            <ul className={styles.prepItems}>
              {day.items.map((item) => (
                <PrepItemCard key={item.offering.id} item={item} onTransition={onTransition} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PrepItemCard({
  item,
  onTransition,
}: {
  item: PrepItem;
  onTransition: (reservation: Reservation, to: ReservationStatus) => void;
}) {
  const { t, locale, format, plural, shortDate } = useI18n();
  const { offering } = item;
  const title = item.mealTitle ? pickText(item.mealTitle, locale) : offering.mealId;
  const now = new Date();

  return (
    <li className={styles.prepItem}>
      <div className={styles.prepItemHead}>
        <h4 className={styles.rowTitle}>
          {title}{" "}
          {offering.status !== "published" ? <Badge tone="neutral">{t.workspace.unpublished}</Badge> : null}
        </h4>
        <p className={styles.muted}>
          {format(t.card.pickupTime, { start: offering.pickupWindow.start, end: offering.pickupWindow.end })}
        </p>
      </div>

      <dl className={styles.stats}>
        <div className={styles.statMain}>
          <dt>{t.workspace.statToPrepare}</dt>
          <dd>{item.toPrepare}</dd>
        </div>
        <div>
          <dt>{t.workspace.statConfirmed}</dt>
          <dd>{item.confirmedPortions}</dd>
        </div>
        <div data-attention={item.requestedPortions > 0 || undefined}>
          <dt>{t.workspace.statRequested}</dt>
          <dd>{item.requestedPortions}</dd>
        </div>
        <div>
          <dt>{t.workspace.statRemaining}</dt>
          <dd>{format(t.workspace.statRemainingValue, { remaining: item.remaining, capacity: offering.capacity })}</dd>
        </div>
      </dl>

      {item.reservations.length ? (
        <ul className={styles.handover} aria-label={format(t.workspace.handoverLabel, { meal: title })}>
          {item.reservations.map((reservation) => {
            const code = pickupCodeFor(reservation.id);
            const own = isLocalId(reservation.id);
            const actions = allowedTransitions(reservation, "cook", now);
            // Hidden context makes each button unique for screen-reader and voice users.
            const context = `: ${title}, ${shortDate(offering.pickupDate)}, ${reservation.pickup.slot}, ${code}`;
            return (
              <li key={reservation.id} className={styles.handoverRow}>
                <span className={styles.handoverSlot}>{reservation.pickup.slot}</span>
                <span className={styles.handoverCode}>{format(t.reservation.pickupCodeInline, { code })}</span>
                <span>{plural(t.common.portions, reservation.quantity)}</span>
                <span className={styles.handoverBadges}>
                  <StatusBadge status={reservation.status} />
                  <Badge tone={own ? "dark" : "neutral"}>{own ? t.workspace.yourOwn : t.workspace.sample}</Badge>
                </span>
                {actions.length ? (
                  <span className={styles.handoverActions}>
                    {actions.map((to) => {
                      const label = COOK_ACTIONS[to];
                      return label ? (
                        <button
                          key={to}
                          type="button"
                          className={buttonClass({ variant: to === "confirmed" ? "primary" : "secondary", size: "sm" })}
                          onClick={() => onTransition(reservation, to)}
                        >
                          {t.workspace[label]}
                          <span className="visually-hidden">{context}</span>
                        </button>
                      ) : null;
                    })}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.muted}>{t.workspace.noReservationsYet}</p>
      )}
      {item.releasedCount ? <p className={styles.muted}>{plural(t.workspace.released, item.releasedCount)}</p> : null}
    </li>
  );
}
