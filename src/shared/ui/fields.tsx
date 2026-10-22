import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";
import styles from "./forms.module.css";

/*
 * Form fields with persistent visible labels, optional hints and inline errors. Hints and errors
 * are linked through aria-describedby; invalid fields get aria-invalid.
 */

interface FieldFrame {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
}

function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Frame({ id, label, hint, error, optionalLabel, children }: FieldFrame & { children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label} {optionalLabel ? <span className={styles.optional}>{optionalLabel}</span> : null}
      </label>
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      <FieldError id={id} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p className={styles.error} id={`${id}-error`}>
      <Icon name="alert" />
      {error}
    </p>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  ...input
}: FieldFrame & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...input}
      />
    </Frame>
  );
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  ...textarea
}: FieldFrame & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      <textarea
        id={id}
        className={styles.textarea}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...textarea}
      />
    </Frame>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  children,
  ...select
}: FieldFrame & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      <select
        id={id}
        className={styles.select}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...select}
      >
        {children}
      </select>
    </Frame>
  );
}

export interface ChoiceOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

/** A group of checkboxes or radios in a fieldset with a legend. The first control gets `id`. */
export function ChoiceGroup({
  id,
  legend,
  hint,
  error,
  optionalLabel,
  type,
  name,
  options,
  value,
  onChange,
  grid = false,
}: {
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
  type: "checkbox" | "radio";
  name: string;
  options: ChoiceOption[];
  value: string[];
  onChange?: (value: string[]) => void;
  grid?: boolean;
}) {
  const describedById = describedBy(id, hint, error);
  return (
    <fieldset className={styles.fieldset} aria-describedby={describedById}>
      <legend className={styles.legend}>
        {legend} {optionalLabel ? <span className={styles.optional}>{optionalLabel}</span> : null}
      </legend>
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <div className={grid ? styles.choicesGrid : styles.choices}>
        {options.map((option, index) => (
          <label key={option.value} className={styles.choice}>
            <input
              id={index === 0 ? id : undefined}
              type={type}
              name={name}
              value={option.value}
              disabled={option.disabled}
              checked={value.includes(option.value)}
              onChange={(event) => {
                if (!onChange) return;
                if (type === "radio") onChange([option.value]);
                else
                  onChange(
                    event.target.checked ? [...value, option.value] : value.filter((v) => v !== option.value),
                  );
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={id} error={error} />
    </fieldset>
  );
}

export const formStyles = styles;
