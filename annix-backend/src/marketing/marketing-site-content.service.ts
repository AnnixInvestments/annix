import {
  DEFAULT_MARKETING_LOCALE,
  defaultMarketingContent,
  type MarketingLocale,
  type MarketingSiteContent as MarketingSiteContentTree,
  type MarketingSiteStatus,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";
import { Injectable, Logger } from "@nestjs/common";
import { cloneDeep, isArray, mergeWith } from "es-toolkit/compat";
import { nowISO } from "../lib/datetime";
import {
  type MarketingLocaleContentMap,
  MarketingSiteContent,
} from "./entities/marketing-site-content.entity";
import { MarketingSiteContentRepository } from "./repositories/marketing-site-content.repository";

const SINGLETON_ID = "annix";

function withDefaults(stored: MarketingSiteContentTree | null): MarketingSiteContentTree {
  const base = defaultMarketingContent();
  if (!stored) {
    return base;
  }
  // mergeWith mutates its first arg, so keep a separate untouched copy for lookups.
  const defaults = defaultMarketingContent();
  const merged = mergeWith(base, stored, (_baseValue, storedValue) =>
    isArray(storedValue) ? storedValue : undefined,
  ) as MarketingSiteContentTree;
  merged.industries.items.forEach((item) => {
    if (!item.imageUrl) {
      const def = defaults.industries.items.find((entry) => entry.slug === item.slug);
      if (def?.imageUrl) {
        item.imageUrl = def.imageUrl;
      }
    }
  });
  merged.ecosystem.products.forEach((product) => {
    if (!product.imageUrl) {
      const def = defaults.ecosystem.products.find(
        (entry) => entry.detailSlug === product.detailSlug,
      );
      if (def?.imageUrl) {
        product.imageUrl = def.imageUrl;
      }
    }
  });
  // Surface resources added to the code defaults even when a stored tree already
  // replaced the resources array — append any default whose slug is absent.
  const storedSlugs = new Set(merged.resources.items.map((item) => item.slug));
  const missingDefaults = defaults.resources.items.filter((def) => !storedSlugs.has(def.slug));
  merged.resources.items = [...merged.resources.items, ...missingDefaults];
  return merged;
}

// Overlay a locale's translated tree on top of the English base so that any field
// the editors have not translated yet falls back to the English copy.
function withLocaleFallback(
  base: MarketingSiteContentTree,
  override: MarketingSiteContentTree | null | undefined,
): MarketingSiteContentTree {
  if (!override) {
    return base;
  }
  return mergeWith(cloneDeep(base), override, (_baseValue, value) =>
    isArray(value) ? value : undefined,
  ) as MarketingSiteContentTree;
}

@Injectable()
export class MarketingSiteContentService {
  private readonly logger = new Logger(MarketingSiteContentService.name);

  constructor(private readonly repository: MarketingSiteContentRepository) {}

  async draftContent(locale?: string | null): Promise<MarketingSiteContentTree> {
    const target = normaliseMarketingLocale(locale);
    const record = await this.ensure();
    const base = withDefaults(record.draft);
    if (target === DEFAULT_MARKETING_LOCALE) {
      return base;
    }
    return withLocaleFallback(base, record.draftTranslations?.[target]);
  }

  async publishedContent(locale?: string | null): Promise<MarketingSiteContentTree> {
    const target = normaliseMarketingLocale(locale);
    const record = await this.ensure();
    const base = withDefaults(record.published);
    if (target === DEFAULT_MARKETING_LOCALE) {
      return base;
    }
    return withLocaleFallback(base, record.publishedTranslations?.[target]);
  }

  async publishedLocales(): Promise<MarketingLocale[]> {
    const record = await this.ensure();
    const translated = Object.keys(record.publishedTranslations ?? {}).filter(
      (code): code is MarketingLocale => code !== DEFAULT_MARKETING_LOCALE,
    );
    return [DEFAULT_MARKETING_LOCALE, ...translated];
  }

  async status(): Promise<MarketingSiteStatus> {
    const record = await this.ensure();
    return {
      hasDraft: record.draftUpdatedAt !== null,
      draftUpdatedAt: record.draftUpdatedAt,
      lastPublishedAt: record.lastPublishedAt,
      lastPublishedBy: record.lastPublishedBy,
    };
  }

  async saveDraft(
    content: MarketingSiteContentTree,
    locale?: string | null,
  ): Promise<MarketingSiteContentTree> {
    const target = normaliseMarketingLocale(locale);
    const record = await this.ensure();
    if (target === DEFAULT_MARKETING_LOCALE) {
      record.draft = content;
    } else {
      const map: MarketingLocaleContentMap = { ...(record.draftTranslations ?? {}) };
      map[target] = content;
      record.draftTranslations = map;
    }
    record.draftUpdatedAt = nowISO();
    const saved = await this.repository.save(record);
    this.logger.log(`Saved marketing site draft (${target})`);
    return target === DEFAULT_MARKETING_LOCALE
      ? saved.draft
      : (saved.draftTranslations?.[target] ?? content);
  }

  async publish(publishedBy: string | null): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    record.published = cloneDeep(record.draft);
    record.publishedTranslations = cloneDeep(record.draftTranslations ?? {});
    record.lastPublishedAt = nowISO();
    record.lastPublishedBy = publishedBy;
    // Draft now equals published — clear the dirty flag so the CMS stops
    // showing "unpublished draft changes" after a successful publish.
    record.draftUpdatedAt = null;
    const saved = await this.repository.save(record);
    this.logger.log(`Published marketing site (by ${publishedBy ?? "unknown"})`);
    return saved.published;
  }

  async discardDraft(): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    record.draft = cloneDeep(record.published);
    record.draftTranslations = cloneDeep(record.publishedTranslations ?? {});
    record.draftUpdatedAt = null;
    const saved = await this.repository.save(record);
    this.logger.log("Discarded marketing site draft");
    return saved.draft;
  }

  private async ensure(): Promise<MarketingSiteContent> {
    const existing = await this.repository.findById(SINGLETON_ID);
    if (existing) {
      return existing;
    }
    const seed = defaultMarketingContent();
    const created = this.repository.build({
      id: SINGLETON_ID,
      draft: cloneDeep(seed),
      published: cloneDeep(seed),
      draftTranslations: {},
      publishedTranslations: {},
      draftUpdatedAt: null,
      lastPublishedAt: nowISO(),
      lastPublishedBy: "system",
    });
    const saved = await this.repository.save(created);
    this.logger.log("Seeded marketing site content from defaults");
    return saved;
  }
}
