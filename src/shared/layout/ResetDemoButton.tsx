"use client";

import { useState } from "react";
import { useDemo } from "@/data/demo/DemoProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";

/** A standalone reset control for pages that explain the demo. */
export function ResetDemoButton() {
  const { t } = useI18n();
  const { reset } = useDemo();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setOpen(true)}>
        <Icon name="refresh" />
        {t.demo.reset}
      </button>
      <div aria-live="polite">{done ? <Notice tone="success">{t.demo.resetDone}</Notice> : null}</div>
      <ConfirmDialog
        open={open}
        title={t.demo.resetTitle}
        confirmLabel={t.demo.resetConfirm}
        cancelLabel={t.common.cancel}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          reset();
          setOpen(false);
          setDone(true);
        }}
      >
        <p>{t.demo.resetBody}</p>
      </ConfirmDialog>
    </>
  );
}
