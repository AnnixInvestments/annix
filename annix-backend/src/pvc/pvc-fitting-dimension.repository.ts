import { CrudRepository } from "../lib/persistence/crud-repository";
import {
  PvcFittingDimension,
  PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";

export abstract class PvcFittingDimensionRepository extends CrudRepository<PvcFittingDimension> {
  abstract findByCriteria(
    fittingType: PvcFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<PvcFittingDimension | null>;
  abstract findAllOrderedByTypeAndSize(): Promise<PvcFittingDimension[]>;
  abstract findByType(fittingType: PvcFittingDimensionType): Promise<PvcFittingDimension[]>;
}
