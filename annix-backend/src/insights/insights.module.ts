import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { InsightsAdminController } from "./controllers/insights-admin.controller";
import { InsightsHealthController } from "./controllers/insights-health.controller";
import { InsightsNewsController } from "./controllers/insights-news.controller";
import { InsightsPaperPortfoliosController } from "./controllers/insights-paper-portfolios.controller";
import { InsightsSignalsController } from "./controllers/insights-signals.controller";
import { InsightsWatchlistController } from "./controllers/insights-watchlist.controller";
import { Asset } from "./entities/asset.entity";
import { NewsItem } from "./entities/news-item.entity";
import { PaperHolding } from "./entities/paper-holding.entity";
import { PaperPortfolio } from "./entities/paper-portfolio.entity";
import { PaperPortfolioSnapshot } from "./entities/paper-portfolio-snapshot.entity";
import { PaperTrade } from "./entities/paper-trade.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { SignalSnapshot } from "./entities/signal-snapshot.entity";
import { WatchlistItem } from "./entities/watchlist-item.entity";
import { AiExecutorService } from "./services/ai-executor.service";
import { AllocationRulesEngineService } from "./services/allocation-rules-engine.service";
import { BenchmarkExecutionService } from "./services/benchmark-execution.service";
import { InsightsCronService } from "./services/insights-cron.service";
import { MarketDataIngestionService } from "./services/market-data-ingestion.service";
import { NewsIngestionService } from "./services/news-ingestion.service";
import { PaperPortfolioService } from "./services/paper-portfolio.service";
import { PaperTradeExecutionService } from "./services/paper-trade-execution.service";
import { PortfolioSnapshotService } from "./services/portfolio-snapshot.service";
import { SignalEngineService } from "./services/signal-engine.service";
import { WatchlistService } from "./services/watchlist.service";
import { YahooMarketDataService } from "./services/yahoo-market-data.service";

@Module({
  imports: [
    AuthModule,
    MetricsModule,
    NixModule,
    TypeOrmModule.forFeature([
      Asset,
      WatchlistItem,
      PriceHistory,
      PaperPortfolio,
      PaperHolding,
      PaperTrade,
      PaperPortfolioSnapshot,
      SignalSnapshot,
      NewsItem,
    ]),
  ],
  controllers: [
    InsightsHealthController,
    InsightsWatchlistController,
    InsightsAdminController,
    InsightsPaperPortfoliosController,
    InsightsSignalsController,
    InsightsNewsController,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    WatchlistService,
    YahooMarketDataService,
    MarketDataIngestionService,
    NewsIngestionService,
    PaperPortfolioService,
    BenchmarkExecutionService,
    PortfolioSnapshotService,
    SignalEngineService,
    AllocationRulesEngineService,
    AiExecutorService,
    PaperTradeExecutionService,
    InsightsCronService,
  ],
  exports: [],
})
export class InsightsModule {}
