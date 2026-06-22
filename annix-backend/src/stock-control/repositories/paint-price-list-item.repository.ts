import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";

export abstract class PaintPriceListItemRepository extends TenantScopedRepository<PaintPriceListItem> {
  abstract withTransaction(context: TransactionContext): PaintPriceListItemRepository;
  abstract saveForCompany(
    companyId: number,
    entity: PaintPriceListItem,
  ): Promise<PaintPriceListItem>;
  abstract removeForCompany(companyId: number, entity: PaintPriceListItem): Promise<void>;
  abstract findAllForCompany(companyId: number): Promise<PaintPriceListItem[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<PaintPriceListItem | null>;
}
