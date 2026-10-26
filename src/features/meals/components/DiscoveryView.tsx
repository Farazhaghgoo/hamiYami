"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useDemoQuery } from "@/data/demo/DemoProvider";
import { DIETARY_TAGS, type DietaryTag } from "@/domain/food-info";
import type { MenuWindow } from "@/domain/menu-window";
import { eur } from "@/domain/money";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/Icon";
import {
  discoverMeals,
  EMPTY_FILTERS,
  filtersToSearchParams,
  groupByDay,
  hasActiveFilters,
  SORT_ORDERS,
  type DiscoveryFilters,
  type DiscoveryResult,
  type SortOrder,
} from "../discovery";
import { MealCard } from "./MealCard";
import gridStyles from "./MealGrid.module.css";
import styles from "./DiscoveryView.module.css";

export function DiscoveryView({
  menu,
  initialFilters,
  initialResult,
}: {
  menu: MenuWindow;
  initialFilters: DiscoveryFilters;
  initialResult: DiscoveryResult;
}) {
  const { t, format, plural, shortDate, date, money, href } = useI18n();
  const [filters, setFilters] = useState(initialFilters);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();

  const { data: result } = useDemoQuery(
    `discover:${JSON.stringify(filters)}`,
    (repos, now) => discoverMeals(repos.catalog, menu, filters, now),
    initialResult,
  );

  const pilot = result.neighborhoods.find((n) => n.isPilot) ?? null;
  const browsingPilot = result.neighborhood?.isPilot ?? false;
  const active = hasActiveFilters(filters, pilot?.id ?? null);
  const secondaryCount = filters.diet.length + (filters.maxPriceCents !== null ? 1 : 0);
  const sortLabels: Record<SortOrder, string> = {
    time: t.meals.sortTime,
    price_asc: t.meals.sortPriceAsc,
    price_desc: t.meals.sortPriceDesc,
  };

  function update(next: Partial<DiscoveryFilters>) {
    const merged = { ...filters, ...next };
    setFilters(merged);
    // Filters live in the URL so results can be shared and survive reloads. They never hold
    // personal data. Next.js keeps useSearchParams in sync with history.replaceState.
    const query = filtersToSearchParams(merged).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  function resetFilters() {
    // Clearing filters keeps the chosen order: sorting is not filtering.
    update({ ...EMPTY_FILTERS, sort: filters.sort });
  }

  return (
    <div className={styles.layout}>
      <section className={styles.filters} aria-labelledby={`${panelId}-title`}>
        <h2 id={`${panelId}-title`} className="visually-hidden">
          {t.meals.filtersTitle}
        </h2>

        <div className={styles.primaryFilters}>
          <div className={styles.neighborhood}>
            <label htmlFor={`${panelId}-nb`} className={styles.label}>
              {t.meals.neighborhood}
            </label>
            <select
              id={`${panelId}-nb`}
              className={styles.select}
              value={filters.neighborhood ?? pilot?.id ?? ""}
              onChange={(event) =>
                update({ neighborhood: event.target.value === pilot?.id ? null : event.target.value })
              }
            >
              {result.neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {format(n.isPilot ? t.meals.neighborhoodPilot : t.meals.neighborhoodLater, { name: n.name })}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.dates}>
            <legend className={styles.label}>{t.meals.date}</legend>
            <div className={styles.chips}>
              <label className={styles.chip}>
                <input
                  type="radio"
                  name="date"
                  value=""
                  checked={filters.date === null}
                  onChange={() => update({ date: null })}
                />
                <span>{t.meals.allDates}</span>
              </label>
              {menu.dates.map((date) => (
                <label key={date} className={styles.chip}>
                  <input
                    type="radio"
                    name="date"
                    value={date}
                    checked={filters.date === date}
                    onChange={() => update({ date })}
                  />
                  <span>
                    {shortDate(date)}
                    <small>{plural(t.meals.dateCount, result.countsByDate[date] ?? 0)}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <button
          type="button"
          className={styles.panelToggle}
          aria-expanded={panelOpen}
          aria-controls={`${panelId}-panel`}
          onClick={() => setPanelOpen((open) => !open)}
        >
          {t.meals.filtersTitle}
          {secondaryCount ? <span className={styles.count}>{secondaryCount}</span> : null}
          <Icon name={panelOpen ? "minus" : "plus"} />
        </button>

        <div id={`${panelId}-panel`} className={styles.panel} data-open={panelOpen}>
          <fieldset className={styles.group}>
            <legend className={styles.label}>{t.meals.dietary}</legend>
            {DIETARY_TAGS.map((tag) => (
              <label key={tag} className={styles.check}>
                <input
                  type="checkbox"
                  name="diet"
                  value={tag}
                  checked={filters.diet.includes(tag)}
                  onChange={(event) =>
                    update({
                      diet: event.target.checked
                        ? [...filters.diet, tag]
                        : filters.diet.filter((d): d is DietaryTag => d !== tag),
                    })
                  }
                />
                {t.food.dietary[tag]}
              </label>
            ))}
            <p className={styles.note} id={`${panelId}-diet-note`}>
              {t.meals.dietaryNote}
            </p>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.label}>{t.meals.price}</legend>
            <label className={styles.check}>
              <input
                type="radio"
                name="maxPrice"
                value=""
                checked={filters.maxPriceCents === null}
                onChange={() => update({ maxPriceCents: null })}
              />
              {t.meals.anyPrice}
            </label>
            {result.priceOptions.map((cents) => (
              <label key={cents} className={styles.check}>
                <input
                  type="radio"
                  name="maxPrice"
                  value={cents}
                  checked={filters.maxPriceCents === cents}
                  onChange={() => update({ maxPriceCents: cents })}
                />
                {format(t.meals.upTo, { price: money(eur(cents)) })}
              </label>
            ))}
          </fieldset>
        </div>

        {active ? (
          <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={resetFilters}>
            {t.meals.reset}
          </button>
        ) : null}
      </section>

      {/* Labelled without a heading so the day headings below can be h2 and dish titles h3. */}
      <section className={styles.results} aria-label={t.meals.gridLabel}>
        <div className={styles.resultsBar}>
          <p className={styles.resultCount} role="status">
            {plural(t.meals.results, result.cards.length)}
          </p>
          <div className={styles.sort}>
            <label htmlFor={`${panelId}-sort`} className={styles.sortLabel}>
              {t.meals.sortLabel}
            </label>
            <select
              id={`${panelId}-sort`}
              className={styles.select}
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortOrder })}
            >
              {SORT_ORDERS.map((order) => (
                <option key={order} value={order}>
                  {sortLabels[order]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!browsingPilot && result.neighborhood ? (
          <div className={styles.empty}>
            <Icon name="pin" className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>{format(t.meals.notYetTitle, { name: result.neighborhood.name })}</h2>
            <p>{t.meals.notYetText}</p>
            <div className={styles.emptyActions}>
              <Link href={href("/waitlist")} className={buttonClass()}>
                {t.meals.notYetCta}
              </Link>
              {pilot ? (
                <button type="button" className={buttonClass({ variant: "secondary" })} onClick={resetFilters}>
                  {format(t.meals.backToPilot, { name: pilot.name })}
                </button>
              ) : null}
            </div>
          </div>
        ) : result.cards.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="search" className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>{t.meals.noResultsTitle}</h2>
            <p>{t.meals.noResultsText}</p>
            <button type="button" className={buttonClass({ variant: "secondary" })} onClick={resetFilters}>
              {t.meals.reset}
            </button>
          </div>
        ) : filters.sort !== "time" ? (
          // Sorted by price: one list across the week, so cards show their pickup day again.
          <ul className={gridStyles.grid}>
            {result.cards.map((card, index) => (
              <li key={card.offeringId}>
                <MealCard card={card} priority={index < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.days}>
            {groupByDay(result.cards).map((group, groupIndex) => {
              const headingId = `${panelId}-day-${group.date}`;
              const label = date(group.date);
              return (
                <section key={group.date} className={styles.day} aria-labelledby={headingId}>
                  <h2 id={headingId} className={styles.dayTitle}>
                    {group.date === menu.dates[0] ? <span className={styles.dayRelative}>{t.meals.tomorrow}</span> : null}{" "}
                    <span>{label.charAt(0).toUpperCase() + label.slice(1)}</span>{" "}
                    <span className={styles.dayCount}>{plural(t.meals.dateCount, group.cards.length)}</span>
                  </h2>
                  <ul className={gridStyles.grid}>
                    {group.cards.map((card, index) => (
                      <li key={card.offeringId}>
                        {/* The day is in the heading, so cards show only the pickup times. */}
                        <MealCard card={card} showDate={false} priority={groupIndex === 0 && index < 2} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
