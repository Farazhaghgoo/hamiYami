"use client";

import { useDemoQuery } from "@/data/demo/DemoProvider";
import type { MenuWindow } from "@/domain/menu-window";
import { buildMealCards, type MealCardView } from "@/features/meals/discovery";
import { MealCard } from "@/features/meals/components/MealCard";
import gridStyles from "@/features/meals/components/MealGrid.module.css";
import { useI18n } from "@/i18n/I18nProvider";

export function CookUpcoming({ cookId, menu, initial }: { cookId: string; menu: MenuWindow; initial: MealCardView[] }) {
  const { t } = useI18n();
  const { data: cards } = useDemoQuery(
    `cook-upcoming:${cookId}`,
    async (repos, now) =>
      buildMealCards(repos.catalog, await repos.catalog.listOfferings({ from: menu.from, to: menu.to, cookId }), now),
    initial,
  );
  if (!cards.length) return <p>{t.cook.noUpcoming}</p>;
  return (
    <ul className={gridStyles.grid}>
      {cards.map((card) => (
        <li key={card.offeringId}>
          <MealCard card={card} />
        </li>
      ))}
    </ul>
  );
}
