import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SignalSnapshot } from "../entities/signal-snapshot.entity";

export abstract class SignalSnapshotRepository extends CrudRepository<SignalSnapshot> {
  abstract findByAssetAndDate(
    assetId: string,
    snapshotDate: string,
  ): Promise<SignalSnapshot | null>;
  abstract deleteById(id: string): Promise<void>;
  abstract findForAssetsOrderedByDate(assetIds: string[]): Promise<SignalSnapshot[]>;
  abstract findLatestPerAssetWithAsset(): Promise<SignalSnapshot[]>;
  abstract findHistoryForAsset(assetId: string, take: number): Promise<SignalSnapshot[]>;
}
