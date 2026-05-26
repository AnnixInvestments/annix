import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThanOrEqual, Repository } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PriceHistory } from "../entities/price-history.entity";
import {
  type LatestPriceRow,
  PriceHistoryRepository,
  type SparklineRow,
} from "./price-history.repository";

@Injectable()
export class PostgresPriceHistoryRepository
  extends TypeOrmCrudRepository<PriceHistory>
  implements PriceHistoryRepository
{
  constructor(@InjectRepository(PriceHistory) repository: Repository<PriceHistory>) {
    super(repository);
  }

  sparklineRows(assetIds: string[]): Promise<SparklineRow[]> {
    return this.repository
      .createQueryBuilder("h")
      .select(["h.asset_id AS asset_id", "h.date AS date", "h.close AS close"])
      .where({ assetId: In(assetIds) })
      .orderBy("h.date", "DESC")
      .getRawMany<SparklineRow>();
  }

  latestForAsset(assetId: string): Promise<PriceHistory | null> {
    return this.repository.findOne({
      where: { assetId },
      order: { date: "DESC" },
    });
  }

  historyForAssetAsc(assetId: string, from?: string): Promise<PriceHistory[]> {
    return this.repository.find({
      where: from ? { assetId, date: MoreThanOrEqual(from) } : { assetId },
      order: { date: "ASC" },
    });
  }

  historyForAssetDesc(assetId: string, take: number): Promise<PriceHistory[]> {
    return this.repository.find({
      where: { assetId },
      order: { date: "DESC" },
      take,
    });
  }

  countForAsset(assetId: string): Promise<number> {
    return this.repository.count({ where: { assetId } });
  }

  existingDates(assetId: string, dates: string[]): Promise<{ date: string }[]> {
    return this.repository
      .createQueryBuilder("h")
      .select("h.date", "date")
      .where("h.asset_id = :assetId", { assetId })
      .andWhere("h.date IN (:...dates)", { dates })
      .getRawMany<{ date: string }>();
  }

  async insertIgnoringConflicts(rows: DeepPartial<PriceHistory>[]): Promise<void> {
    await this.repository.createQueryBuilder().insert().values(rows).orIgnore().execute();
  }

  latestPriceRows(assetIds: string[]): Promise<LatestPriceRow[]> {
    return this.repository
      .createQueryBuilder("h")
      .select("h.asset_id", "asset_id")
      .addSelect("h.close", "close")
      .addSelect("h.date", "date")
      .distinctOn(["h.asset_id"])
      .where({ assetId: In(assetIds) })
      .orderBy("h.asset_id")
      .addOrderBy("h.date", "DESC")
      .getRawMany<LatestPriceRow>();
  }
}
