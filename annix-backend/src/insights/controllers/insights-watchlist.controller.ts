import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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
import { WatchlistService } from "../services/watchlist.service";

@ApiTags("insights")
@Controller("insights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsWatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

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
}
