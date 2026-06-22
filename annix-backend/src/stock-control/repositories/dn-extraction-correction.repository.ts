import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DnExtractionCorrection } from "../entities/dn-extraction-correction.entity";

export abstract class DnExtractionCorrectionRepository extends TenantScopedRepository<DnExtractionCorrection> {
  abstract withTransaction(context: TransactionContext): DnExtractionCorrectionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: DnExtractionCorrection,
  ): Promise<DnExtractionCorrection>;
  abstract removeForCompany(companyId: number, entity: DnExtractionCorrection): Promise<void>;
  abstract createMany(
    rows: Array<DeepPartial<DnExtractionCorrection>>,
  ): Promise<DnExtractionCorrection[]>;
  abstract findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<DnExtractionCorrection[]>;
}
