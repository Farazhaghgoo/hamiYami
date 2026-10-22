"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/data/demo/DemoProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Icon } from "@/shared/ui/Icon";
import { Notice } from "@/shared/ui/Notice";
import styles from "./DemoBanner.module.css";

/** Always-visible statement that this is a demo, plus the reset control and storage warnings. */
export function DemoBanner() {
  const { t, href } = useI18n();
  const { issue, dismissIssue, reset } = useDemo();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  const issueText =
    issue === "corrupted"
      ? t.demo.issueCorrupted
      : issue === "unsupported_version"
        ? t.demo.issueVersion
        : issue === "unavailable"
          ? t.demo.issueUnavailable
          : null;

  return (
    <>
      <div className={styles.banner}>
        <div className={`container ${styles.inner}`}>
          <p className={styles.text}>
            <Icon name="info" />
            <strong>{t.demo.banner}</strong>
            <span className={styles.detail}>{t.demo.bannerDetail}</span>
          </p>
          <div className={styles.actions}>
            <Link href={href("/demo")} className={styles.link}>
              {t.demo.learnMore}
            </Link>
            <button type="button" className={styles.reset} onClick={() => setConfirming(true)}>
              <Icon name="refresh" />
              {t.demo.reset}
            </button>
          </div>
        </div>
      </div>

      <div className={`container ${styles.messages}`} aria-live="polite">
        {issueText ? (
          <Notice tone="warning" className={styles.message}>
            {issueText}{" "}
            {issue !== "unavailable" ? (
              <button type="button" className={styles.dismiss} onClick={dismissIssue}>
                {t.demo.dismiss}
              </button>
            ) : null}
          </Notice>
        ) : null}
        {message ? (
          <Notice tone="success" className={styles.message}>
            {message}{" "}
            <button type="button" className={styles.dismiss} onClick={() => setMessage("")}>
              {t.demo.dismiss}
            </button>
          </Notice>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        title={t.demo.resetTitle}
        confirmLabel={t.demo.resetConfirm}
        cancelLabel={t.common.cancel}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          reset();
          setConfirming(false);
          setMessage(t.demo.resetDone);
        }}
      >
        <p>{t.demo.resetBody}</p>
      </ConfirmDialog>
    </>
  );
}
