import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";

export abstract class JobCardImportMappingRepository extends TenantScopedRepository<JobCardImportMapping> {
  abstract withTransaction(context: TransactionContext): JobCardImportMappingRepository;
  abstract saveForCompany(
    companyId: number,
    entity: JobCardImportMapping,
  ): Promise<JobCardImportMapping>;
  abstract removeForCompany(companyId: number, entity: JobCardImportMapping): Promise<void>;
  abstract findForCompany(companyId: number): Promise<JobCardImportMapping | null>;
}
