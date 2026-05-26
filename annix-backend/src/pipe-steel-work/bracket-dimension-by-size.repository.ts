import { CrudRepository } from "../lib/persistence/crud-repository";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";

export abstract class BracketDimensionBySizeRepository extends CrudRepository<BracketDimensionBySizeEntity> {
  abstract findByTypeAndNb(
    bracketTypeCode: string,
    nbMm: number,
  ): Promise<BracketDimensionBySizeEntity | null>;
  abstract findByTypeOrdered(bracketTypeCode: string): Promise<BracketDimensionBySizeEntity[]>;
}
