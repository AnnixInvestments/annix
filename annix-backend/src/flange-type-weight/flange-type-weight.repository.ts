import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";

export abstract class FlangeTypeWeightRepository extends CrudRepository<FlangeTypeWeight> {
  abstract findAllWithStandard(): Promise<FlangeTypeWeight[]>;
  abstract findFlangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeTypeCode: string,
    flangeStandardCode: string | null,
  ): Promise<FlangeTypeWeight | null>;
  abstract findBlankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeight | null>;
  abstract distinctPressureClasses(): Promise<{ pressureClass: string }[]>;
  abstract distinctFlangeTypeCodes(): Promise<{ flangeTypeCode: string }[]>;
}
