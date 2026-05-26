import { CrudRepository } from "../lib/persistence/crud-repository";
import {
  HdpeFittingDimension,
  HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";

export abstract class HdpeFittingDimensionRepository extends CrudRepository<HdpeFittingDimension> {
  abstract findByCriteria(
    fittingType: HdpeFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<HdpeFittingDimension | null>;
  abstract findAllOrderedByTypeAndSize(): Promise<HdpeFittingDimension[]>;
  abstract findByType(fittingType: HdpeFittingDimensionType): Promise<HdpeFittingDimension[]>;
}
