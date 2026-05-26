import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberType } from "../entities/rubber-type.entity";

export abstract class RubberTypeRepository extends CrudRepository<RubberType> {
  abstract build(data: Partial<RubberType>): RubberType;
  abstract findAllOrderedByTypeNumber(): Promise<RubberType[]>;
  abstract findOneByTypeNumber(typeNumber: number): Promise<RubberType | null>;
}
