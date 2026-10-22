"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { buttonClass } from "./button";
import styles from "./ConfirmDialog.module.css";

/**
 * A modal confirmation built on the native <dialog> element, which provides the focus trap,
 * Escape to close and the inert background. Focus returns to the element that opened it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "primary",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "primary" | "secondary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onClose={() => {
        onClose();
        returnFocus.current?.focus();
      }}
      onClick={(event) => {
        // A click on the <dialog> element itself is a click on the backdrop.
        if (event.target === ref.current) ref.current.close();
      }}
    >
      <div className={styles.inner}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children ? (
          <div id={bodyId} className={styles.body}>
            {children}
          </div>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={buttonClass({ variant: tone })} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button type="button" className={buttonClass({ variant: "quiet" })} onClick={() => ref.current?.close()}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
