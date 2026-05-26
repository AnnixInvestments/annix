import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangeType } from "./entities/flange-type.entity";

export abstract class FlangeTypeRepository extends CrudRepository<FlangeType> {
  abstract findAllOrdered(): Promise<FlangeType[]>;
  abstract findByCode(code: string): Promise<FlangeType | null>;
  abstract findByAbbreviation(abbreviation: string): Promise<FlangeType | null>;
}
