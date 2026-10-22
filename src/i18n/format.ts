import { intlLocale, type Locale } from "./config";

/** Replaces {name} placeholders. Missing values are left visible so they are noticed in review. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export interface PluralForms {
  one: string;
  other: string;
}

const pluralRules: Partial<Record<Locale, Intl.PluralRules>> = {};

/** Picks the plural form for a count and fills in {count}. */
export function plural(forms: PluralForms, count: number, locale: Locale, values: Record<string, string | number> = {}): string {
  pluralRules[locale] ??= new Intl.PluralRules(intlLocale[locale]);
  const form = pluralRules[locale].select(count) === "one" ? forms.one : forms.other;
  return format(form, { count, ...values });
}
