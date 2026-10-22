"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "./forms.module.css";

export interface FieldErrorItem {
  /** id of the control the message belongs to */
  fieldId: string;
  message: string;
}

/**
 * Lists every problem after a failed submit, with links that move focus to each field.
 * Receives focus itself when it appears, so screen-reader and keyboard users land on it.
 */
export function ErrorSummary({ errors, focusKey }: { errors: FieldErrorItem[]; focusKey: number }) {
  const { t, format } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length) ref.current?.focus();
    // Re-focus on every failed submit, not on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  if (!errors.length) return null;
  return (
    <div ref={ref} className={styles.summary} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <p id="error-summary-title" className={styles.summaryTitle}>
        {errors.length === 1 ? t.common.errorSummaryOne : format(t.common.errorSummaryMany, { count: errors.length })}
      </p>
      <ul>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(error.fieldId)?.focus();
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
