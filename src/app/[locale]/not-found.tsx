"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { buttonClass } from "@/shared/ui/button";
import styles from "./content.module.css";

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <main id="main" tabIndex={-1} className="container">
      <div className={styles.centered}>
        <h1>{t.notFound.title}</h1>
        <p className={styles.lead}>{t.notFound.text}</p>
        <Link href={href("/")} className={buttonClass()}>
          {t.notFound.home}
        </Link>
      </div>
    </main>
  );
}
