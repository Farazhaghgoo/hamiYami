import "server-only";
import { notFound } from "next/navigation";
import { isLocale } from "./config";
import { getDictionary } from "./dictionaries";
import { createI18n, type I18n } from "./i18n";

/** Resolves the locale route parameter for server components; unknown locales are a 404. */
export async function getI18n(params: Promise<{ locale: string }>): Promise<I18n> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return createI18n(locale, getDictionary(locale));
}
