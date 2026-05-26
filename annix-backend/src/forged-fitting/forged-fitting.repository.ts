import { CrudRepository } from "../lib/persistence/crud-repository";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";

export abstract class ForgedFittingRepository extends CrudRepository<ForgedFittingDimension> {
  abstract fittingTypes(): Promise<{ code: string; name: string }[]>;
  abstract seriesList(): Promise<{ id: number; pressureClass: number; connectionType: string }[]>;
  abstract sizes(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<number[]>;
  abstract dimensionByFilter(
    fittingTypeCode: string,
    nominalBoreMm: number,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension | null>;
  abstract allDimensions(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension[]>;
}
