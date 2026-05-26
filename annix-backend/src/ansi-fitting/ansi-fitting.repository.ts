import { CrudRepository } from "../lib/persistence/crud-repository";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";
import { AnsiB169FittingType } from "./entities/ansi-b16-9-fitting-type.entity";

export abstract class AnsiFittingDimensionRepository extends CrudRepository<AnsiB169FittingDimension> {
  abstract sizesByFittingType(fittingTypeCode: string, schedule?: string): Promise<number[]>;
  abstract schedulesByFittingType(fittingTypeCode: string): Promise<string[]>;
  abstract dimensionByTypeNbSchedule(
    fittingTypeCode: string,
    nbMm: number,
    schedule: string,
    branchNbMm?: number,
  ): Promise<AnsiB169FittingDimension | null>;
  abstract allDimensionsByTypeAndSchedule(
    fittingTypeCode: string,
    schedule: string,
  ): Promise<AnsiB169FittingDimension[]>;
}

export abstract class AnsiFittingTypeRepository extends CrudRepository<AnsiB169FittingType> {
  abstract findAllOrderedByName(): Promise<AnsiB169FittingType[]>;
}
