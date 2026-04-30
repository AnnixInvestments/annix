import { Injectable, Logger } from "@nestjs/common";
import { nowMillis } from "../../lib/datetime";

interface CacheEntry {
  pages: Buffer[];
  expiresAt: number;
}

@Injectable()
export class PdfPageCacheService {
  private readonly logger = new Logger(PdfPageCacheService.name);
  private readonly ttlMs = 30 * 60 * 1000;
  private readonly maxEntries = 20;
  private readonly cache = new Map<string, CacheEntry>();

  async pages(documentPath: string, rasterise: () => Promise<Buffer[]>): Promise<Buffer[]> {
    const existing = this.cache.get(documentPath);
    const now = nowMillis();
    if (existing && existing.expiresAt > now) {
      this.cache.delete(documentPath);
      this.cache.set(documentPath, existing);
      this.logger.log(
        `Cache hit for ${documentPath} (${existing.pages.length} page(s)); ${this.cache.size} entries cached`,
      );
      return existing.pages;
    }

    const pages = await rasterise();
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(documentPath, { pages, expiresAt: now + this.ttlMs });
    this.logger.log(
      `Cached ${pages.length} page(s) for ${documentPath}; ${this.cache.size}/${this.maxEntries} entries`,
    );
    return pages;
  }

  invalidate(documentPath: string): void {
    this.cache.delete(documentPath);
  }
}
