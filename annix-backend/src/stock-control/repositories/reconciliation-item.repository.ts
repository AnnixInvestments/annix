import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ReconciliationItem } from "../entities/reconciliation-item.entity";

export abstract class ReconciliationItemRepository extends CrudRepository<ReconciliationItem> {
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationItem[]>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationItem[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<ReconciliationItem | null>;
  abstract maxSortOrder(companyId: number, jobCardId: number): Promise<number>;
  abstract buildMany(rows: DeepPartial<ReconciliationItem>[]): ReconciliationItem[];
  abstract saveMany(entities: ReconciliationItem[]): Promise<ReconciliationItem[]>;
}
