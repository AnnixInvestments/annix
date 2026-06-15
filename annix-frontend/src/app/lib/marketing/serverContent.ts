import "server-only";
import {
  type MarketingLocale,
  type MarketingSiteContent,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";
import { cookies, headers } from "next/headers";
import { fetchPublishedMarketingContent } from "./api";
import { MARKETING_LOCALE_COOKIE } from "./i18n/locale";

export async function marketingRequestLocale(): Promise<MarketingLocale> {
  const store = await cookies();
  const entry = store.get(MARKETING_LOCALE_COOKIE);
  const cookieValue = entry ? entry.value : null;
  return normaliseMarketingLocale(cookieValue);
}

async function marketingServerApiBase(): Promise<string | null> {
  const store = await headers();
  const host = (store.get("host") ?? "").trim();
  if (host.length === 0) {
    return null;
  }
  const hostLower = host.toLowerCase();
  const isLocal = hostLower.startsWith("localhost") || hostLower.startsWith("127.0.0.1");
  const protocol = isLocal ? "http" : (store.get("x-forwarded-proto") ?? "https");
  return `${protocol}://${host}/api`;
}

export async function loadMarketingContent(): Promise<{
  content: MarketingSiteContent;
  locale: MarketingLocale;
}> {
  const locale = await marketingRequestLocale();
  const base = await marketingServerApiBase();
  const content = await fetchPublishedMarketingContent(locale, base);
  return { content, locale };
}
