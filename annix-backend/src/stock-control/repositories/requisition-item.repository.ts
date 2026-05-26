import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { RequisitionItem } from "../entities/requisition-item.entity";

export abstract class RequisitionItemRepository extends CrudRepository<RequisitionItem> {
  abstract findOneForCompanyWithStockItem(
    id: number,
    companyId: number,
  ): Promise<RequisitionItem | null>;
  abstract findOneForRequisition(
    id: number,
    requisitionId: number,
    companyId: number,
  ): Promise<RequisitionItem | null>;
  abstract buildMany(rows: DeepPartial<RequisitionItem>[]): RequisitionItem[];
  abstract saveMany(entities: RequisitionItem[]): Promise<RequisitionItem[]>;
}
