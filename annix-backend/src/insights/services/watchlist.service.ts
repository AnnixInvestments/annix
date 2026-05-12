import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type { AddWatchlistItemDto } from "../dto/add-watchlist-item.dto";
import type { WatchlistItemResponseDto } from "../dto/watchlist-item-response.dto";
import { Asset } from "../entities/asset.entity";
import { PriceHistory } from "../entities/price-history.entity";
import { WatchlistItem } from "../entities/watchlist-item.entity";
import { MarketDataIngestionService } from "./market-data-ingestion.service";

const SPARKLINE_DAYS = 30;

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(WatchlistItem) private readonly watchlistRepo: Repository<WatchlistItem>,
    @InjectRepository(PriceHistory) private readonly historyRepo: Repository<PriceHistory>,
    private readonly ingestion: MarketDataIngestionService,
  ) {}

  async list(): Promise<WatchlistItemResponseDto[]> {
    const items = await this.watchlistRepo.find({
      relations: { asset: true },
      order: { addedAt: "DESC" },
    });
    const sparklinesByAssetId = await this.sparklinesFor(items.map((i) => i.assetId));
    return items.map((item) => toResponse(item, sparklinesByAssetId.get(item.assetId) ?? []));
  }

  async assetBySymbol(symbol: string): Promise<Asset> {
    const asset = await this.assetRepo.findOne({ where: { symbol } });
    if (!asset) {
      throw new NotFoundException(`Asset ${symbol} is not in the Insights database.`);
    }
    return asset;
  }

  async add(input: AddWatchlistItemDto): Promise<WatchlistItemResponseDto> {
    const normalisedSymbol = input.symbol.trim().toUpperCase();

    const existingAsset = await this.assetRepo.findOne({
      where: { symbol: normalisedSymbol },
    });

    const asset =
      existingAsset ??
      (await this.assetRepo.save(
        this.assetRepo.create({
          symbol: normalisedSymbol,
          name: input.name,
          exchange: input.exchange,
          currency: input.currency,
          assetType: input.assetType,
          sector: input.sector ?? null,
          isActive: true,
        }),
      ));

    const existingItem = await this.watchlistRepo.findOne({
      where: { assetId: asset.id },
    });
    if (existingItem) {
      throw new ConflictException(`${normalisedSymbol} is already on the watchlist.`);
    }

    const created = this.watchlistRepo.create({
      asset,
      assetId: asset.id,
      notes: input.notes ?? null,
      targetReason: input.targetReason ?? null,
    });
    const saved = await this.watchlistRepo.save(created);

    this.ingestion.backfillForAsset(asset).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auto-backfill for ${asset.symbol} failed: ${message}`);
    });

    const reloaded = await this.watchlistRepo.findOneOrFail({
      where: { id: saved.id },
      relations: { asset: true },
    });
    return toResponse(reloaded, []);
  }

  async remove(id: string): Promise<void> {
    const result = await this.watchlistRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Watchlist item ${id} not found.`);
    }
  }

  private async sparklinesFor(assetIds: string[]): Promise<Map<string, number[]>> {
    const grouped = new Map<string, number[]>();
    if (assetIds.length === 0) return grouped;

    const rows = await this.historyRepo
      .createQueryBuilder("h")
      .select(["h.asset_id AS asset_id", "h.date AS date", "h.close AS close"])
      .where({ assetId: In(assetIds) })
      .orderBy("h.date", "DESC")
      .getRawMany<{ asset_id: string; date: string; close: string }>();

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
