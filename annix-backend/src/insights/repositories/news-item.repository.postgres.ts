import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, Like, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { NewsItem } from "../entities/news-item.entity";
import { NewsItemRepository } from "./news-item.repository";

@Injectable()
export class PostgresNewsItemRepository
  extends TypeOrmCrudRepository<NewsItem>
  implements NewsItemRepository
{
  constructor(@InjectRepository(NewsItem) repository: Repository<NewsItem>) {
    super(repository);
  }

  findByUrlHash(urlHash: string): Promise<NewsItem | null> {
    return this.repository.findOne({ where: { urlHash } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async updateById(id: string, changes: Partial<NewsItem>): Promise<void> {
    await this.repository.update(id, changes);
  }

  findExtractedForSymbol(symbol: string, cutoff: Date, limit: number): Promise<NewsItem[]> {
    return this.repository
      .createQueryBuilder("n")
      .where("n.extraction_status = :status", { status: "extracted" })
      .andWhere("(n.published_at >= :cutoff OR n.created_at >= :cutoff)", { cutoff })
      .andWhere("n.related_symbols ILIKE :symbolPattern", {
        symbolPattern: `%${symbol}%`,
      })
      .orderBy("n.published_at", "DESC")
      .limit(limit)
      .getMany();
  }

  findExtractedHighImpact(cutoff: Date, limit: number): Promise<NewsItem[]> {
    return this.repository
      .createQueryBuilder("n")
      .where("n.extraction_status = :status", { status: "extracted" })
      .andWhere("(n.published_at >= :cutoff OR n.created_at >= :cutoff)", { cutoff })
      .andWhere("n.impact_level IN (:...impacts)", { impacts: ["high", "medium"] })
      .orderBy("n.published_at", "DESC")
      .limit(limit)
      .getMany();
  }

  findByIds(ids: string[]): Promise<NewsItem[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }

  findExtractedMacro(cutoff: Date): Promise<NewsItem[]> {
    return this.repository
      .createQueryBuilder("n")
      .where("n.feed_type = :feedType", { feedType: "macro" })
      .andWhere("n.extraction_status = :status", { status: "extracted" })
      .andWhere("(n.published_at >= :cutoff OR n.created_at >= :cutoff)", { cutoff })
      .getMany();
  }

  async purgeCreatedBefore(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({ createdAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  async findAndCountForList(params: {
    extractionStatus: string | null;
    symbol: string | null;
    limit: number;
    offset: number;
  }): Promise<{ rows: NewsItem[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.extractionStatus) where.extractionStatus = params.extractionStatus;
    if (params.symbol) where.relatedSymbols = Like(`%${params.symbol.toUpperCase()}%`);

    const [rows, total] = await this.repository.findAndCount({
      where,
      order: { publishedAt: "DESC", createdAt: "DESC" },
      take: params.limit,
      skip: params.offset,
    });
    return { rows, total };
  }
}
