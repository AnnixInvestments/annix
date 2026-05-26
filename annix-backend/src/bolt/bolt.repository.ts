import { CrudRepository } from "../lib/persistence/crud-repository";
import { BoltFilters } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";

export abstract class BoltRepository extends CrudRepository<Bolt> {
  abstract filteredBolts(filters: BoltFilters): Promise<Bolt[]>;
  abstract boltCategoriesGrouped(): Promise<Array<{ type: string; count: number }>>;
  abstract fastenerSizesForBolt(type: string): Promise<Array<{ size: string }>>;
  abstract fastenerGradesForBolt(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>>;
}
