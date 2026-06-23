import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";

export abstract class RubberPriceListItemRepository extends TenantScopedRepository<RubberPriceListItem> {
  abstract withTransaction(context: TransactionContext): RubberPriceListItemRepository;
  abstract saveForCompany(
    companyId: number,
    entity: RubberPriceListItem,
  ): Promise<RubberPriceListItem>;
  abstract removeForCompany(companyId: number, entity: RubberPriceListItem): Promise<void>;
  abstract findAllForCompany(companyId: number): Promise<RubberPriceListItem[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<RubberPriceListItem | null>;
  abstract deleteAllForCompany(companyId: number): Promise<number>;
}
