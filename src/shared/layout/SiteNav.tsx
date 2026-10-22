"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { switchLocalePath, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { Icon } from "@/shared/ui/Icon";
import styles from "./SiteHeader.module.css";

interface NavItem {
  href: string;
  label: string;
  /** Paths (after the locale) that count as "this section" for aria-current. */
  match: string;
}

export function SiteNav() {
  const { t, locale, href } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const items: NavItem[] = [
    { href: href("/meals"), label: t.nav.meals, match: "/meals" },
    { href: href("/become-a-cook"), label: t.nav.becomeCook, match: "/become-a-cook" },
    { href: href("/reservations"), label: t.nav.reservations, match: "/reservations" },
    { href: href("/cook-workspace"), label: t.nav.workspace, match: "/cook-workspace" },
  ];
  const sectionPath = pathname.replace(/^\/(it|en)/, "") || "/";
  const otherLocale: Locale = locale === "it" ? "en" : "it";
  const query = searchParams.toString();
  const switchHref = `${switchLocalePath(pathname, otherLocale)}${query ? `?${query}` : ""}`;

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label={t.nav.label}
      data-open={open}
      onBlur={(event) => {
        if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <a className={styles.language} href={switchHref} hrefLang={otherLocale} lang={otherLocale}>
        <Icon name="globe" />
        {t.nav.switchTo}
      </a>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.bars} aria-hidden="true" />
        {t.nav.menu}
      </button>
      <ul id="site-menu" className={styles.menu}>
        {items.map((item) => {
          const current = sectionPath === item.match || sectionPath.startsWith(`${item.match}/`);
          return (
            <li key={item.match}>
              <Link href={item.href} className={styles.link} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
