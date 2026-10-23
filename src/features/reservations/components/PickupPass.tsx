"use client";

import { pickText } from "@/domain/localized";
import { pickupCodeFor } from "@/domain/pickup-code";
import type { Reservation } from "@/domain/reservation";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import { calendarDataUrl, calendarFileName, reservationCalendarFile } from "../calendar";
import styles from "./Reservations.module.css";

/**
 * What a customer needs at pickup: the code to give the cook, and a calendar entry so they don't
 * forget. The calendar file is a data: link built here, so downloading it sends nothing anywhere.
 */
export function PickupPass({ reservation }: { reservation: Reservation }) {
  const { t, locale, format, plural, money, date } = useI18n();
  const code = pickupCodeFor(reservation.id);
  const { pickup } = reservation;

  const ics = reservationCalendarFile(reservation, {
    summary: format(t.reservation.calendarSummary, { meal: pickText(reservation.mealTitle, locale) }),
    description: format(t.reservation.calendarDescription, {
      portions: plural(t.common.portions, reservation.quantity),
      total: money(reservation.total),
      start: pickup.window.start,
      end: pickup.window.end,
      code,
    }),
    location: format(t.reservation.calendarLocation, {
      area: pickText(pickup.area, locale),
      neighborhood: pickup.neighborhoodName,
    }),
    alarm: t.reservation.calendarAlarm,
  });

  return (
    <section className={styles.pass} aria-labelledby="pickup-pass-title">
      <div className={styles.passCode}>
        <h2 id="pickup-pass-title" className={styles.passLabel}>
          {t.reservation.pickupCode}
        </h2>
        <p className={styles.code}>{code}</p>
        <p className={styles.help}>
          {format(t.reserve.whenValue, { date: date(pickup.date), slot: pickup.slot })}
        </p>
      </div>
      <div className={styles.passActions}>
        <a href={calendarDataUrl(ics)} download={calendarFileName(reservation)} className={buttonClass({ variant: "secondary" })}>
          <Icon name="calendar" />
          {t.reservation.addToCalendar}
        </a>
        <p className={styles.help}>{t.reservation.calendarHint}</p>
      </div>
      <p className={styles.passNote}>{t.reservation.pickupCodeHelp}</p>
    </section>
  );
}
