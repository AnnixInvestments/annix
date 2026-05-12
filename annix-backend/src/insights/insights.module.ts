import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { InsightsHealthController } from "./controllers/insights-health.controller";
import { InsightsWatchlistController } from "./controllers/insights-watchlist.controller";
import { Asset } from "./entities/asset.entity";
import { WatchlistItem } from "./entities/watchlist-item.entity";
import { WatchlistService } from "./services/watchlist.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Asset, WatchlistItem])],
  controllers: [InsightsHealthController, InsightsWatchlistController],
  providers: [JwtAuthGuard, RolesGuard, WatchlistService],
  exports: [],
})
export class InsightsModule {}
