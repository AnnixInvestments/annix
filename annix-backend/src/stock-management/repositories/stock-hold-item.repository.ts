import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { type StockHoldDispositionStatus, StockHoldItem } from "../entities/stock-hold-item.entity";

export abstract class StockHoldItemRepository extends CrudRepository<StockHoldItem> {
  abstract build(data: DeepPartial<StockHoldItem>): StockHoldItem;
  abstract findPendingForCompany(companyId: number): Promise<StockHoldItem[]>;
  abstract findAllForCompany(
    companyId: number,
    status: StockHoldDispositionStatus | undefined,
  ): Promise<StockHoldItem[]>;
  abstract findByIdForCompanyWithDetail(
    companyId: number,
    id: number,
  ): Promise<StockHoldItem | null>;
}
