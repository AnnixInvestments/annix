import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { PaperPortfolioSnapshotRepository } from "../repositories/paper-portfolio-snapshot.repository";
import { BenchmarkExecutionService } from "./benchmark-execution.service";
import { MacroSentimentService } from "./macro-sentiment.service";
import { MarketDataIngestionService } from "./market-data-ingestion.service";
import { NewsIngestionService } from "./news-ingestion.service";
import { PaperPortfolioService } from "./paper-portfolio.service";
import { PaperTradeExecutionService } from "./paper-trade-execution.service";
import { PortfolioSnapshotService } from "./portfolio-snapshot.service";
import { SignalEngineService } from "./signal-engine.service";

export interface CronRunStatus {
  isRunning: boolean;
  currentRunStartedAt: string | null;
  lastRunStartedAt: string | null;
  lastRunFinishedAt: string | null;
  lastRunDurationMs: number | null;
  lastRunError: string | null;
}

@Injectable()
export class InsightsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InsightsCronService.name);
  private currentRunStartedAtMs: number | null = null;
  private lastRunStartedAtMs: number | null = null;
  private lastRunFinishedAtMs: number | null = null;
  private lastRunDurationMs: number | null = null;
  private lastRunError: string | null = null;

  constructor(
    private readonly ingestion: MarketDataIngestionService,
    private readonly newsIngestion: NewsIngestionService,
    private readonly portfolioService: PaperPortfolioService,
    private readonly benchmarkExecution: BenchmarkExecutionService,
    private readonly snapshotService: PortfolioSnapshotService,
    private readonly signalEngine: SignalEngineService,
    private readonly tradeExecution: PaperTradeExecutionService,
    private readonly macroSentiment: MacroSentimentService,
    private readonly snapshotRepo: PaperPortfolioSnapshotRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const today = now().toISODate();
    if (!today) {
      return;
    }
    const currentHour = now().hour;
    if (currentHour < 6) {
      return;
    }
    const rawMax = await this.snapshotRepo.maxSnapshotDate();
    const latestDate =
      rawMax instanceof Date ? rawMax.toISOString().slice(0, 10) : (rawMax as string | null);
    if (latestDate && latestDate >= today) {
      return;
    }
    const source = latestDate
      ? `bootstrap catch-up (latest snapshot ${latestDate})`
      : "bootstrap catch-up (no prior snapshots)";
    this.logger.warn(
      `Insights catch-up: no snapshot for ${today} (latest=${latestDate ?? "never"}). Firing pipeline.`,
    );
    void this.runSnapshotPipeline(source);
  }

  status(): CronRunStatus {
    return {
      isRunning: this.currentRunStartedAtMs !== null,
      currentRunStartedAt:
        this.currentRunStartedAtMs !== null
          ? new Date(this.currentRunStartedAtMs).toISOString()
          : null,
      lastRunStartedAt:
        this.lastRunStartedAtMs !== null ? new Date(this.lastRunStartedAtMs).toISOString() : null,
      lastRunFinishedAt:
        this.lastRunFinishedAtMs !== null ? new Date(this.lastRunFinishedAtMs).toISOString() : null,
      lastRunDurationMs: this.lastRunDurationMs,
      lastRunError: this.lastRunError,
    };
  }

  triggerManually(): { accepted: boolean; alreadyRunning: boolean } {
    if (this.currentRunStartedAtMs !== null) {
      return { accepted: false, alreadyRunning: true };
    }
    void this.runSnapshotPipeline("manual trigger");
    return { accepted: true, alreadyRunning: false };
  }

  @Cron("0 6 * * *", {
    name: "insights:daily-snapshot",
    timeZone: "Africa/Johannesburg",
  })
  async runDailySnapshot(): Promise<void> {
    await this.runSnapshotPipeline("06:00 SAST cron");
  }

  @Cron("0 18 * * *", {
    name: "insights:evening-snapshot",
    timeZone: "Africa/Johannesburg",
  })
  async runEveningSnapshot(): Promise<void> {
    await this.runSnapshotPipeline("18:00 SAST cron");
  }

  private async runSnapshotPipeline(source: string): Promise<void> {
    if (this.currentRunStartedAtMs !== null) {
      this.logger.warn(`Insights snapshot skipped (${source}): previous run still in progress.`);
      return;
    }
    const startedAtMs = now().toMillis();
    this.currentRunStartedAtMs = startedAtMs;
    this.lastRunError = null;
    this.logger.log(`Insights snapshot starting (${source}).`);
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
      const news = await this.newsIngestion.runDailyPull();
      this.logger.log(
        `News ingestion: ${news.articlesPersisted} per-asset articles across ${news.symbolsProcessed} symbols (extracted=${news.articlesExtracted}, failed=${news.articlesFailed}). Macro: ${news.macroArticlesPersisted} articles across ${news.macroQueriesProcessed} queries.`,
      );
      if (news.symbolFailures.length > 0) {
        this.logger.warn(`News fetch failed for: ${news.symbolFailures.join(", ")}`);
      }
      if (news.macroQueryFailures.length > 0) {
        this.logger.warn(`Macro fetch failed for: ${news.macroQueryFailures.join(", ")}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`News ingestion crashed: ${message}`);
    }

    try {
      const macro = await this.macroSentiment.captureForToday();
      this.logger.log(
        `Macro sentiment captured: score=${Number(macro.overallScore).toFixed(3)}, articles=${macro.articleCount} (${macro.highImpactCount} high-impact).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Macro sentiment capture crashed: ${message}`);
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
      const exec = await this.tradeExecution.executeAll();
      const summary = exec
        .map((r) =>
          r.skipped
            ? `${r.portfolioSlug}: skipped (${r.skipReason})`
            : `${r.portfolioSlug}: ${r.buysExecuted}b/${r.sellsExecuted}s, deployed ${r.cashDeployed.toFixed(0)}, raised ${r.cashRaised.toFixed(0)}`,
        )
        .join(" | ");
      this.logger.log(`Signal-portfolio execution: ${summary || "(no portfolios)"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Signal-portfolio execution crashed: ${message}`);
    }

    try {
      const snapshots = await this.snapshotService.captureForAll();
      this.logger.log(`Portfolio snapshots captured for ${snapshots.length} portfolio(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Snapshot capture crashed: ${message}`);
    }

    const finishedAtMs = now().toMillis();
    this.lastRunStartedAtMs = startedAtMs;
    this.lastRunFinishedAtMs = finishedAtMs;
    this.lastRunDurationMs = finishedAtMs - startedAtMs;
    this.currentRunStartedAtMs = null;
    this.logger.log(`Insights snapshot completed (${source}) in ${this.lastRunDurationMs}ms.`);
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
