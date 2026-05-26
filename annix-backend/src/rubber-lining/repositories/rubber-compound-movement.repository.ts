import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  CompoundMovementReferenceType,
  CompoundMovementType,
  RubberCompoundMovement,
} from "../entities/rubber-compound-movement.entity";

export interface CompoundMovementFilters {
  compoundStockId?: number;
  movementType?: CompoundMovementType;
  referenceType?: CompoundMovementReferenceType;
}

export abstract class RubberCompoundMovementRepository extends CrudRepository<RubberCompoundMovement> {
  abstract build(data: Partial<RubberCompoundMovement>): RubberCompoundMovement;
  abstract findAllWithRelationsFiltered(
    filters?: CompoundMovementFilters,
  ): Promise<RubberCompoundMovement[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberCompoundMovement | null>;
  abstract countByReference(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<number>;
  abstract findByReferenceWithStock(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<RubberCompoundMovement[]>;
}
