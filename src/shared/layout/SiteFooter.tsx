import Image from "next/image";
import Link from "next/link";
import type { I18n } from "@/i18n/i18n";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ i18n }: { i18n: I18n }) {
  const { t, href } = i18n;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Link href={href("/")} aria-label={t.common.brandHome} className={styles.logo}>
            <Image src="/assets/brand/hamiyami-wordmark-light.svg" alt="HamiYami" width={1642} height={576} />
          </Link>
          <p>{t.footer.tagline}</p>
          <p className={styles.status}>{t.footer.status}</p>
        </div>
        <nav aria-label={t.footer.footerNav} className={styles.columns}>
          <div>
            <h2 className={styles.heading}>{t.footer.explore}</h2>
            <ul>
              <li><Link href={href("/meals")}>{t.nav.meals}</Link></li>
              <li><Link href={href("/reservations")}>{t.nav.reservations}</Link></li>
              <li><Link href={href("/become-a-cook")}>{t.nav.becomeCook}</Link></li>
              <li><Link href={href("/cook-workspace")}>{t.nav.workspace}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className={styles.heading}>{t.footer.project}</h2>
            <ul>
              <li><Link href={href("/story")}>{t.footer.story}</Link></li>
              <li><Link href={href("/trust")}>{t.footer.trust}</Link></li>
              <li><Link href={href("/demo")}>{t.footer.aboutDemo}</Link></li>
              <li><Link href={href("/waitlist")}>{t.footer.waitlist}</Link></li>
              <li><Link href={href("/privacy")}>{t.footer.privacy}</Link></li>
            </ul>
          </div>
        </nav>
        <p className={styles.copyright}>© {new Date().getFullYear()} HamiYami</p>
      </div>
    </footer>
  );
}
