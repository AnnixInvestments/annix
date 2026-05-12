import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { INSIGHTS_ROLE } from "../insights.constants";
import {
  type IngestResult,
  MarketDataIngestionService,
} from "../services/market-data-ingestion.service";

@ApiTags("insights")
@Controller("insights/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsAdminController {
  constructor(private readonly ingestion: MarketDataIngestionService) {}

  @Post("backfill")
  @ApiOperation({ summary: "Trigger a backfill of historical prices for one symbol" })
  backfill(@Query("symbol") symbol: string, @Query("from") from?: string): Promise<IngestResult> {
    const trimmed = symbol?.trim().toUpperCase();
    if (!trimmed) {
      throw new Error("symbol query parameter is required");
    }
    const fromDate = from ? new Date(from) : undefined;
    return this.ingestion.backfillBySymbol(trimmed, fromDate);
  }

  @Post("daily-snapshot/run")
  @ApiOperation({ summary: "Manually trigger the daily snapshot cron payload (admin override)" })
  async runDailySnapshot(): Promise<{ totalInserted: number; failed: string[] }> {
    return this.ingestion.runDailySnapshot();
  }

  @Get("history/:symbol/count")
  @ApiOperation({ summary: "Return the number of stored price-history rows for a symbol" })
  async historyCount(@Param("symbol") symbol: string): Promise<{ symbol: string; rows: number }> {
    const normalised = symbol.toUpperCase();
    const rows = await this.ingestion.rowCountForSymbol(normalised);
    return { symbol: normalised, rows };
  }
}
