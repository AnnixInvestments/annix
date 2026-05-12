import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { MetricsModule } from "../metrics/metrics.module";
import { InsightsAdminController } from "./controllers/insights-admin.controller";
import { InsightsHealthController } from "./controllers/insights-health.controller";
import { InsightsWatchlistController } from "./controllers/insights-watchlist.controller";
import { Asset } from "./entities/asset.entity";
import { PaperHolding } from "./entities/paper-holding.entity";
import { PaperPortfolio } from "./entities/paper-portfolio.entity";
import { PaperPortfolioSnapshot } from "./entities/paper-portfolio-snapshot.entity";
import { PaperTrade } from "./entities/paper-trade.entity";
import { PriceHistory } from "./entities/price-history.entity";
import { WatchlistItem } from "./entities/watchlist-item.entity";
import { InsightsCronService } from "./services/insights-cron.service";
import { MarketDataIngestionService } from "./services/market-data-ingestion.service";
import { WatchlistService } from "./services/watchlist.service";
import { YahooMarketDataService } from "./services/yahoo-market-data.service";

@Module({
  imports: [
    AuthModule,
    MetricsModule,
    TypeOrmModule.forFeature([
      Asset,
      WatchlistItem,
      PriceHistory,
      PaperPortfolio,
      PaperHolding,
      PaperTrade,
      PaperPortfolioSnapshot,
    ]),
  ],
  controllers: [InsightsHealthController, InsightsWatchlistController, InsightsAdminController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    WatchlistService,
    YahooMarketDataService,
    MarketDataIngestionService,
    InsightsCronService,
  ],
  exports: [],
})
export class InsightsModule {}
