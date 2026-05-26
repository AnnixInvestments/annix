import { CrudRepository } from "../lib/persistence/crud-repository";
import { Commodity } from "./entities/commodity.entity";

export abstract class CommodityRepository extends CrudRepository<Commodity> {
  abstract findAllOrdered(): Promise<Commodity[]>;
  abstract findByIdWithRelations(id: number): Promise<Commodity | null>;
}
