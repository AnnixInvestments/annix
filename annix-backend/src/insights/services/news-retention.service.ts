import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { NewsItemRepository } from "../repositories/news-item.repository";

const RETENTION_DAYS = 90;

@Injectable()
export class NewsRetentionService {
  private readonly logger = new Logger(NewsRetentionService.name);

  constructor(private readonly newsRepo: NewsItemRepository) {}

  @Cron("0 12 * * *", {
    name: "insights:news-cleanup",
    timeZone: "Africa/Johannesburg",
  })
  async purgeOldNews(): Promise<{ deleted: number; cutoffIso: string }> {
    const cutoff = now().minus({ days: RETENTION_DAYS }).toJSDate();
    const cutoffIso = cutoff.toISOString();
    const deleted = await this.newsRepo.purgeCreatedBefore(cutoff);
    this.logger.log(
      `News retention purge: deleted ${deleted} insights_news_items older than ${RETENTION_DAYS} days (created before ${cutoffIso}).`,
    );
    return { deleted, cutoffIso };
  }
}
