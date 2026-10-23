"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDemoQuery } from "@/data/demo/DemoProvider";
import { pickText } from "@/domain/localized";
import { pickupCodeFor } from "@/domain/pickup-code";
import type { Reservation } from "@/domain/reservation";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import { reservationTiming, splitReservations } from "../views";
import { CancelReservation } from "./CancelReservation";
import { StatusBadge } from "./StatusBadge";
import styles from "./Reservations.module.css";

export function ReservationsList() {
  const { t, href } = useI18n();
  const { data, ready } = useDemoQuery("my-reservations", (repos) => repos.reservations.listMine(), [] as Reservation[]);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  if (!ready) return <p className={styles.loading}>{t.common.loading}</p>;

  const now = new Date();
  const { upcoming, past } = splitReservations(data, now);

  return (
    <div className={styles.list}>
      {/* Focus moves here after cancelling, because the cancel button itself disappears. */}
      <div aria-live="polite" ref={messageRef} tabIndex={-1} className={styles.message}>
        {message ? (
          <Notice tone={message.ok ? "success" : "error"} role={message.ok ? "status" : "alert"}>
            {message.text}
          </Notice>
        ) : null}
      </div>

      {data.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="bag" className={styles.emptyIcon} />
          <h2>{t.reservations.emptyTitle}</h2>
          <p>{t.reservations.emptyText}</p>
          <Link href={href("/meals")} className={buttonClass()}>
            {t.reservations.emptyCta}
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length ? (
            <section aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className={styles.groupTitle}>
                {t.reservations.upcoming}
              </h2>
              <ul className={styles.cards}>
                {upcoming.map((r) => (
                  <ReservationCard key={r.id} reservation={r} now={now} onMessage={(text, ok) => setMessage({ text, ok })} />
                ))}
              </ul>
            </section>
          ) : null}
          {past.length ? (
            <section aria-labelledby="past-title">
              <h2 id="past-title" className={styles.groupTitle}>
                {t.reservations.past}
              </h2>
              <ul className={styles.cards}>
                {past.map((r) => (
                  <ReservationCard key={r.id} reservation={r} now={now} onMessage={(text, ok) => setMessage({ text, ok })} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ReservationCard({
  reservation,
  now,
  onMessage,
}: {
  reservation: Reservation;
  now: Date;
  onMessage: (text: string, ok: boolean) => void;
}) {
  const { t, locale, format, shortDate, money, href, plural } = useI18n();
  const timing = reservationTiming(reservation, now);
  const title = pickText(reservation.mealTitle, locale);
  return (
    <li className={styles.card}>
      <div className={styles.cardMain}>
        <h3 className={styles.cardTitle}>
          <Link href={href(`/reservations/${reservation.id}`)}>{title}</Link>
        </h3>
        <p className={styles.meta}>
          {format(t.reserve.whenValue, { date: shortDate(reservation.pickup.date), slot: reservation.pickup.slot })} ·{" "}
          {plural(t.common.portions, reservation.quantity)} · {money(reservation.total)}
          {timing.upcoming ? ` · ${format(t.reservation.pickupCodeInline, { code: pickupCodeFor(reservation.id) })}` : null}
        </p>
        <StatusBadge status={reservation.status} />
      </div>
      <div className={styles.cardActions}>
        <Link href={href(`/reservations/${reservation.id}`)} className={buttonClass({ variant: "quiet", size: "sm" })}>
          {t.reservations.view}
          <span className="visually-hidden">: {title}</span>
        </Link>
        {timing.canCancel ? <CancelReservation reservation={reservation} onDone={onMessage} /> : null}
      </div>
    </li>
  );
}
