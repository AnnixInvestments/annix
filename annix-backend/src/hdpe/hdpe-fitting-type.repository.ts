import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpeFittingType } from "./entities/hdpe-fitting-type.entity";

export abstract class HdpeFittingTypeRepository extends CrudRepository<HdpeFittingType> {
  abstract findByCode(code: string): Promise<HdpeFittingType | null>;
  abstract findActiveOrderedByDisplayOrder(): Promise<HdpeFittingType[]>;
}
