export type { MarketingLocale, MarketingLocaleMeta } from "@annix/product-data/marketing";
export {
  DEFAULT_MARKETING_LOCALE,
  isMarketingLocale,
  MARKETING_LOCALE_META,
  MARKETING_LOCALES,
  marketingLocaleMeta,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";
export type { MarketingMessageNamespace, MarketingMessages } from "./catalog";
export { MARKETING_MESSAGES } from "./catalog";
export {
  localeFromSearch,
  MARKETING_LOCALE_COOKIE,
  readLocaleCookie,
  writeLocaleCookie,
} from "./locale";
export { MarketingHreflangLinks } from "./MarketingHreflangLinks";
export { MarketingI18nProvider, useMarketingLocale } from "./MarketingI18nProvider";
export { MarketingLanguageSwitcher } from "./MarketingLanguageSwitcher";
export { useMarketingTranslations } from "./useMarketingTranslations";
