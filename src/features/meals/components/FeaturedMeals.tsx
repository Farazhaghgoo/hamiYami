"use client";

import { useDemoQuery } from "@/data/demo/DemoProvider";
import type { MenuWindow } from "@/domain/menu-window";
import { featuredMeals, type MealCardView } from "../discovery";
import { MealCard } from "./MealCard";
import gridStyles from "./MealGrid.module.css";

/** Homepage preview: refreshed with the visitor's own demo changes once the browser has loaded. */
export function FeaturedMeals({ menu, initial }: { menu: MenuWindow; initial: MealCardView[] }) {
  const { data: cards } = useDemoQuery("featured", (repos, now) => featuredMeals(repos.catalog, menu, now), initial);
  return (
    <ul className={`${gridStyles.grid} ${gridStyles.featured}`}>
      {cards.map((card) => (
        <li key={card.offeringId}>
          <MealCard card={card} />
        </li>
      ))}
    </ul>
  );
}
