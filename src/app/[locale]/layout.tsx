import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@/i18n/config";
import { figtree, fraunces } from "../fonts";
import "@/shared/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "HamiYami", template: "%s · HamiYami" },
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

export const viewport: Viewport = {
  themeColor: "#FFF8EF",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  // Nonce-based CSP requires a fresh render per request (see src/proxy.ts).
  await connection();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${fraunces.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
