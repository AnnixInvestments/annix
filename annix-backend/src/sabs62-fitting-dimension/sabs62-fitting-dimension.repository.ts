import { CrudRepository } from "../lib/persistence/crud-repository";
import { Sabs62FittingDimension } from "./entities/sabs62-fitting-dimension.entity";

export abstract class Sabs62FittingDimensionRepository extends CrudRepository<Sabs62FittingDimension> {
  abstract findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs62FittingDimension | null>;
  abstract distinctFittingTypes(): Promise<string[]>;
  abstract distinctSizes(fittingType: string): Promise<number[]>;
  abstract distinctAngleRanges(fittingType: string, nominalDiameterMm: number): Promise<string[]>;
}
