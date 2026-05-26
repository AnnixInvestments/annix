import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  RequisitionSourceType,
  RequisitionStatus,
  RubberPurchaseRequisition,
} from "../entities/rubber-purchase-requisition.entity";

export interface RequisitionListFilters {
  status?: RequisitionStatus;
  sourceType?: RequisitionSourceType;
}

export abstract class RubberPurchaseRequisitionRepository extends CrudRepository<RubberPurchaseRequisition> {
  abstract build(data: Partial<RubberPurchaseRequisition>): RubberPurchaseRequisition;
  abstract findFilteredWithRelations(
    filters?: RequisitionListFilters,
  ): Promise<RubberPurchaseRequisition[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberPurchaseRequisition | null>;
  abstract findOneByIdWithItems(id: number): Promise<RubberPurchaseRequisition | null>;
  abstract findOnePendingLowStockWithItems(): Promise<RubberPurchaseRequisition | null>;
  abstract findPendingWithRelations(): Promise<RubberPurchaseRequisition[]>;
}
