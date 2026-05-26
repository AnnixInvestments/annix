import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RollRejectionStatus, RubberRollRejection } from "../entities/rubber-roll-rejection.entity";

export abstract class RubberRollRejectionRepository extends CrudRepository<RubberRollRejection> {
  abstract build(data: Partial<RubberRollRejection>): RubberRollRejection;
  abstract findByIdWithCocs(id: number): Promise<RubberRollRejection | null>;
  abstract findBySupplierCocOrdered(supplierCocId: number): Promise<RubberRollRejection[]>;
  abstract findRollNumbersBySupplierCoc(supplierCocId: number): Promise<RubberRollRejection[]>;
  abstract findAllRejectionRefs(): Promise<RubberRollRejection[]>;
  abstract findAllOrdered(statusFilter?: RollRejectionStatus): Promise<RubberRollRejection[]>;
  abstract findRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]>;
  abstract findReplacementRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]>;
}
