import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { I18n } from "@/i18n/i18n";
import { SiteNav } from "./SiteNav";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ i18n }: { i18n: I18n }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href={i18n.href("/")} className={styles.brand} aria-label={i18n.t.common.brandHome}>
          <Image src="/assets/brand/hamiyami-wordmark.svg" alt="HamiYami" width={1642} height={576} priority />
        </Link>
        <Suspense>
          <SiteNav />
        </Suspense>
      </div>
    </header>
  );
}
