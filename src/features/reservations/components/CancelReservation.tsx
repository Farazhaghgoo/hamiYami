"use client";

import { useState } from "react";
import { useDemo } from "@/data/demo/DemoProvider";
import { pickText } from "@/domain/localized";
import type { Reservation } from "@/domain/reservation";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

/** Cancel button with a confirmation dialog. Reports the outcome through `onDone`. */
export function CancelReservation({
  reservation,
  onDone,
}: {
  reservation: Reservation;
  onDone: (message: string, ok: boolean) => void;
}) {
  const { t, locale, format, date } = useI18n();
  const { repositories } = useDemo();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={() => setOpen(true)}>
        {t.reservation.cancel}
      </button>
      <ConfirmDialog
        open={open}
        title={t.reservation.cancelTitle}
        confirmLabel={t.reservation.cancelConfirm}
        cancelLabel={t.reservation.keep}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          const result = await repositories.reservations.transition(
            reservation.id,
            "cancelled_by_customer",
            "customer",
            new Date(),
          );
          setOpen(false);
          if (result.ok) onDone(t.reservation.cancelled, true);
          else onDone(result.error === "cutoff_passed" ? t.reservation.cancelClosed : t.reservation.cancelError, false);
        }}
      >
        <p>
          {format(t.reservation.cancelBody, {
            meal: pickText(reservation.mealTitle, locale),
            date: date(reservation.pickup.date),
          })}
        </p>
      </ConfirmDialog>
    </>
  );
}
