"use client";

import type { ReservationStatus } from "@/domain/reservation";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, type BadgeTone } from "@/shared/ui/Badge";

const TONES: Record<ReservationStatus, BadgeTone> = {
  requested: "warning",
  confirmed: "green",
  collected: "neutral",
  not_collected: "neutral",
  cancelled_by_customer: "tomato",
  declined_by_cook: "tomato",
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useI18n();
  return <Badge tone={TONES[status]}>{t.reservations.statuses[status]}</Badge>;
}
