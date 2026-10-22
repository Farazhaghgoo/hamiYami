"use client";

import type { Meal } from "@/domain/catalog";
import { useI18n } from "@/i18n/I18nProvider";
import { Icon } from "@/shared/ui/Icon";
import styles from "./OfferingDetail.module.css";

/**
 * Allergens and dietary preferences, kept visibly separate. Dietary tags never imply the absence
 * of an allergen, and the cross-contact note is always shown.
 */
export function FoodInfo({ meal }: { meal: Meal }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="allergens-title" className={`${styles.section} ${styles.allergens}`}>
      <h2 id="allergens-title">
        <Icon name="alert" />
        {t.detail.allergens}
      </h2>
      <dl className={styles.details}>
        <div>
          <dt>{t.detail.contains}</dt>
          <dd>
            {meal.allergens.length ? (
              <ul className={styles.allergenList}>
                {meal.allergens.map((a) => (
                  <li key={a}>{t.food.allergens[a]}</li>
                ))}
              </ul>
            ) : (
              t.detail.noAllergens
            )}
          </dd>
        </div>
        {meal.mayContain.length ? (
          <div>
            <dt>{t.detail.mayContain}</dt>
            <dd>
              <ul className={styles.allergenList}>
                {meal.mayContain.map((a) => (
                  <li key={a}>{t.food.allergens[a]}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t.detail.dietary}</dt>
          <dd>{meal.dietary.length ? meal.dietary.map((d) => t.food.dietary[d]).join(", ") : t.detail.noDietary}</dd>
        </div>
      </dl>
      <p className={styles.note}>{t.detail.allergenNote}</p>
    </section>
  );
}
