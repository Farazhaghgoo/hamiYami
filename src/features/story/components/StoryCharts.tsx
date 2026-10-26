"use client";

import { useState, type CSSProperties } from "react";
import { pickText } from "@/domain/localized";
import { eur } from "@/domain/money";
import type { PriceStats } from "@/domain/pricing";
import type { CivilDate } from "@/domain/time";
import { intlLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { eveningLoads, type StoryData, type StoryDish, type StoryOffering } from "../data";
import styles from "./StoryCharts.module.css";

/*
 * The "how we solve it" charts, drawn with HTML and CSS. Each shows a single series in one data
 * colour (tomato), so its title names it and no legend is needed. Labels and values wear text
 * colours, and every chart's numbers are also in a table in the step beside it.
 */

type Vars = CSSProperties & Record<`--${string}`, string>;

export function MenuWeek({ dates, offerings }: { dates: CivilDate[]; offerings: StoryOffering[] }) {
  const { t, locale, shortDate, plural } = useI18n();
  const c = t.story.solution.charts;
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{c.menuTitle}</figcaption>
      <ol className={styles.week}>
        {dates.map((date) => {
          const dinners = offerings.filter((o) => o.date === date);
          return (
            <li key={date} className={styles.day}>
              <span className={styles.dayLabel}>{shortDate(date)}</span>
              {dinners.length ? (
                <ul className={styles.chips} aria-label={plural(c.dinners, dinners.length)}>
                  {dinners.map((o) => (
                    <li key={o.offeringId} className={styles.chip}>
                      <span className={styles.chipTitle}>{pickText(o.mealTitle, locale)}</span>
                      <span className={styles.chipMeta}>
                        {o.cookName} · {o.start}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className={styles.none}>{c.noDinners}</span>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

// Whole euros, so tick labels never need decimals.
const TICK_STEPS = [100, 200, 500, 1000, 2000, 5000];

/** A price axis with round ticks and half a step of room on each side of the data. */
function priceScale(minCents: number, maxCents: number) {
  const step = TICK_STEPS.find((s) => (maxCents - minCents + s) / s <= 6) ?? 10_000;
  const lo = Math.max(0, Math.floor((minCents - step / 2) / step) * step);
  const hi = Math.ceil((maxCents + step / 2) / step) * step;
  const ticks: number[] = [];
  for (let value = lo; value <= hi; value += step) ticks.push(value);
  return { ticks, x: (cents: number) => ((cents - lo) / (hi - lo)) * 100 };
}

/** Keeps a label above a mark inside the plot near its edges. */
function edge(x: number): "start" | "center" | "end" {
  return x < 25 ? "start" : x > 75 ? "end" : "center";
}

export function PriceStrip({ offerings, prices }: { offerings: StoryOffering[]; prices: PriceStats }) {
  const { t, locale, format, money, shortDate } = useI18n();
  const c = t.story.solution.charts;
  const [hovered, setHovered] = useState<string | null>(null);
  const { ticks, x } = priceScale(prices.minCents, prices.maxCents);
  const whole = new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  // Dinners at the same price stack upwards.
  const dots = [...offerings]
    .sort((a, b) => a.priceCents - b.priceCents || a.date.localeCompare(b.date))
    .map((o, index, sorted) => ({ ...o, stack: sorted.slice(0, index).filter((p) => p.priceCents === o.priceCents).length }));
  const tip = dots.find((d) => d.offeringId === hovered);
  const median = money(eur(prices.medianCents));

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{c.priceTitle}</figcaption>
      <div
        className={styles.strip}
        role="img"
        aria-label={`${c.priceTitle}: ${money(eur(prices.minCents))} – ${money(eur(prices.maxCents))}; ${format(c.median, { price: median })}`}
      >
        <div className={styles.plot}>
          <span className={styles.median} data-edge={edge(x(prices.medianCents))} style={{ "--x": `${x(prices.medianCents)}%` } as Vars}>
            <span className={styles.medianLabel}>{format(c.median, { price: median })}</span>
          </span>
          {dots.map((dot) => (
            <span
              key={dot.offeringId}
              className={styles.dotHit}
              style={{ "--x": `${x(dot.priceCents)}%`, "--stack": String(dot.stack) } as Vars}
              onPointerEnter={() => setHovered(dot.offeringId)}
              onPointerLeave={() => setHovered((current) => (current === dot.offeringId ? null : current))}
            >
              <span className={styles.dot} data-hovered={hovered === dot.offeringId || undefined} />
            </span>
          ))}
          {tip ? (
            <span
              className={styles.tooltip}
              data-edge={edge(x(tip.priceCents))}
              style={{ "--x": `${x(tip.priceCents)}%`, "--stack": String(tip.stack) } as Vars}
            >
              <strong>{pickText(tip.mealTitle, locale)}</strong>
              <span>
                {tip.cookName} · {shortDate(tip.date)}
              </span>
              <span className={styles.tooltipValue}>{money(eur(tip.priceCents))}</span>
            </span>
          ) : null}
        </div>
        <div className={styles.axis}>
          {ticks.map((tick) => (
            <span key={tick} className={styles.tick} style={{ "--x": `${x(tick)}%` } as Vars}>
              {whole.format(tick / 100)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function UnitPriceBars({ dishes }: { dishes: StoryDish[] }) {
  const { t, locale, format, money } = useI18n();
  const c = t.story.solution.charts;
  const top = Math.ceil(Math.max(...dishes.map((d) => d.unitPriceCents)) / 50) * 50;
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{c.unitTitle}</figcaption>
      <ul className={styles.bars}>
        {dishes.map((dish, index) => (
          <li key={dish.mealId} className={styles.barRow} style={{ "--i": String(index) } as Vars}>
            <span className={styles.barLabel}>
              <span className={styles.barName}>{pickText(dish.title, locale)}</span>
              <span className={styles.barMeta}>
                {dish.amount} {dish.unit} · {money(eur(dish.priceCents))}
              </span>
            </span>
            <span className={styles.barTrack}>
              <span className={styles.bar} style={{ "--f": String(dish.unitPriceCents / top) } as Vars} />
              <span className={styles.barValue}>
                {format(t.card.unitPrice, { price: money(eur(dish.unitPriceCents)), unit: dish.unit })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function ReservedMeters({ data }: { data: StoryData }) {
  const { t, format, shortDate } = useI18n();
  const c = t.story.solution.charts;
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{c.plannedTitle}</figcaption>
      <p className={styles.hero}>
        <span className={styles.heroValue}>{data.reservedTotal}</span>
        <span className={styles.heroOf}>{format(c.ofPlanned, { capacity: data.capacityTotal })}</span>
      </p>
      <ul className={styles.meters}>
        {eveningLoads(data.offerings).map((load, index) => (
          <li key={load.date} className={styles.meterRow} style={{ "--i": String(index) } as Vars}>
            <span className={styles.meterLabel}>{shortDate(load.date)}</span>
            <span className={styles.meter}>
              <span className={styles.meterFill} style={{ "--w": `${(load.reserved / load.capacity) * 100}%` } as Vars} />
            </span>
            <span className={styles.meterValue}>
              {format(c.reservedOf, { reserved: load.reserved, capacity: load.capacity })}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function StatTiles({ data }: { data: StoryData }) {
  const { t } = useI18n();
  const c = t.story.solution.charts;
  const tiles: { icon: IconName; value: number; label: string }[] = [
    { icon: "docSearch", value: data.allergenCount, label: c.statAllergens },
    { icon: "clock", value: data.slotMinutes, label: c.statSlot },
    { icon: "tag", value: data.pickupCodeLength, label: c.statCode },
    { icon: "calendar", value: data.cutoffHours, label: c.statCutoff },
  ];
  return (
    <ul className={styles.tiles}>
      {tiles.map((tile, index) => (
        <li key={tile.label} className={styles.tile} style={{ "--i": String(index) } as Vars}>
          <Icon name={tile.icon} className={styles.tileIcon} />
          <span className={styles.tileValue}>{tile.value}</span>
          <span className={styles.tileLabel}>{tile.label}</span>
        </li>
      ))}
    </ul>
  );
}
