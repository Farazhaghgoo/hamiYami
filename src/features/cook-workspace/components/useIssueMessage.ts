"use client";

import { eur } from "@/domain/money";
import { OFFERING_LIMITS } from "@/domain/offering";
import { useI18n } from "@/i18n/I18nProvider";
import type { FieldIssue } from "../forms";

/** Translates validation codes from the workspace forms into messages. */
export function useIssueMessage() {
  const { t, format, money } = useI18n();
  const v = t.validation;
  return (issue: FieldIssue | undefined, values: Record<string, number> = {}): string | undefined => {
    if (!issue) return undefined;
    switch (issue.code) {
      case "required":
        return v.required;
      case "too_short":
        return format(v.tooShort, { min: issue.min ?? 0 });
      case "too_long":
        return format(v.tooLong, { max: issue.max ?? 0 });
      case "invalid_date":
        return v.invalidDate;
      case "date_out_of_range":
        return v.dateOutOfRange;
      case "invalid_time":
        return v.invalidTime;
      case "window_outside_hours":
        return v.windowOutsideHours;
      case "window_too_short":
        return v.windowTooShort;
      case "window_too_long":
        return v.windowTooLong;
      case "invalid_price":
        return format(v.invalidPrice, {
          min: money(eur(OFFERING_LIMITS.priceMinCents)),
          max: money(eur(OFFERING_LIMITS.priceMaxCents)),
        });
      case "invalid_integer":
        return v.invalidInteger;
      case "portion_size_range":
        return v.portionSizeRange;
      case "capacity_range":
        return v.capacityRange;
      case "max_per_reservation_range":
        return v.maxPerReservationRange;
      case "max_above_capacity":
        return v.maxAboveCapacity;
      case "capacity_below_reserved":
        return format(v.capacityBelowReserved, { count: values.reserved ?? 0 });
      case "meal_not_found":
        return v.mealNotFound;
      case "not_found":
        return v.notFound;
      default:
        return v.chooseOption;
    }
  };
}
