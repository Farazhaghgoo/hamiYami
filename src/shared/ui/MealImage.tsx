"use client";

import Image from "next/image";
import { useState } from "react";
import type { MealImage as MealImageData } from "@/domain/catalog";
import { pickText } from "@/domain/localized";
import { useI18n } from "@/i18n/I18nProvider";
import { Icon } from "./Icon";
import styles from "./MealImage.module.css";

/**
 * Meal photos always use a 4:3 frame. Dishes without a photo, or whose photo fails to load, show a
 * neutral placeholder: never a different dish's photo.
 */
export function MealImage({
  image,
  title,
  sizes,
  priority = false,
  className,
}: {
  image: MealImageData | null;
  title: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [failed, setFailed] = useState(false);
  const frame = [styles.frame, className].filter(Boolean).join(" ");

  if (!image || failed) {
    return (
      <div className={`${frame} ${styles.placeholder}`} role="img" aria-label={`${title}: ${t.card.noPhoto}`}>
        <Icon name="pot" className={styles.placeholderIcon} />
        <span className={styles.placeholderText} aria-hidden="true">
          {t.card.noPhoto}
        </span>
      </div>
    );
  }

  return (
    <div className={frame}>
      <Image
        src={image.src}
        alt={pickText(image.alt, locale)}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
        className={styles.image}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
