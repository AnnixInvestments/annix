import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitOutreachAsset } from "../entities/orbit-outreach-asset.entity";

export abstract class OrbitOutreachAssetRepository extends CrudRepository<OrbitOutreachAsset> {
  abstract findBySlot(slot: string): Promise<OrbitOutreachAsset | null>;
  abstract listAll(): Promise<OrbitOutreachAsset[]>;
}
