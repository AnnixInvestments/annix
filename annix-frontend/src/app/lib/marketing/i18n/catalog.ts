import type { MarketingLocale } from "@annix/product-data/marketing";
import { af } from "./messages/af";
import { en, type MarketingMessages } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { pt } from "./messages/pt";
import { zu } from "./messages/zu";

export type { MarketingMessages } from "./messages/en";
export type MarketingMessageNamespace = keyof MarketingMessages;

export const MARKETING_MESSAGES: Record<MarketingLocale, MarketingMessages> = {
  en,
  af,
  zu,
  fr,
  pt,
  es,
};
