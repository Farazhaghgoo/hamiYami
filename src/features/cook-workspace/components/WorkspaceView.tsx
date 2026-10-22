"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { OfferingSnapshot } from "@/data/contracts";
import { useDemo, useDemoQuery } from "@/data/demo/DemoProvider";
import type { Meal } from "@/domain/catalog";
import { isLocalId } from "@/domain/ids";
import { pickText } from "@/domain/localized";
import { schedulableRange } from "@/domain/menu-window";
import { allowedTransitions, type Reservation, type ReservationStatus } from "@/domain/reservation";
import { StatusBadge } from "@/features/reservations/components/StatusBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import styles from "./Workspace.module.css";

interface WorkspaceData {
  meals: Meal[];
  offerings: OfferingSnapshot[];
  reservations: Reservation[];
}

const EMPTY: WorkspaceData = { meals: [], offerings: [], reservations: [] };

export function WorkspaceView() {
  const { t, locale, href, format } = useI18n();
  const { anchor, repositories } = useDemo();
  const searchParams = useSearchParams();
  const range = schedulableRange(anchor);
  const { data, ready } = useDemoQuery(
    `workspace:${anchor}`,
    async (repos) => {
      const [meals, offerings, reservations] = await Promise.all([
        repos.cookWorkspace.listMeals(),
        repos.cookWorkspace.listOfferings({ from: range.min, to: range.max }),
        repos.cookWorkspace.listReservations(),
      ]);
      return {
        meals,
        offerings,
        reservations: reservations.filter((r) => r.pickup.date >= range.min),
      };
    },
    EMPTY,
  );
  // `focus` is set when the control that was used disappears (e.g. Confirm after confirming), so
  // keyboard users land on the outcome instead of the top of the page.
  const [message, setMessage] = useState<{ text: string; ok: boolean; focus?: boolean } | null>(
    searchParams.get("saved") ? { text: t.workspace.saved, ok: true, focus: true } : null,
  );
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message?.focus) messageRef.current?.focus();
  }, [message]);

  const mealTitle = (mealId: string) => {
    const meal = data.meals.find((m) => m.id === mealId);
    return meal ? pickText(meal.title, locale) : mealId;
  };

  async function toggle(snapshot: OfferingSnapshot) {
    const next = snapshot.offering.status === "published" ? "unpublished" : "published";
    const result = await repositories.cookWorkspace.setOfferingStatus(snapshot.offering.id, next);
    setMessage(
      result.ok
        ? { text: next === "published" ? t.workspace.publishedDone : t.workspace.unpublishedDone, ok: true }
        : { text: t.validation.notFound, ok: false },
    );
  }

  async function transition(reservation: Reservation, to: ReservationStatus) {
    const result = await repositories.cookWorkspace.transitionReservation(reservation.id, to, new Date());
    setMessage(
      result.ok
        ? { text: format(t.workspace.actionDone, { status: t.reservations.statuses[to] }), ok: true, focus: true }
        : { text: t.workspace.actionError, ok: false, focus: true },
    );
  }

  return (
    <div className={styles.workspace}>
      <nav aria-label={t.workspace.navLabel} className={styles.sectionNav}>
        <a href="#offerings">
          {t.workspace.tabs.offerings} <span>{data.offerings.length}</span>
        </a>
        <a href="#meals">
          {t.workspace.tabs.meals} <span>{data.meals.length}</span>
        </a>
        <a href="#reservations">
          {t.workspace.tabs.reservations} <span>{data.reservations.length}</span>
        </a>
      </nav>

      <div aria-live="polite" ref={messageRef} tabIndex={-1} className={styles.message}>
        {message ? (
          <Notice tone={message.ok ? "success" : "error"} role={message.ok ? "status" : "alert"}>
            {message.text}
          </Notice>
        ) : null}
      </div>

      {!ready ? <p className={styles.muted}>{t.common.loading}</p> : null}

      <section id="offerings" aria-labelledby="offerings-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="offerings-title">{t.workspace.offeringsTitle}</h2>
          <Link href={href("/cook-workspace/offerings/new")} className={buttonClass({ size: "sm" })}>
            <Icon name="plus" />
            {t.workspace.newOffering}
          </Link>
        </div>
        {ready && data.offerings.length === 0 ? <p className={styles.empty}>{t.workspace.noOfferings}</p> : null}
        <ul className={styles.rows}>
          {data.offerings.map((snapshot) => (
            <OfferingRow
              key={snapshot.offering.id}
              snapshot={snapshot}
              title={mealTitle(snapshot.offering.mealId)}
              onToggle={() => toggle(snapshot)}
            />
          ))}
        </ul>
      </section>

      <section id="meals" aria-labelledby="meals-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="meals-title">{t.workspace.mealsTitle}</h2>
          <Link href={href("/cook-workspace/meals/new")} className={buttonClass({ size: "sm" })}>
            <Icon name="plus" />
            {t.workspace.newMeal}
          </Link>
        </div>
        {ready && data.meals.length === 0 ? <p className={styles.empty}>{t.workspace.noMeals}</p> : null}
        <ul className={styles.rows}>
          {data.meals.map((meal) => {
            const title = pickText(meal.title, locale);
            return (
              <li key={meal.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <h3 className={styles.rowTitle}>{title}</h3>
                  <p className={styles.muted}>
                    {t.detail.contains}:{" "}
                    {meal.allergens.length ? meal.allergens.map((a) => t.food.allergens[a]).join(", ") : "—"}
                  </p>
                </div>
                <div className={styles.rowActions}>
                  <Link
                    href={href(`/cook-workspace/offerings/new?meal=${encodeURIComponent(meal.id)}`)}
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                  >
                    {t.workspace.scheduleMeal}
                    <span className="visually-hidden">: {title}</span>
                  </Link>
                  <Link
                    href={href(`/cook-workspace/meals/${meal.id}`)}
                    className={buttonClass({ variant: "quiet", size: "sm" })}
                  >
                    {t.common.edit}
                    <span className="visually-hidden">: {title}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="reservations" aria-labelledby="reservations-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="reservations-title">{t.workspace.reservationsTitle}</h2>
        </div>
        <p className={styles.muted}>{t.workspace.reservationsNote}</p>
        {ready && data.reservations.length === 0 ? <p className={styles.empty}>{t.workspace.noReservations}</p> : null}
        <ul className={styles.rows}>
          {data.reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              onTransition={(to) => transition(reservation, to)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function OfferingRow({ snapshot, title, onToggle }: { snapshot: OfferingSnapshot; title: string; onToggle: () => void }) {
  const { t, format, shortDate, money, href } = useI18n();
  const { offering } = snapshot;
  const published = offering.status === "published";
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <h3 className={styles.rowTitle}>
          {title} <Badge tone={published ? "green" : "neutral"}>{published ? t.workspace.published : t.workspace.unpublished}</Badge>
        </h3>
        <p className={styles.muted}>
          {format(t.card.pickup, { date: shortDate(offering.pickupDate), start: offering.pickupWindow.start, end: offering.pickupWindow.end })}{" "}
          · {money(offering.price)}
        </p>
        <p className={styles.muted}>
          {format(t.workspace.reservedOf, { reserved: snapshot.reservedPortions, capacity: offering.capacity })}
        </p>
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={onToggle}>
          {published ? t.workspace.unpublish : t.workspace.publish}
          <span className="visually-hidden">: {title}, {shortDate(offering.pickupDate)}</span>
        </button>
        <Link href={href(`/cook-workspace/offerings/${offering.id}`)} className={buttonClass({ variant: "quiet", size: "sm" })}>
          {t.common.edit}
          <span className="visually-hidden">: {title}, {shortDate(offering.pickupDate)}</span>
        </Link>
        {published ? (
          <Link href={href(`/meals/${offering.id}`)} className={buttonClass({ variant: "quiet", size: "sm" })}>
            {t.workspace.viewPublic}
            <span className="visually-hidden">: {title}, {shortDate(offering.pickupDate)}</span>
          </Link>
        ) : null}
      </div>
    </li>
  );
}

const COOK_ACTIONS: Partial<Record<ReservationStatus, "confirm" | "decline" | "markCollected" | "markNotCollected">> = {
  confirmed: "confirm",
  declined_by_cook: "decline",
  collected: "markCollected",
  not_collected: "markNotCollected",
};

function ReservationRow({
  reservation,
  onTransition,
}: {
  reservation: Reservation;
  onTransition: (to: ReservationStatus) => void;
}) {
  const { t, locale, format, shortDate, plural } = useI18n();
  const actions = allowedTransitions(reservation, "cook", new Date());
  const title = pickText(reservation.mealTitle, locale);
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <h3 className={styles.rowTitle}>
          {title}{" "}
          <Badge tone={isLocalId(reservation.id) ? "dark" : "neutral"}>
            {isLocalId(reservation.id) ? t.workspace.yourOwn : t.workspace.sample}
          </Badge>
        </h3>
        <p className={styles.muted}>
          {shortDate(reservation.pickup.date)} · {format(t.workspace.slotLabel, { slot: reservation.pickup.slot })} ·{" "}
          {plural(t.common.portions, reservation.quantity)}
        </p>
        <StatusBadge status={reservation.status} />
      </div>
      {actions.length ? (
        <div className={styles.rowActions}>
          {actions.map((to) => {
            const label = COOK_ACTIONS[to];
            return label ? (
              <button
                key={to}
                type="button"
                className={buttonClass({ variant: to === "confirmed" ? "primary" : "secondary", size: "sm" })}
                onClick={() => onTransition(to)}
              >
                {t.workspace[label]}
                <span className="visually-hidden">: {title}, {shortDate(reservation.pickup.date)}</span>
              </button>
            ) : null;
          })}
        </div>
      ) : null}
    </li>
  );
}
