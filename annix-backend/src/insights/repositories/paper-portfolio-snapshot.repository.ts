import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PaperPortfolioSnapshot } from "../entities/paper-portfolio-snapshot.entity";

export abstract class PaperPortfolioSnapshotRepository extends CrudRepository<PaperPortfolioSnapshot> {
  abstract latestForPortfolio(portfolioId: string): Promise<PaperPortfolioSnapshot | null>;
  abstract recentForPortfolio(portfolioId: string, take: number): Promise<PaperPortfolioSnapshot[]>;
  abstract totalValueSparkline(
    portfolioId: string,
    limit: number,
  ): Promise<{ total_value: string }[]>;
  abstract recentTotalValues(
    portfolioId: string,
    limit: number,
  ): Promise<{ total_value: string }[]>;
  abstract recentDailyReturns(
    portfolioId: string,
    limit: number,
  ): Promise<{ daily_return_percent: string }[]>;
  abstract findByPortfolioAndDate(
    portfolioId: string,
    snapshotDate: string,
  ): Promise<PaperPortfolioSnapshot | null>;
  abstract deleteById(id: string): Promise<void>;
  abstract maxSnapshotDate(): Promise<string | Date | null>;
}
