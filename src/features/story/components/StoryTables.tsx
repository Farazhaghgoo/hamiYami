"use client";

import type { ReactNode } from "react";
import { pickText } from "@/domain/localized";
import { eur } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";
import type { StoryDish, StoryOffering } from "../data";
import { eveningLoads } from "./StoryCharts";
import styles from "./StoryTables.module.css";

/** The numbers behind a chart, as a table: the chart is never the only way to read them. */
function DataTable({ head, rows }: { head: string[]; rows: { key: string; cells: ReactNode[] }[] }) {
  const { t } = useI18n();
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{t.story.solution.charts.dataToggle}</summary>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {head.map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={index}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function OfferingsTable({ offerings }: { offerings: StoryOffering[] }) {
  const { t, locale, money, shortDate } = useI18n();
  const c = t.story.solution.charts;
  return (
    <DataTable
      head={[c.colDish, c.colDay, c.colCook, c.colPrice]}
      rows={offerings.map((o) => ({
        key: o.offeringId,
        cells: [pickText(o.mealTitle, locale), shortDate(o.date), o.cookName, money(eur(o.priceCents))],
      }))}
    />
  );
}

export function DishesTable({ dishes }: { dishes: StoryDish[] }) {
  const { t, locale, format, money } = useI18n();
  const c = t.story.solution.charts;
  return (
    <DataTable
      head={[c.colDish, c.colPortion, c.colPrice, c.colPer100]}
      rows={dishes.map((d) => ({
        key: d.mealId,
        cells: [
          pickText(d.title, locale),
          `${d.amount} ${d.unit}`,
          money(eur(d.priceCents)),
          format(t.card.unitPrice, { price: money(eur(d.unitPriceCents)), unit: d.unit }),
        ],
      }))}
    />
  );
}

export function EveningsTable({ offerings }: { offerings: StoryOffering[] }) {
  const { t, shortDate } = useI18n();
  const c = t.story.solution.charts;
  return (
    <DataTable
      head={[c.colDay, c.colReserved, c.colCapacity]}
      rows={eveningLoads(offerings).map((load) => ({
        key: load.date,
        cells: [shortDate(load.date), load.reserved, load.capacity],
      }))}
    />
  );
}
