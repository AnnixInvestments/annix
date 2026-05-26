import { CrudRepository } from "../lib/persistence/crud-repository";
import { SweepTeeDimension } from "./entities/sweep-tee-dimension.entity";

export abstract class SweepTeeDimensionRepository extends CrudRepository<SweepTeeDimension> {
  abstract findAllOrdered(): Promise<SweepTeeDimension[]>;
  abstract findByNominalBore(nominalBoreMm: number): Promise<SweepTeeDimension[]>;
  abstract findByRadiusType(radiusType: string): Promise<SweepTeeDimension[]>;
  abstract findByCriteria(
    nominalBoreMm: number,
    radiusType: string,
  ): Promise<SweepTeeDimension | null>;
  abstract availableNominalBores(): Promise<number[]>;
  abstract availableRadiusTypes(): Promise<string[]>;
}
