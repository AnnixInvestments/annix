import {
  defaultMarketingContent,
  type MarketingSiteContent as MarketingSiteContentTree,
  type MarketingSiteStatus,
} from "@annix/product-data/marketing";
import { Injectable, Logger } from "@nestjs/common";
import { cloneDeep, isArray, mergeWith } from "es-toolkit/compat";
import { nowISO } from "../lib/datetime";
import { MarketingSiteContent } from "./entities/marketing-site-content.entity";
import { MarketingSiteContentRepository } from "./repositories/marketing-site-content.repository";

const SINGLETON_ID = "annix";

function withDefaults(stored: MarketingSiteContentTree | null): MarketingSiteContentTree {
  const base = defaultMarketingContent();
  if (!stored) {
    return base;
  }
  const merged = mergeWith(base, stored, (_baseValue, storedValue) =>
    isArray(storedValue) ? storedValue : undefined,
  ) as MarketingSiteContentTree;
  merged.industries.items.forEach((item) => {
    if (item.imageUrl === undefined) {
      const def = base.industries.items.find((entry) => entry.slug === item.slug);
      item.imageUrl = def ? def.imageUrl : null;
    }
  });
  merged.ecosystem.products.forEach((product) => {
    if (product.imageUrl === undefined) {
      const def = base.ecosystem.products.find((entry) => entry.detailSlug === product.detailSlug);
      product.imageUrl = def ? def.imageUrl : null;
    }
  });
  return merged;
}

@Injectable()
export class MarketingSiteContentService {
  private readonly logger = new Logger(MarketingSiteContentService.name);

  constructor(private readonly repository: MarketingSiteContentRepository) {}

  async draftContent(): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    return withDefaults(record.draft);
  }

  async publishedContent(): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    return withDefaults(record.published);
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

  async saveDraft(content: MarketingSiteContentTree): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    record.draft = content;
    record.draftUpdatedAt = nowISO();
    const saved = await this.repository.save(record);
    this.logger.log("Saved marketing site draft");
    return saved.draft;
  }

  async publish(publishedBy: string | null): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    record.published = cloneDeep(record.draft);
    record.lastPublishedAt = nowISO();
    record.lastPublishedBy = publishedBy;
    const saved = await this.repository.save(record);
    this.logger.log(`Published marketing site (by ${publishedBy ?? "unknown"})`);
    return saved.published;
  }

  async discardDraft(): Promise<MarketingSiteContentTree> {
    const record = await this.ensure();
    record.draft = cloneDeep(record.published);
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
      draftUpdatedAt: null,
      lastPublishedAt: nowISO(),
      lastPublishedBy: "system",
    });
    const saved = await this.repository.save(created);
    this.logger.log("Seeded marketing site content from defaults");
    return saved;
  }
}
