import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { NewsItem } from "../entities/news-item.entity";

const RETENTION_DAYS = 90;

@Injectable()
export class NewsRetentionService {
  private readonly logger = new Logger(NewsRetentionService.name);

  constructor(@InjectRepository(NewsItem) private readonly newsRepo: Repository<NewsItem>) {}

  @Cron("0 12 * * *", {
    name: "insights:news-cleanup",
    timeZone: "Africa/Johannesburg",
  })
  async purgeOldNews(): Promise<{ deleted: number; cutoffIso: string }> {
    const cutoff = now().minus({ days: RETENTION_DAYS }).toJSDate();
    const cutoffIso = cutoff.toISOString();
    const result = await this.newsRepo.delete({ createdAt: LessThan(cutoff) });
    const deleted = result.affected ?? 0;
    this.logger.log(
      `News retention purge: deleted ${deleted} insights_news_items older than ${RETENTION_DAYS} days (created before ${cutoffIso}).`,
    );
    return { deleted, cutoffIso };
  }
}
