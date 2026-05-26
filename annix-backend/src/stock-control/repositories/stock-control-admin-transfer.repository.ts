import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";

export abstract class StockControlAdminTransferRepository extends CrudRepository<StockControlAdminTransfer> {
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
