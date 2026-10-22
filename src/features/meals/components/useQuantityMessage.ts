"use client";

import type { QuantityIssue } from "@/domain/offering";
import { useI18n } from "@/i18n/I18nProvider";
import type { OfferingDetailView } from "../detail";

/** Turns a quantity rule violation into a localized, actionable message. */
export function useQuantityMessage(detail: Pick<OfferingDetailView, "offering" | "availability">) {
  const { t, format, plural } = useI18n();
  return (issue: QuantityIssue): string => {
    switch (issue) {
      case "above_per_reservation":
        return format(t.quantityErrors.above_per_reservation, { max: detail.offering.maxPerReservation });
      case "above_remaining":
        return plural(t.quantityErrors.above_remaining, detail.availability.remaining);
      default:
        return t.quantityErrors[issue];
    }
  };
}
