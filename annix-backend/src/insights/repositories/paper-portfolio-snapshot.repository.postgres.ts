import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PaperPortfolioSnapshot } from "../entities/paper-portfolio-snapshot.entity";
import { PaperPortfolioSnapshotRepository } from "./paper-portfolio-snapshot.repository";

@Injectable()
export class PostgresPaperPortfolioSnapshotRepository
  extends TypeOrmCrudRepository<PaperPortfolioSnapshot>
  implements PaperPortfolioSnapshotRepository
{
  constructor(
    @InjectRepository(PaperPortfolioSnapshot) repository: Repository<PaperPortfolioSnapshot>,
  ) {
    super(repository);
  }

  latestForPortfolio(portfolioId: string): Promise<PaperPortfolioSnapshot | null> {
    return this.repository.findOne({
      where: { portfolioId },
      order: { snapshotDate: "DESC" },
    });
  }

  recentForPortfolio(portfolioId: string, take: number): Promise<PaperPortfolioSnapshot[]> {
    return this.repository.find({
      where: { portfolioId },
      order: { snapshotDate: "DESC" },
      take,
    });
  }

  totalValueSparkline(portfolioId: string, limit: number): Promise<{ total_value: string }[]> {
    return this.repository
      .createQueryBuilder("s")
      .select(["s.total_value AS total_value"])
      .where("s.portfolio_id = :portfolioId", { portfolioId })
      .orderBy("s.snapshot_date", "DESC")
      .limit(limit)
      .getRawMany<{ total_value: string }>();
  }

  recentTotalValues(portfolioId: string, limit: number): Promise<{ total_value: string }[]> {
    return this.repository
      .createQueryBuilder("s")
      .select("s.total_value", "total_value")
      .where("s.portfolio_id = :portfolioId", { portfolioId })
      .orderBy("s.snapshot_date", "DESC")
      .limit(limit)
      .getRawMany<{ total_value: string }>();
  }

  recentDailyReturns(
    portfolioId: string,
    limit: number,
  ): Promise<{ daily_return_percent: string }[]> {
    return this.repository
      .createQueryBuilder("s")
      .select("s.daily_return_percent", "daily_return_percent")
      .where("s.portfolio_id = :portfolioId", { portfolioId })
      .orderBy("s.snapshot_date", "DESC")
      .limit(limit)
      .getRawMany<{ daily_return_percent: string }>();
  }

  findByPortfolioAndDate(
    portfolioId: string,
    snapshotDate: string,
  ): Promise<PaperPortfolioSnapshot | null> {
    return this.repository.findOne({ where: { portfolioId, snapshotDate } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async maxSnapshotDate(): Promise<string | Date | null> {
    const latest = await this.repository
      .createQueryBuilder("s")
      .select("MAX(s.snapshot_date)", "maxDate")
      .getRawOne<{ maxDate: string | Date | null }>();
    return latest?.maxDate ?? null;
  }
}
