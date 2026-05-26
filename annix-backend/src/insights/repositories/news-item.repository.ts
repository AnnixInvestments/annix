import { CrudRepository } from "../../lib/persistence/crud-repository";
import { NewsItem } from "../entities/news-item.entity";

export abstract class NewsItemRepository extends CrudRepository<NewsItem> {
  abstract findByUrlHash(urlHash: string): Promise<NewsItem | null>;
  abstract deleteById(id: string): Promise<void>;
  abstract updateById(id: string, changes: Partial<NewsItem>): Promise<void>;
  abstract findExtractedForSymbol(symbol: string, cutoff: Date, limit: number): Promise<NewsItem[]>;
  abstract findExtractedHighImpact(cutoff: Date, limit: number): Promise<NewsItem[]>;
  abstract findByIds(ids: string[]): Promise<NewsItem[]>;
  abstract findExtractedMacro(cutoff: Date): Promise<NewsItem[]>;
  abstract purgeCreatedBefore(cutoff: Date): Promise<number>;
  abstract findAndCountForList(params: {
    extractionStatus: string | null;
    symbol: string | null;
    limit: number;
    offset: number;
  }): Promise<{ rows: NewsItem[]; total: number }>;
}
