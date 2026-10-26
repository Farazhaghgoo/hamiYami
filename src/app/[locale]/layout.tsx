import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { DemoProvider } from "@/data/demo/DemoProvider";
import { todayInRome } from "@/domain/menu-window";
import { intlLocale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getI18n } from "@/i18n/server";
import { DemoBanner } from "@/shared/layout/DemoBanner";
import { SiteFooter } from "@/shared/layout/SiteFooter";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { localeUrl, openGraphBase, siteUrl } from "@/shared/seo/metadata";
import { figtree, fraunces } from "../fonts";
import "@/shared/styles/globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const i18n = await getI18n(params);
  const { t } = i18n;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: "HamiYami — demo", template: "%s · HamiYami" },
    description: t.meta.siteDescription,
    openGraph: { ...openGraphBase(i18n), description: t.meta.siteDescription },
    // Pages opt in to indexing through pageMetadata(); anything that doesn't (errors, utility pages) stays out.
    robots: { index: false, follow: true },
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

/** schema.org Organization and WebSite, so search and answer engines can identify the site. */
function structuredData(locale: keyof typeof intlLocale, description: string) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "HamiYami",
        url: `${base}/`,
        logo: `${base}/assets/brand/hamiyami-icon-512.png`,
        description,
      },
      {
        "@type": "WebSite",
        "@id": `${localeUrl(locale, "/")}#website`,
        name: "HamiYami",
        url: localeUrl(locale, "/"),
        inLanguage: intlLocale[locale],
        description,
        publisher: { "@id": `${base}/#organization` },
      },
    ],
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  // The nonce-based Content-Security-Policy requires a fresh render per request (src/proxy.ts).
  await connection();
  const i18n = await getI18n(params);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // The demo menu is generated relative to "today" in Rome; the browser receives the same anchor
  // so server and client render identical dates whatever the visitor's clock or time zone.
  const anchor = todayInRome();
  // "<" is escaped so no dictionary text can close the script element.
  const jsonLd = JSON.stringify(structuredData(i18n.locale, i18n.t.meta.siteDescription)).replace(/</g, "\u003c");

  return (
    <html lang={i18n.locale} className={`${fraunces.variable} ${figtree.variable}`}>
      <body>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLd }} />
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
