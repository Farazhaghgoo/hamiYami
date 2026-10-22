"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass, buttonRowClass } from "@/shared/ui/button";
import styles from "./content.module.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t, href } = useI18n();
  return (
    <main id="main" tabIndex={-1} className="container">
      <div className={styles.centered}>
        <h1>{t.errorPage.title}</h1>
        <p className={styles.lead}>{t.errorPage.text}</p>
        <div className={buttonRowClass}>
          <button type="button" className={buttonClass()} onClick={reset}>
            {t.errorPage.retry}
          </button>
          <Link href={href("/")} className={buttonClass({ variant: "secondary" })}>
            {t.notFound.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
