import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { FittingDimension } from "./entities/fitting-dimension.entity";

export abstract class FittingDimensionRepository extends CrudRepository<FittingDimension> {
  abstract findAllWithRelations(): Promise<FittingDimension[]>;
  abstract findByIdWithRelations(id: number): Promise<FittingDimension | null>;
  abstract findVariantById(id: number): Promise<FittingVariant | null>;
  abstract findAngleRangeById(id: number): Promise<AngleRange | null>;
  abstract instantiate(data: DeepPartial<FittingDimension>): FittingDimension;
}
