import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BenchmarkExecutionService } from "./benchmark-execution.service";
import { MarketDataIngestionService } from "./market-data-ingestion.service";
import { PaperPortfolioService } from "./paper-portfolio.service";
import { PortfolioSnapshotService } from "./portfolio-snapshot.service";
import { SignalEngineService } from "./signal-engine.service";

@Injectable()
export class InsightsCronService {
  private readonly logger = new Logger(InsightsCronService.name);

  constructor(
    private readonly ingestion: MarketDataIngestionService,
    private readonly portfolioService: PaperPortfolioService,
    private readonly benchmarkExecution: BenchmarkExecutionService,
    private readonly snapshotService: PortfolioSnapshotService,
    private readonly signalEngine: SignalEngineService,
  ) {}

  @Cron("0 6 * * *", {
    name: "insights:daily-snapshot",
    timeZone: "Africa/Johannesburg",
  })
  async runDailySnapshot(): Promise<void> {
    this.logger.log("Insights daily snapshot starting at 06:00 SAST.");
    try {
      const ingest = await this.ingestion.runDailySnapshot();
      this.logger.log(
        `Market data: ${ingest.totalInserted} rows inserted, ${ingest.failed.length} symbol(s) failed.`,
      );
      if (ingest.failed.length > 0) {
        this.logger.warn(`Symbols that failed: ${ingest.failed.join(", ")}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Market data ingestion crashed: ${message}`);
    }

    try {
      const signals = await this.signalEngine.runDailySnapshot();
      this.logger.log(
        `Signal engine: ${signals.scored}/${signals.totalAssets} assets scored, ${signals.skipped} skipped.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Signal engine crashed: ${message}`);
    }

    try {
      const benchmarks = await this.benchmarkExecution.runAll();
      const executed = benchmarks.filter((r) => r.status === "executed");
      this.logger.log(
        `Benchmark execution: ${executed.length}/${benchmarks.length} portfolios deployed cash.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Benchmark execution crashed: ${message}`);
    }

    try {
      const snapshots = await this.snapshotService.captureForAll();
      this.logger.log(`Portfolio snapshots captured for ${snapshots.length} portfolio(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Snapshot capture crashed: ${message}`);
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
