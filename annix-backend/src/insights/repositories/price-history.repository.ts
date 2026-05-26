import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { PriceHistory } from "../entities/price-history.entity";

export interface SparklineRow {
  asset_id: string;
  date: string;
  close: string;
}

export interface LatestPriceRow {
  asset_id: string;
  close: string;
  date: string | Date;
}

export abstract class PriceHistoryRepository extends CrudRepository<PriceHistory> {
  abstract sparklineRows(assetIds: string[]): Promise<SparklineRow[]>;
  abstract latestForAsset(assetId: string): Promise<PriceHistory | null>;
  abstract historyForAssetAsc(assetId: string, from?: string): Promise<PriceHistory[]>;
  abstract historyForAssetDesc(assetId: string, take: number): Promise<PriceHistory[]>;
  abstract countForAsset(assetId: string): Promise<number>;
  abstract existingDates(assetId: string, dates: string[]): Promise<{ date: string }[]>;
  abstract insertIgnoringConflicts(rows: DeepPartial<PriceHistory>[]): Promise<void>;
  abstract latestPriceRows(assetIds: string[]): Promise<LatestPriceRow[]>;
}
