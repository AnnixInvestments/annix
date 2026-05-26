import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberCompoundBatch } from "../entities/rubber-compound-batch.entity";

export abstract class RubberCompoundBatchRepository extends CrudRepository<RubberCompoundBatch> {
  abstract build(data: Partial<RubberCompoundBatch>): RubberCompoundBatch;
  abstract saveMany(entities: RubberCompoundBatch[]): Promise<RubberCompoundBatch[]>;
  abstract findByIdsWithSupplierCocOrdered(ids: number[]): Promise<RubberCompoundBatch[]>;
  abstract findByIdsWithRelations(
    ids: number[],
    relations: string[],
  ): Promise<RubberCompoundBatch[]>;
  abstract countBySupplierCocId(supplierCocId: number): Promise<number>;
  abstract findBySupplierCocIdOrdered(supplierCocId: number): Promise<RubberCompoundBatch[]>;
  abstract deleteBySupplierCocId(supplierCocId: number): Promise<void>;
  abstract deleteAllWithSupplierCoc(): Promise<number>;
  abstract findOneByIdWithRelations(
    id: number,
    relations: string[],
  ): Promise<RubberCompoundBatch | null>;
  abstract completeBatchesForCompound(compoundCode: string): Promise<RubberCompoundBatch[]>;
  abstract findBySupplierCocIdWithRelationsOrdered(
    supplierCocId: number,
  ): Promise<RubberCompoundBatch[]>;
  abstract findByBatchNumbersForActiveCocOrdered(
    batchNumbers: string[],
    equivalentCompoundCodes: string[],
  ): Promise<RubberCompoundBatch[]>;
  abstract findByBatchNumbersWithStockForActiveCoc(
    batchNumbers: string[],
  ): Promise<RubberCompoundBatch[]>;
}
