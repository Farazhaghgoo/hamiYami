import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Notice.module.css";

export type NoticeTone = "info" | "demo" | "warning" | "success" | "error";

const ICONS: Record<NoticeTone, IconName> = {
  info: "info",
  demo: "info",
  warning: "alert",
  success: "check",
  error: "alert",
};

/**
 * A highlighted message. Pass `role="status"` for messages that appear after an action, or
 * `role="alert"` for errors that need immediate attention; static notices need no role.
 */
export function Notice({
  tone = "info",
  title,
  children,
  role,
  className,
  id,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  role?: "status" | "alert";
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} role={role} className={[styles.notice, styles[tone], className].filter(Boolean).join(" ")}>
      <Icon name={ICONS[tone]} className={styles.icon} />
      <div className={styles.body}>
        {title ? <strong className={styles.title}>{title}</strong> : null} {children}
      </div>
    </div>
  );
}
