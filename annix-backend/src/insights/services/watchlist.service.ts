import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { AddWatchlistItemDto } from "../dto/add-watchlist-item.dto";
import type { WatchlistItemResponseDto } from "../dto/watchlist-item-response.dto";
import { Asset } from "../entities/asset.entity";
import { WatchlistItem } from "../entities/watchlist-item.entity";

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(WatchlistItem) private readonly watchlistRepo: Repository<WatchlistItem>,
  ) {}

  async list(): Promise<WatchlistItemResponseDto[]> {
    const items = await this.watchlistRepo.find({
      relations: { asset: true },
      order: { addedAt: "DESC" },
    });
    return items.map(toResponse);
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
    const reloaded = await this.watchlistRepo.findOneOrFail({
      where: { id: saved.id },
      relations: { asset: true },
    });
    return toResponse(reloaded);
  }

  async remove(id: string): Promise<void> {
    const result = await this.watchlistRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Watchlist item ${id} not found.`);
    }
  }
}

function toResponse(item: WatchlistItem): WatchlistItemResponseDto {
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
  };
}
