import { CrudRepository } from "../lib/persistence/crud-repository";
import { Sabs719FittingDimension } from "./entities/sabs719-fitting-dimension.entity";

export abstract class Sabs719FittingDimensionRepository extends CrudRepository<Sabs719FittingDimension> {
  abstract findByTypeAndDiameter(
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<Sabs719FittingDimension | null>;
  abstract distinctFittingTypes(): Promise<string[]>;
  abstract distinctSizes(fittingType: string): Promise<number[]>;
}
