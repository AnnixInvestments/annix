import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SignalSnapshot } from "../entities/signal-snapshot.entity";
import { SignalSnapshotRepository } from "./signal-snapshot.repository";

@Injectable()
export class PostgresSignalSnapshotRepository
  extends TypeOrmCrudRepository<SignalSnapshot>
  implements SignalSnapshotRepository
{
  constructor(@InjectRepository(SignalSnapshot) repository: Repository<SignalSnapshot>) {
    super(repository);
  }

  findByAssetAndDate(assetId: string, snapshotDate: string): Promise<SignalSnapshot | null> {
    return this.repository.findOne({ where: { assetId, snapshotDate } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  findForAssetsOrderedByDate(assetIds: string[]): Promise<SignalSnapshot[]> {
    return this.repository
      .createQueryBuilder("s")
      .where({ assetId: In(assetIds) })
      .orderBy("s.asset_id")
      .addOrderBy("s.snapshot_date", "DESC")
      .getMany();
  }

  findLatestPerAssetWithAsset(): Promise<SignalSnapshot[]> {
    return this.repository
      .createQueryBuilder("s")
      .innerJoinAndSelect("s.asset", "asset")
      .innerJoin(
        (qb) =>
          qb
            .from(SignalSnapshot, "ss")
            .select("ss.asset_id", "asset_id")
            .addSelect("MAX(ss.snapshot_date)", "max_date")
            .groupBy("ss.asset_id"),
        "latest",
        '"latest".asset_id = s.asset_id AND "latest".max_date = s.snapshot_date',
      )
      .orderBy("s.opportunity_score", "DESC")
      .getMany();
  }

  findHistoryForAsset(assetId: string, take: number): Promise<SignalSnapshot[]> {
    return this.repository.find({
      where: { assetId },
      relations: { asset: true },
      order: { snapshotDate: "DESC" },
      take,
    });
  }
}
