import "server-only";
import {
  type MarketingLocale,
  type MarketingSiteContent,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";
import { cookies } from "next/headers";
import { fetchPublishedMarketingContent } from "./api";
import { MARKETING_LOCALE_COOKIE } from "./i18n/locale";

export async function marketingRequestLocale(): Promise<MarketingLocale> {
  const store = await cookies();
  const entry = store.get(MARKETING_LOCALE_COOKIE);
  const cookieValue = entry ? entry.value : null;
  return normaliseMarketingLocale(cookieValue);
}

export async function loadMarketingContent(): Promise<{
  content: MarketingSiteContent;
  locale: MarketingLocale;
}> {
  const locale = await marketingRequestLocale();
  const content = await fetchPublishedMarketingContent(locale);
  return { content, locale };
}
