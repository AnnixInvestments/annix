import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { AddWatchlistItemDto } from "../dto/add-watchlist-item.dto";
import type { WatchlistItemResponseDto } from "../dto/watchlist-item-response.dto";
import { Asset } from "../entities/asset.entity";
import { WatchlistItem } from "../entities/watchlist-item.entity";
import { AssetRepository } from "../repositories/asset.repository";
import { PriceHistoryRepository } from "../repositories/price-history.repository";
import { WatchlistItemRepository } from "../repositories/watchlist-item.repository";
import { MarketDataIngestionService } from "./market-data-ingestion.service";

const SPARKLINE_DAYS = 30;

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly watchlistRepo: WatchlistItemRepository,
    private readonly historyRepo: PriceHistoryRepository,
    private readonly ingestion: MarketDataIngestionService,
  ) {}

  async list(): Promise<WatchlistItemResponseDto[]> {
    const items = await this.watchlistRepo.findAllWithAsset();
    const sparklinesByAssetId = await this.sparklinesFor(items.map((i) => i.assetId));
    return items.map((item) => toResponse(item, sparklinesByAssetId.get(item.assetId) ?? []));
  }

  async assetBySymbol(symbol: string): Promise<Asset> {
    const asset = await this.assetRepo.findBySymbol(symbol);
    if (!asset) {
      throw new NotFoundException(`Asset ${symbol} is not in the Insights database.`);
    }
    return asset;
  }

  async add(input: AddWatchlistItemDto): Promise<WatchlistItemResponseDto> {
    const normalisedSymbol = input.symbol.trim().toUpperCase();

    const existingAsset = await this.assetRepo.findBySymbol(normalisedSymbol);

    const asset =
      existingAsset ??
      (await this.assetRepo.create({
        symbol: normalisedSymbol,
        name: input.name,
        exchange: input.exchange,
        currency: input.currency,
        assetType: input.assetType,
        sector: input.sector ?? null,
        isActive: true,
      }));

    const existingItem = await this.watchlistRepo.findByAssetId(asset.id);
    if (existingItem) {
      throw new ConflictException(`${normalisedSymbol} is already on the watchlist.`);
    }

    const saved = await this.watchlistRepo.create({
      assetId: asset.id,
      notes: input.notes ?? null,
      targetReason: input.targetReason ?? null,
    });

    this.ingestion.backfillForAsset(asset).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auto-backfill for ${asset.symbol} failed: ${message}`);
    });

    const reloaded = await this.watchlistRepo.findByIdWithAsset(saved.id);
    if (!reloaded) {
      throw new NotFoundException(`Watchlist item ${saved.id} not found.`);
    }
    return toResponse(reloaded, []);
  }

  async remove(id: string): Promise<void> {
    const removed = await this.watchlistRepo.deleteById(id);
    if (!removed) {
      throw new NotFoundException(`Watchlist item ${id} not found.`);
    }
  }

  private async sparklinesFor(assetIds: string[]): Promise<Map<string, number[]>> {
    const grouped = new Map<string, number[]>();
    if (assetIds.length === 0) return grouped;

    const rows = await this.historyRepo.sparklineRows(assetIds);

    const buckets = new Map<string, { date: string; close: number }[]>();
    for (const row of rows) {
      const list = buckets.get(row.asset_id) ?? [];
      if (list.length >= SPARKLINE_DAYS) continue;
      list.push({ date: row.date, close: Number(row.close) });
      buckets.set(row.asset_id, list);
    }

    buckets.forEach((list, assetId) => {
      const oldestToNewest = [...list].reverse().map((r) => r.close);
      grouped.set(assetId, oldestToNewest);
    });

    return grouped;
  }
}

function toResponse(item: WatchlistItem, sparkline: number[]): WatchlistItemResponseDto {
  const asset = item.asset;
  return {
    id: item.id,
    symbol: asset.symbol,
    name: asset.name,
    exchange: asset.exchange,
    currency: asset.currency,
    assetType: asset.assetType,
    sector: asset.sector,
    notes: item.notes,
    targetReason: item.targetReason,
    addedAt: item.addedAt.toISOString(),
    sparkline,
  };
}
