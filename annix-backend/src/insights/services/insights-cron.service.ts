import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { MarketDataIngestionService } from "./market-data-ingestion.service";
import { PaperPortfolioService } from "./paper-portfolio.service";

@Injectable()
export class InsightsCronService {
  private readonly logger = new Logger(InsightsCronService.name);

  constructor(
    private readonly ingestion: MarketDataIngestionService,
    private readonly portfolioService: PaperPortfolioService,
  ) {}

  @Cron("0 6 * * *", {
    name: "insights:daily-snapshot",
    timeZone: "Africa/Johannesburg",
  })
  async runDailySnapshot(): Promise<void> {
    this.logger.log("Insights daily snapshot starting at 06:00 SAST.");
    try {
      const result = await this.ingestion.runDailySnapshot();
      this.logger.log(
        `Insights daily snapshot finished — ${result.totalInserted} rows inserted across all watchlist assets, ${result.failed.length} symbol(s) failed.`,
      );
      if (result.failed.length > 0) {
        this.logger.warn(`Symbols that failed: ${result.failed.join(", ")}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Insights daily snapshot crashed: ${message}`);
    }
  }

  @Cron("0 6 1 * *", {
    name: "insights:monthly-contribution",
    timeZone: "Africa/Johannesburg",
  })
  async runMonthlyContribution(): Promise<void> {
    this.logger.log("Insights monthly contribution starting (1st of month, 06:00 SAST).");
    try {
      const result = await this.portfolioService.addMonthlyContributionToAll();
      this.logger.log(
        `Insights monthly contribution credited ${result.credited} across ${result.portfolios.length} portfolio(s): ${result.portfolios.join(", ")}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Insights monthly contribution crashed: ${message}`);
    }
  }
}
