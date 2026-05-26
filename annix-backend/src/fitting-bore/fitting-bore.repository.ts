import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { FittingBore } from "./entities/fitting-bore.entity";

export abstract class FittingBoreRepository extends CrudRepository<FittingBore> {
  abstract instantiate(data: DeepPartial<FittingBore>): FittingBore;
}
