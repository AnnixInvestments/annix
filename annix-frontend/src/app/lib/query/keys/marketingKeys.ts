import type { MarketingLocale } from "@annix/product-data/marketing";

export const marketingKeys = {
  all: ["marketing"] as const,
  draft: (locale: MarketingLocale = "en") => [...marketingKeys.all, "draft", locale] as const,
  status: () => [...marketingKeys.all, "status"] as const,
  locales: () => [...marketingKeys.all, "locales"] as const,
} as const;
