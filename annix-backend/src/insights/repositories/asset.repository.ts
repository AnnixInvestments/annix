import { CrudRepository } from "../../lib/persistence/crud-repository";
import { Asset } from "../entities/asset.entity";

export abstract class AssetRepository extends CrudRepository<Asset> {
  abstract findBySymbol(symbol: string): Promise<Asset | null>;
  abstract findActive(): Promise<Asset[]>;
  abstract updateById(id: string, changes: Partial<Asset>): Promise<void>;
}
