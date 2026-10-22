import { formatMoney, type Money } from "@/domain/money";
import { formatCivilDate, formatInstantInRome, type CivilDate } from "@/domain/time";
import { intlLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionaries";
import { format, plural, type PluralForms } from "./format";

/** Locale-aware helpers shared by server and client components. */
export interface I18n {
  locale: Locale;
  t: Dictionary;
  format: typeof format;
  plural(forms: PluralForms, count: number, values?: Record<string, string | number>): string;
  money(money: Money): string;
  date(date: CivilDate, options?: Intl.DateTimeFormatOptions): string;
  shortDate(date: CivilDate): string;
  instant(iso: string): string;
  /** Prefixes an in-app path with the current locale. */
  href(path: string): string;
}

export function createI18n(locale: Locale, t: Dictionary): I18n {
  const tag = intlLocale[locale];
  return {
    locale,
    t,
    format,
    plural: (forms, count, values) => plural(forms, count, locale, values),
    money: (money) => formatMoney(money, tag),
    date: (date, options) => formatCivilDate(date, tag, options),
    shortDate: (date) => formatCivilDate(date, tag, { weekday: "short", day: "numeric", month: "short" }),
    instant: (iso) => formatInstantInRome(new Date(iso), tag),
    href: (path) => `/${locale}${path === "/" ? "" : path}`,
  };
}
