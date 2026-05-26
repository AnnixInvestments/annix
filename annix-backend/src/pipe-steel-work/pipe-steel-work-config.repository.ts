import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeSteelWorkConfigEntity } from "./entities/pipe-steel-work-config.entity";

export abstract class PipeSteelWorkConfigRepository extends CrudRepository<PipeSteelWorkConfigEntity> {
  abstract findByConfigKey(key: string): Promise<PipeSteelWorkConfigEntity | null>;
  abstract findByCategoryOrdered(category: string): Promise<PipeSteelWorkConfigEntity[]>;
  abstract findAllOrdered(): Promise<PipeSteelWorkConfigEntity[]>;
}
