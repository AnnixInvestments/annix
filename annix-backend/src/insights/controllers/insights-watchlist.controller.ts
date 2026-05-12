import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { AddWatchlistItemDto } from "../dto/add-watchlist-item.dto";
import type { WatchlistItemResponseDto } from "../dto/watchlist-item-response.dto";
import { Asset } from "../entities/asset.entity";
import { INSIGHTS_ROLE } from "../insights.constants";
import { MarketDataIngestionService } from "../services/market-data-ingestion.service";
import { WatchlistService } from "../services/watchlist.service";

export interface PriceBarDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
}

@ApiTags("insights")
@Controller("insights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsWatchlistController {
  constructor(
    private readonly watchlistService: WatchlistService,
    private readonly ingestion: MarketDataIngestionService,
  ) {}

  @Get("watchlist")
  @ApiOperation({ summary: "List all assets on the Insights watchlist" })
  list(): Promise<WatchlistItemResponseDto[]> {
    return this.watchlistService.list();
  }

  @Post("watchlist")
  @ApiOperation({ summary: "Add an asset to the watchlist" })
  add(@Body() body: AddWatchlistItemDto): Promise<WatchlistItemResponseDto> {
    return this.watchlistService.add(body);
  }

  @Delete("watchlist/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove an asset from the watchlist" })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.watchlistService.remove(id);
  }

  @Get("assets/:symbol")
  @ApiOperation({ summary: "Look up an asset by symbol" })
  asset(@Param("symbol") symbol: string): Promise<Asset> {
    return this.watchlistService.assetBySymbol(symbol.toUpperCase());
  }

  @Get("assets/:symbol/history")
  @ApiOperation({ summary: "Return stored daily OHLCV bars for an asset, oldest to newest" })
  async history(
    @Param("symbol") symbol: string,
    @Query("from") from?: string,
  ): Promise<PriceBarDto[]> {
    const rows = await this.ingestion.historyForSymbol(symbol.toUpperCase());
    const filtered = from ? rows.filter((row) => row.date >= from) : rows;
    return filtered.map((row) => ({
      date: typeof row.date === "string" ? row.date.slice(0, 10) : row.date,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      adjClose: row.adjClose !== null ? Number(row.adjClose) : null,
      volume: row.volume !== null ? Number(row.volume) : null,
    }));
  }
}
