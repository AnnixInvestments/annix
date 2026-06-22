import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DispatchScan } from "../entities/dispatch-scan.entity";

export abstract class DispatchScanRepository extends TenantScopedRepository<DispatchScan> {
  abstract withTransaction(context: TransactionContext): DispatchScanRepository;
  abstract saveForCompany(companyId: number, entity: DispatchScan): Promise<DispatchScan>;
  abstract removeForCompany(companyId: number, entity: DispatchScan): Promise<void>;
  abstract findForJobCardItem(jobCardId: number, stockItemId: number): Promise<DispatchScan[]>;
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]>;
  abstract findHistoryForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]>;
  abstract findOneForCompanyWithJobCard(
    scanId: number,
    companyId: number,
  ): Promise<DispatchScan | null>;
}
