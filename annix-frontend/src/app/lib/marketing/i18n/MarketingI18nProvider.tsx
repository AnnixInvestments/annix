"use client";

import { DEFAULT_MARKETING_LOCALE, type MarketingLocale } from "@annix/product-data/marketing";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MARKETING_MESSAGES, type MarketingMessages } from "./catalog";
import { localeFromSearch, readLocaleCookie, writeLocaleCookie } from "./locale";

interface MarketingI18nContextValue {
  locale: MarketingLocale;
  setLocale: (locale: MarketingLocale) => void;
  messages: MarketingMessages;
}

const MarketingI18nContext = createContext<MarketingI18nContextValue | null>(null);

export function MarketingI18nProvider(props: {
  children: ReactNode;
  locale?: MarketingLocale;
  initialLocale?: MarketingLocale;
  onLocaleChange?: (locale: MarketingLocale) => void;
}) {
  const controlledLocale = props.locale;
  const initialLocale = props.initialLocale;
  const onLocaleChange = props.onLocaleChange;
  const router = useRouter();
  const seedLocale = controlledLocale
    ? controlledLocale
    : initialLocale
      ? initialLocale
      : DEFAULT_MARKETING_LOCALE;
  const [internalLocale, setInternalLocale] = useState<MarketingLocale>(seedLocale);
  const isControlled = controlledLocale != null;
  const locale = isControlled ? controlledLocale : internalLocale;

  useEffect(() => {
    if (isControlled) {
      return;
    }
    const fromQuery = localeFromSearch(window.location.search);
    if (fromQuery) {
      writeLocaleCookie(fromQuery);
      setInternalLocale(fromQuery);
      return;
    }
    setInternalLocale(readLocaleCookie());
  }, [isControlled]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: MarketingLocale) => {
      if (onLocaleChange) {
        onLocaleChange(next);
      }
      if (!isControlled) {
        writeLocaleCookie(next);
        setInternalLocale(next);
        router.refresh();
      }
    },
    [isControlled, onLocaleChange, router],
  );

  const messages = MARKETING_MESSAGES[locale] ? MARKETING_MESSAGES[locale] : MARKETING_MESSAGES.en;

  const value = useMemo<MarketingI18nContextValue>(
    () => ({ locale, setLocale, messages }),
    [locale, setLocale, messages],
  );

  return (
    <MarketingI18nContext.Provider value={value}>{props.children}</MarketingI18nContext.Provider>
  );
}

export function useMarketingLocale(): MarketingI18nContextValue {
  const context = useContext(MarketingI18nContext);
  if (!context) {
    return {
      locale: DEFAULT_MARKETING_LOCALE,
      setLocale: () => undefined,
      messages: MARKETING_MESSAGES.en,
    };
  }
  return context;
}
