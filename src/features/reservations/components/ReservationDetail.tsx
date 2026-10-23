"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemoQuery } from "@/data/demo/DemoProvider";
import { pickText } from "@/domain/localized";
import type { Reservation } from "@/domain/reservation";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import { reservationTiming } from "../views";
import { CancelReservation } from "./CancelReservation";
import { PickupPass } from "./PickupPass";
import { StatusBadge } from "./StatusBadge";
import styles from "./Reservations.module.css";

export function ReservationDetail({ reservationId, isNew }: { reservationId: string; isNew: boolean }) {
  const { t, locale, format, date, money, href, instant } = useI18n();
  const { data: reservation, ready } = useDemoQuery(
    `reservation:${reservationId}`,
    (repos) => repos.reservations.get(reservationId),
    null as Reservation | null,
  );
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (ready && reservation && isNew) headingRef.current?.focus();
    // Focus the confirmation once, when it first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <p className={styles.loading}>{t.common.loading}</p>;

  if (!reservation) {
    return (
      <div className={styles.empty}>
        <h1>{t.reservation.notFoundTitle}</h1>
        <p>{t.reservation.notFoundText}</p>
        <Link href={href("/reservations")} className={buttonClass()}>
          {t.reservation.myReservations}
        </Link>
      </div>
    );
  }

  const timing = reservationTiming(reservation, new Date());
  const title = pickText(reservation.mealTitle, locale);

  return (
    <div className={styles.detail}>
      {isNew ? (
        <div className={styles.confirmation}>
          <span className={styles.confirmIcon}>
            <Icon name="check" />
          </span>
          <h1 ref={headingRef} tabIndex={-1}>
            {t.reservation.confirmedTitle}
          </h1>
          <p>{t.reservation.confirmedText}</p>
        </div>
      ) : (
        <h1 className={styles.detailTitle}>{title}</h1>
      )}

      <Notice tone="demo" title={t.reserve.demoNoticeTitle}>
        {t.reserve.demoNotice}
      </Notice>

      {/* Focus moves here after cancelling, because the cancel button itself disappears. */}
      <div aria-live="polite" ref={messageRef} tabIndex={-1} className={styles.message}>
        {message ? (
          <Notice tone={message.ok ? "success" : "error"} role={message.ok ? "status" : "alert"}>
            {message.text}
          </Notice>
        ) : null}
      </div>

      {timing.upcoming ? <PickupPass reservation={reservation} /> : null}

      <section className={styles.panel} aria-labelledby="summary-title">
        <h2 id="summary-title" className={styles.panelTitle}>
          {title}
        </h2>
        <dl className={styles.facts}>
          <div>
            <dt>{t.reservation.status}</dt>
            <dd>
              <StatusBadge status={reservation.status} />
              <p className={styles.help}>{t.reservations.statusHelp[reservation.status]}</p>
            </dd>
          </div>
          <div>
            <dt>{t.reserve.when}</dt>
            <dd>{format(t.reserve.whenValue, { date: date(reservation.pickup.date), slot: reservation.pickup.slot })}</dd>
          </div>
          <div>
            <dt>{t.reserve.where}</dt>
            <dd>
              {format(t.detail.pickupWhere, {
                area: pickText(reservation.pickup.area, locale),
                neighborhood: reservation.pickup.neighborhoodName,
              })}
            </dd>
          </div>
          <div>
            <dt>{t.reserve.cook}</dt>
            <dd>
              {reservation.cookName} ({t.common.fictionalProfile})
            </dd>
          </div>
          <div>
            <dt>{t.detail.quantity}</dt>
            <dd>{reservation.quantity}</dd>
          </div>
          <div>
            <dt>{t.reserve.unitPrice}</dt>
            <dd>{money(reservation.unitPrice)}</dd>
          </div>
          <div>
            <dt>{t.reserve.total}</dt>
            <dd>
              <strong>{money(reservation.total)}</strong>
            </dd>
          </div>
        </dl>

        {timing.canCancel ? (
          <div className={styles.cancelRow}>
            <p className={styles.help}>{format(t.reservation.cancelUntil, { when: instant(reservation.cancellableUntil) })}</p>
            <CancelReservation reservation={reservation} onDone={(text, ok) => setMessage({ text, ok })} />
          </div>
        ) : timing.upcoming ? (
          <p className={styles.help}>{t.reservation.cancelClosed}</p>
        ) : null}
      </section>

      {isNew ? (
        <section className={styles.panel} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.panelTitle}>
            {t.reservation.whatNext}
          </h2>
          <ol className={styles.nextSteps}>
            {t.reservation.whatNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className={styles.links}>
        <Link href={href("/reservations")} className={buttonClass()}>
          {t.reservation.myReservations}
        </Link>
        <Link href={href("/meals")} className={buttonClass({ variant: "secondary" })}>
          {t.reservation.keepExploring}
        </Link>
      </div>
    </div>
  );
}
