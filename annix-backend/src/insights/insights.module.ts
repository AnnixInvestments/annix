import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { isMongoDriver } from "../lib/persistence/database-driver";
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
import { Asset } from "./entities/asset.entity";
import { MacroSentimentSnapshot } from "./entities/macro-sentiment-snapshot.entity";
import { NewsItem } from "./entities/news-item.entity";
import { PaperHolding } from "./entities/paper-holding.entity";
import { PaperPortfolio } from "./entities/paper-portfolio.entity";
import { PaperPortfolioSnapshot } from "./entities/paper-portfolio-snapshot.entity";
import { PaperTrade } from "./entities/paper-trade.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { SignalSnapshot } from "./entities/signal-snapshot.entity";
import { WatchlistItem } from "./entities/watchlist-item.entity";
import { AssetRepository } from "./repositories/asset.repository";
import { MongoAssetRepository } from "./repositories/asset.repository.mongo";
import { PostgresAssetRepository } from "./repositories/asset.repository.postgres";
import { MacroSentimentSnapshotRepository } from "./repositories/macro-sentiment-snapshot.repository";
import { MongoMacroSentimentSnapshotRepository } from "./repositories/macro-sentiment-snapshot.repository.mongo";
import { PostgresMacroSentimentSnapshotRepository } from "./repositories/macro-sentiment-snapshot.repository.postgres";
import { NewsItemRepository } from "./repositories/news-item.repository";
import { MongoNewsItemRepository } from "./repositories/news-item.repository.mongo";
import { PostgresNewsItemRepository } from "./repositories/news-item.repository.postgres";
import { PaperHoldingRepository } from "./repositories/paper-holding.repository";
import { MongoPaperHoldingRepository } from "./repositories/paper-holding.repository.mongo";
import { PostgresPaperHoldingRepository } from "./repositories/paper-holding.repository.postgres";
import { PaperPortfolioRepository } from "./repositories/paper-portfolio.repository";
import { MongoPaperPortfolioRepository } from "./repositories/paper-portfolio.repository.mongo";
import { PostgresPaperPortfolioRepository } from "./repositories/paper-portfolio.repository.postgres";
import { PaperPortfolioSnapshotRepository } from "./repositories/paper-portfolio-snapshot.repository";
import { MongoPaperPortfolioSnapshotRepository } from "./repositories/paper-portfolio-snapshot.repository.mongo";
import { PostgresPaperPortfolioSnapshotRepository } from "./repositories/paper-portfolio-snapshot.repository.postgres";
import { PaperTradeRepository } from "./repositories/paper-trade.repository";
import { MongoPaperTradeRepository } from "./repositories/paper-trade.repository.mongo";
import { PostgresPaperTradeRepository } from "./repositories/paper-trade.repository.postgres";
import { PriceHistoryRepository } from "./repositories/price-history.repository";
import { MongoPriceHistoryRepository } from "./repositories/price-history.repository.mongo";
import { PostgresPriceHistoryRepository } from "./repositories/price-history.repository.postgres";
import { SignalSnapshotRepository } from "./repositories/signal-snapshot.repository";
import { MongoSignalSnapshotRepository } from "./repositories/signal-snapshot.repository.mongo";
import { PostgresSignalSnapshotRepository } from "./repositories/signal-snapshot.repository.postgres";
import { WatchlistItemRepository } from "./repositories/watchlist-item.repository";
import { MongoWatchlistItemRepository } from "./repositories/watchlist-item.repository.mongo";
import { PostgresWatchlistItemRepository } from "./repositories/watchlist-item.repository.postgres";
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
    ...(isMongoDriver()
      ? [
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
        ]
      : []),
    ...(isMongoDriver()
      ? []
      : [
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
            MacroSentimentSnapshot,
          ]),
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
    repositoryProvider(AssetRepository, PostgresAssetRepository, MongoAssetRepository),
    repositoryProvider(
      WatchlistItemRepository,
      PostgresWatchlistItemRepository,
      MongoWatchlistItemRepository,
    ),
    repositoryProvider(
      PriceHistoryRepository,
      PostgresPriceHistoryRepository,
      MongoPriceHistoryRepository,
    ),
    repositoryProvider(
      PaperPortfolioRepository,
      PostgresPaperPortfolioRepository,
      MongoPaperPortfolioRepository,
    ),
    repositoryProvider(
      PaperHoldingRepository,
      PostgresPaperHoldingRepository,
      MongoPaperHoldingRepository,
    ),
    repositoryProvider(
      PaperTradeRepository,
      PostgresPaperTradeRepository,
      MongoPaperTradeRepository,
    ),
    repositoryProvider(
      PaperPortfolioSnapshotRepository,
      PostgresPaperPortfolioSnapshotRepository,
      MongoPaperPortfolioSnapshotRepository,
    ),
    repositoryProvider(
      SignalSnapshotRepository,
      PostgresSignalSnapshotRepository,
      MongoSignalSnapshotRepository,
    ),
    repositoryProvider(NewsItemRepository, PostgresNewsItemRepository, MongoNewsItemRepository),
    repositoryProvider(
      MacroSentimentSnapshotRepository,
      PostgresMacroSentimentSnapshotRepository,
      MongoMacroSentimentSnapshotRepository,
    ),
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
