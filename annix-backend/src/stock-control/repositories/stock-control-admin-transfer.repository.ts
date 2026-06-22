import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";

export abstract class StockControlAdminTransferRepository extends TenantScopedRepository<StockControlAdminTransfer> {
  abstract withTransaction(context: TransactionContext): StockControlAdminTransferRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlAdminTransfer,
  ): Promise<StockControlAdminTransfer>;
  abstract removeForCompany(companyId: number, entity: StockControlAdminTransfer): Promise<void>;
  abstract findPendingForCompany(companyId: number): Promise<StockControlAdminTransfer | null>;
  abstract findPendingForCompanyWithInitiator(
    companyId: number,
  ): Promise<StockControlAdminTransfer | null>;
  abstract findPendingByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlAdminTransfer | null>;
  abstract findByStatusToken(
    token: string,
    status: AdminTransferStatus,
  ): Promise<StockControlAdminTransfer | null>;
}
