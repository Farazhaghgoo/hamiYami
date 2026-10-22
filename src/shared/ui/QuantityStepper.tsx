"use client";

import { Icon } from "./Icon";
import styles from "./QuantityStepper.module.css";

/**
 * A number input with large − / + buttons. The input stays editable so people can type a value;
 * the parent validates it and shows errors through `errorId`.
 */
export function QuantityStepper({
  id,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  describedBy,
  invalid,
}: {
  id: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
  decreaseLabel: string;
  increaseLabel: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const numeric = Number(value);
  const current = Number.isFinite(numeric) ? numeric : min;
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.step}
        onClick={() => current > min && onChange(String(Math.max(min, Math.floor(current) - 1)))}
        // aria-disabled (not disabled) keeps focus on the button when the limit is reached.
        aria-disabled={current <= min}
        aria-controls={id}
      >
        <Icon name="minus" />
        <span className="visually-hidden">{decreaseLabel}</span>
      </button>
      <input
        id={id}
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className={styles.step}
        onClick={() => current < max && onChange(String(Math.min(max, Math.floor(current) + 1)))}
        aria-disabled={current >= max}
        aria-controls={id}
      >
        <Icon name="plus" />
        <span className="visually-hidden">{increaseLabel}</span>
      </button>
    </div>
  );
}
