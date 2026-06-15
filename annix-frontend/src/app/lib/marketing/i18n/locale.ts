import {
  DEFAULT_MARKETING_LOCALE,
  isMarketingLocale,
  type MarketingLocale,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";

export const MARKETING_LOCALE_COOKIE = "annix_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hasDocument(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(document) would throw
  return typeof document !== "undefined";
}

export function readLocaleCookie(): MarketingLocale {
  if (!hasDocument()) {
    return DEFAULT_MARKETING_LOCALE;
  }
  const raw = document.cookie ? document.cookie : "";
  const match = raw
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${MARKETING_LOCALE_COOKIE}=`));
  const value = match ? decodeURIComponent(match.slice(MARKETING_LOCALE_COOKIE.length + 1)) : null;
  return normaliseMarketingLocale(value);
}

export function writeLocaleCookie(locale: MarketingLocale): void {
  if (!hasDocument()) {
    return;
  }
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not universally supported
  document.cookie = `${MARKETING_LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function localeFromSearch(search: string): MarketingLocale | null {
  const params = new URLSearchParams(search);
  const lang = params.get("lang");
  return isMarketingLocale(lang) ? lang : null;
}
