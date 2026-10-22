import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { DemoProvider } from "@/data/demo/DemoProvider";
import { todayInRome } from "@/domain/menu-window";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getI18n } from "@/i18n/server";
import { DemoBanner } from "@/shared/layout/DemoBanner";
import { SiteFooter } from "@/shared/layout/SiteFooter";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { figtree, fraunces } from "../fonts";
import "@/shared/styles/globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: { default: "HamiYami — demo", template: "%s · HamiYami" },
    description: t.meta.siteDescription,
    // Prelaunch demo: keep it out of search results until the pilot checklist in README.md is done.
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#FFF8EF",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  // The nonce-based Content-Security-Policy requires a fresh render per request (src/proxy.ts).
  await connection();
  const i18n = await getI18n(params);
  // The demo menu is generated relative to "today" in Rome; the browser receives the same anchor
  // so server and client render identical dates whatever the visitor's clock or time zone.
  const anchor = todayInRome();

  return (
    <html lang={i18n.locale} className={`${fraunces.variable} ${figtree.variable}`}>
      <body>
        <I18nProvider locale={i18n.locale} dictionary={i18n.t}>
          <DemoProvider anchor={anchor}>
            <a className="skip-link" href="#main">
              {i18n.t.common.skipToContent}
            </a>
            <DemoBanner />
            <SiteHeader i18n={i18n} />
            {children}
            <SiteFooter i18n={i18n} />
          </DemoProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
