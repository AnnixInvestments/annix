import type {
  MarketingLocale,
  MarketingSiteContent as MarketingSiteContentTree,
} from "@annix/product-data/marketing";
export type MarketingLocaleContentMap = Partial<Record<MarketingLocale, MarketingSiteContentTree>>;

export class MarketingSiteContent {
  id: string;

  draft: MarketingSiteContentTree;

  published: MarketingSiteContentTree;

  draftTranslations: MarketingLocaleContentMap | null;

  publishedTranslations: MarketingLocaleContentMap | null;

  draftUpdatedAt: string | null;

  lastPublishedAt: string | null;

  lastPublishedBy: string | null;

  updatedAt: Date;
}
