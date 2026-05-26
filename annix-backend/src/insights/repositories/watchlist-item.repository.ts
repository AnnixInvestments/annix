import { CrudRepository } from "../../lib/persistence/crud-repository";
import { WatchlistItem } from "../entities/watchlist-item.entity";

export abstract class WatchlistItemRepository extends CrudRepository<WatchlistItem> {
  abstract findAllWithAsset(): Promise<WatchlistItem[]>;
  abstract findByAssetId(assetId: string): Promise<WatchlistItem | null>;
  abstract findByIdWithAsset(id: string): Promise<WatchlistItem | null>;
  abstract deleteById(id: string): Promise<boolean>;
}
