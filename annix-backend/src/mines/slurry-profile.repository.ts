import { CrudRepository } from "../lib/persistence/crud-repository";
import { SlurryProfile } from "./entities/slurry-profile.entity";

export abstract class SlurryProfileRepository extends CrudRepository<SlurryProfile> {
  abstract findByCommodityWithRelation(commodityId: number): Promise<SlurryProfile | null>;
  abstract findAllWithCommodity(): Promise<SlurryProfile[]>;
}
