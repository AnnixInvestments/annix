import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";

export abstract class CpoCalloffRecordRepository extends TenantScopedRepository<CpoCalloffRecord> {
  abstract withTransaction(context: TransactionContext): CpoCalloffRecordRepository;
  abstract saveForCompany(companyId: number, entity: CpoCalloffRecord): Promise<CpoCalloffRecord>;
  abstract removeForCompany(companyId: number, entity: CpoCalloffRecord): Promise<void>;
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<CpoCalloffRecord[]>;
  abstract findForCpoWithJobCard(cpoId: number, companyId: number): Promise<CpoCalloffRecord[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<CpoCalloffRecord | null>;
  abstract findOverdueNeedingReminder(
    twentyOneDaysAgo: Date,
    sevenDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]>;
  abstract markReminderSent(ids: number[], reminderAt: Date): Promise<void>;
  abstract countByStatus(companyId: number, status: CalloffStatus): Promise<number>;
  abstract countOverdueDelivered(companyId: number, twentyOneDaysAgo: Date): Promise<number>;
  abstract findOverdueForCpoWithJobCard(
    cpoId: number,
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]>;
  abstract findCalledOffWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]>;
  abstract findForCompanyWithCpo(companyId: number): Promise<CpoCalloffRecord[]>;
  abstract findOverdueDeliveredWithCpoAndJobCard(
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]>;
  abstract findForCompanyWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]>;
}
