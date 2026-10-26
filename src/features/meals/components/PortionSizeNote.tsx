"use client";

import type { PortionSize } from "@/domain/catalog";
import type { Money } from "@/domain/money";
import { unitPricePer100 } from "@/domain/pricing";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * "350 g · 2,57 €/100 g": the portion size and its price per 100 g or 100 ml, so customers can
 * compare dishes fairly when every cook sets their own price. Renders nothing without a size.
 */
export function PortionSizeNote({ size, price, className }: { size?: PortionSize; price: Money; className?: string }) {
  const { t, format, money } = useI18n();
  if (!size) return null;
  return (
    <span className={className}>
      {size.amount} {size.unit} · {format(t.card.unitPrice, { price: money(unitPricePer100(price, size)), unit: size.unit })}
    </span>
  );
}
