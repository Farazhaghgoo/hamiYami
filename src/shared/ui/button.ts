import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "light";
export type ButtonSize = "sm" | "md" | "lg";

/** Class names for anything that should look like a button: <button>, <Link> or <a>. */
export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}): string {
  return [
    styles.button,
    styles[variant],
    size !== "md" && styles[size],
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const buttonRowClass = styles.row;
