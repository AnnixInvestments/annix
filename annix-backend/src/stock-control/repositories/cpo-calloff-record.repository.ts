import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";

export abstract class CpoCalloffRecordRepository extends CrudRepository<CpoCalloffRecord> {
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
