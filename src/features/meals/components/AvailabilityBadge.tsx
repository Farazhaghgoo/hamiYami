"use client";

import type { Availability } from "@/domain/offering";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge } from "@/shared/ui/Badge";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const { t, plural } = useI18n();
  switch (availability.state) {
    case "available":
      return <Badge tone="green">{plural(t.card.available, availability.remaining)}</Badge>;
    case "low":
      return <Badge tone="warning">{plural(t.card.low, availability.remaining)}</Badge>;
    case "sold_out":
      return <Badge tone="tomato">{t.card.soldOut}</Badge>;
    case "closed":
      return <Badge tone="neutral">{t.card.closed}</Badge>;
    case "unpublished":
      return <Badge tone="neutral">{t.card.unpublished}</Badge>;
  }
}
