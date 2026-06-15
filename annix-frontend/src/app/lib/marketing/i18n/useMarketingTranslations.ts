"use client";

import { useCallback } from "react";
import {
  MARKETING_MESSAGES,
  type MarketingMessageNamespace,
  type MarketingMessages,
} from "./catalog";
import { useMarketingLocale } from "./MarketingI18nProvider";

export function useMarketingTranslations<N extends MarketingMessageNamespace>(namespace: N) {
  const localeContext = useMarketingLocale();
  const messages = localeContext.messages;
  return useCallback(
    (key: keyof MarketingMessages[N]): string => {
      const scoped = messages[namespace] as Record<string, string>;
      const fallback = MARKETING_MESSAGES.en[namespace] as Record<string, string>;
      const value = scoped ? scoped[key as string] : undefined;
      return value != null ? value : fallback[key as string];
    },
    [messages, namespace],
  );
}
