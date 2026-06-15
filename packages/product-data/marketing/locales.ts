export const MARKETING_LOCALES = ["en", "af", "zu", "fr", "pt", "es"] as const;

export type MarketingLocale = (typeof MARKETING_LOCALES)[number];

export const DEFAULT_MARKETING_LOCALE: MarketingLocale = "en";

export interface MarketingLocaleMeta {
  code: MarketingLocale;
  label: string;
  nativeName: string;
}

export const MARKETING_LOCALE_META: MarketingLocaleMeta[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "af", label: "Afrikaans", nativeName: "Afrikaans" },
  { code: "zu", label: "isiZulu", nativeName: "isiZulu" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "es", label: "Spanish", nativeName: "Español" },
];

export function isMarketingLocale(value: string | null | undefined): value is MarketingLocale {
  return typeof value === "string" && MARKETING_LOCALES.includes(value as MarketingLocale);
}

export function normaliseMarketingLocale(value: string | null | undefined): MarketingLocale {
  return isMarketingLocale(value) ? value : DEFAULT_MARKETING_LOCALE;
}

export function marketingLocaleMeta(code: MarketingLocale): MarketingLocaleMeta {
  const found = MARKETING_LOCALE_META.find((entry) => entry.code === code);
  return found ? found : MARKETING_LOCALE_META[0];
}
