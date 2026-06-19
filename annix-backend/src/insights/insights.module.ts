import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { MetricsModule } from "../metrics/metrics.module";
import { NixModule } from "../nix/nix.module";
import { InsightsAdminController } from "./controllers/insights-admin.controller";
import { InsightsHealthController } from "./controllers/insights-health.controller";
import { InsightsMacroController } from "./controllers/insights-macro.controller";
import { InsightsNewsController } from "./controllers/insights-news.controller";
import { InsightsPaperPortfoliosController } from "./controllers/insights-paper-portfolios.controller";
import { InsightsSignalsController } from "./controllers/insights-signals.controller";
import { InsightsWatchlistController } from "./controllers/insights-watchlist.controller";
import { AssetRepository } from "./repositories/asset.repository";
import { MongoAssetRepository } from "./repositories/asset.repository.mongo";
import { MacroSentimentSnapshotRepository } from "./repositories/macro-sentiment-snapshot.repository";
import { MongoMacroSentimentSnapshotRepository } from "./repositories/macro-sentiment-snapshot.repository.mongo";
import { NewsItemRepository } from "./repositories/news-item.repository";
import { MongoNewsItemRepository } from "./repositories/news-item.repository.mongo";
import { PaperHoldingRepository } from "./repositories/paper-holding.repository";
import { MongoPaperHoldingRepository } from "./repositories/paper-holding.repository.mongo";
import { PaperPortfolioRepository } from "./repositories/paper-portfolio.repository";
import { MongoPaperPortfolioRepository } from "./repositories/paper-portfolio.repository.mongo";
import { PaperPortfolioSnapshotRepository } from "./repositories/paper-portfolio-snapshot.repository";
import { MongoPaperPortfolioSnapshotRepository } from "./repositories/paper-portfolio-snapshot.repository.mongo";
import { PaperTradeRepository } from "./repositories/paper-trade.repository";
import { MongoPaperTradeRepository } from "./repositories/paper-trade.repository.mongo";
import { PriceHistoryRepository } from "./repositories/price-history.repository";
import { MongoPriceHistoryRepository } from "./repositories/price-history.repository.mongo";
import { SignalSnapshotRepository } from "./repositories/signal-snapshot.repository";
import { MongoSignalSnapshotRepository } from "./repositories/signal-snapshot.repository.mongo";
import { WatchlistItemRepository } from "./repositories/watchlist-item.repository";
import { MongoWatchlistItemRepository } from "./repositories/watchlist-item.repository.mongo";
import { AssetSchema } from "./schemas/asset.schema";
import { MacroSentimentSnapshotSchema } from "./schemas/macro-sentiment-snapshot.schema";
import { NewsItemSchema } from "./schemas/news-item.schema";
import { PaperHoldingSchema } from "./schemas/paper-holding.schema";
import { PaperPortfolioSchema } from "./schemas/paper-portfolio.schema";
import { PaperPortfolioSnapshotSchema } from "./schemas/paper-portfolio-snapshot.schema";
import { PaperTradeSchema } from "./schemas/paper-trade.schema";
import { PriceHistorySchema } from "./schemas/price-history.schema";
import { SignalSnapshotSchema } from "./schemas/signal-snapshot.schema";
import { WatchlistItemSchema } from "./schemas/watchlist-item.schema";
import { AiExecutorService } from "./services/ai-executor.service";
import { AllocationRulesEngineService } from "./services/allocation-rules-engine.service";
import { BenchmarkExecutionService } from "./services/benchmark-execution.service";
import { InsightsCronService } from "./services/insights-cron.service";
import { MacroSentimentService } from "./services/macro-sentiment.service";
import { MarketDataIngestionService } from "./services/market-data-ingestion.service";
import { NewsIngestionService } from "./services/news-ingestion.service";
import { NewsRetentionService } from "./services/news-retention.service";
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
    MongooseModule.forFeature([
      { name: "Asset", schema: AssetSchema },
      { name: "WatchlistItem", schema: WatchlistItemSchema },
      { name: "PriceHistory", schema: PriceHistorySchema },
      { name: "PaperPortfolio", schema: PaperPortfolioSchema },
      { name: "PaperHolding", schema: PaperHoldingSchema },
      { name: "PaperTrade", schema: PaperTradeSchema },
      { name: "PaperPortfolioSnapshot", schema: PaperPortfolioSnapshotSchema },
      { name: "SignalSnapshot", schema: SignalSnapshotSchema },
      { name: "NewsItem", schema: NewsItemSchema },
      { name: "MacroSentimentSnapshot", schema: MacroSentimentSnapshotSchema },
    ]),
  ],
  controllers: [
    InsightsHealthController,
    InsightsWatchlistController,
    InsightsAdminController,
    InsightsPaperPortfoliosController,
    InsightsSignalsController,
    InsightsNewsController,
    InsightsMacroController,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    repositoryProvider(AssetRepository, MongoAssetRepository),
    repositoryProvider(WatchlistItemRepository, MongoWatchlistItemRepository),
    repositoryProvider(PriceHistoryRepository, MongoPriceHistoryRepository),
    repositoryProvider(PaperPortfolioRepository, MongoPaperPortfolioRepository),
    repositoryProvider(PaperHoldingRepository, MongoPaperHoldingRepository),
    repositoryProvider(PaperTradeRepository, MongoPaperTradeRepository),
    repositoryProvider(PaperPortfolioSnapshotRepository, MongoPaperPortfolioSnapshotRepository),
    repositoryProvider(SignalSnapshotRepository, MongoSignalSnapshotRepository),
    repositoryProvider(NewsItemRepository, MongoNewsItemRepository),
    repositoryProvider(MacroSentimentSnapshotRepository, MongoMacroSentimentSnapshotRepository),
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
    MacroSentimentService,
    NewsRetentionService,
    InsightsCronService,
  ],
  exports: [],
})
export class InsightsModule {}
