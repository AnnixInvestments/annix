import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RollStockStatus, RubberRollStock } from "../entities/rubber-roll-stock.entity";

export interface RollStockListFilters {
  status?: RollStockStatus;
  compoundCodingId?: number;
  soldToCompanyId?: number;
}

export abstract class RubberRollStockRepository extends CrudRepository<RubberRollStock> {
  abstract build(data: Partial<RubberRollStock>): RubberRollStock;
  abstract saveMany(entities: RubberRollStock[]): Promise<RubberRollStock[]>;
  abstract removeMany(entities: RubberRollStock[]): Promise<void>;
  abstract deleteById(id: number): Promise<boolean>;
  abstract inStockCount(): Promise<number>;
  abstract reservedCount(): Promise<number>;
  abstract findFilteredWithRelations(filters?: RollStockListFilters): Promise<RubberRollStock[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberRollStock | null>;
  abstract findOneByRollNumberWithRelations(rollNumber: string): Promise<RubberRollStock | null>;
  abstract findOneByRollNumber(rollNumber: string): Promise<RubberRollStock | null>;
  abstract findOneByRollNumberWithCoding(rollNumber: string): Promise<RubberRollStock | null>;
  abstract findOneByRollNumberSuffixWithCoding(rollNumber: string): Promise<RubberRollStock | null>;
  abstract findOneByRollNumberLikeWithCoding(
    rollNumberFragment: string,
  ): Promise<RubberRollStock | null>;
  abstract findOneByAttributesWithCoding(
    compoundCodingId: number,
    weightKg: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock | null>;
  abstract findManyByRollNumbers(rollNumbers: string[]): Promise<RubberRollStock[]>;
  abstract findManyByRollNumbersWithRelations(rollNumbers: string[]): Promise<RubberRollStock[]>;
  abstract findManyByIdsWithCoding(ids: number[]): Promise<RubberRollStock[]>;
  abstract findManyByCustomerTaxInvoiceId(customerTaxInvoiceId: number): Promise<RubberRollStock[]>;
  abstract findManyByCustomerDeliveryNoteId(
    customerDeliveryNoteId: number,
  ): Promise<RubberRollStock[]>;
  abstract findManyBySupplierDeliveryNoteId(
    supplierDeliveryNoteId: number,
  ): Promise<RubberRollStock[]>;
  abstract findManyBySupplierTaxInvoiceId(supplierTaxInvoiceId: number): Promise<RubberRollStock[]>;
  abstract findManyByCompoundCodingIdAndStatusOrdered(
    compoundCodingId: number,
    status: RollStockStatus,
  ): Promise<RubberRollStock[]>;
  abstract setAuCocIdForRollIds(rollIds: number[], auCocId: number): Promise<void>;
  abstract clearAuCocId(auCocId: number): Promise<void>;
  abstract findOneByIdWithCoding(id: number): Promise<RubberRollStock | null>;
  abstract findAllWithCodingByStatusOrdered(status?: string): Promise<RubberRollStock[]>;
}
