import { CrudRepository } from "../lib/persistence/crud-repository";
import { MalleableIronFittingDimension } from "./entities/malleable-iron-fitting-dimension.entity";

export abstract class MalleableFittingRepository extends CrudRepository<MalleableIronFittingDimension> {
  abstract distinctFittingTypes(): Promise<{ fittingType: string }[]>;
  abstract dimensionsByType(
    fittingType: string,
    pressureClass?: number,
  ): Promise<MalleableIronFittingDimension[]>;
  abstract sizesByTypeAndClass(
    fittingType: string,
    pressureClass: number,
  ): Promise<{ nominalBoreMm: number }[]>;
  abstract findByTypeAndSize(
    fittingType: string,
    nominalBoreMm: number,
    pressureClass: number,
  ): Promise<MalleableIronFittingDimension | null>;
}
