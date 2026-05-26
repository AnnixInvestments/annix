import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CalloffStatus, CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";
import { CpoCalloffRecordRepository } from "./cpo-calloff-record.repository";

@Injectable()
export class PostgresCpoCalloffRecordRepository
  extends TypeOrmCrudRepository<CpoCalloffRecord>
  implements CpoCalloffRecordRepository
{
  constructor(@InjectRepository(CpoCalloffRecord) repository: Repository<CpoCalloffRecord>) {
    super(repository);
  }

  findForJobCard(jobCardId: number, companyId: number): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
    });
  }

  findForCpoWithJobCard(cpoId: number, companyId: number): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: { cpoId, companyId },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<CpoCalloffRecord | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  findOverdueNeedingReminder(
    twentyOneDaysAgo: Date,
    sevenDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    const baseConditions = {
      status: CalloffStatus.DELIVERED,
      deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
      invoicedAt: IsNull(),
    };
    return this.repository.find({
      where: [
        { ...baseConditions, lastInvoiceReminderAt: IsNull() },
        { ...baseConditions, lastInvoiceReminderAt: LessThanOrEqual(sevenDaysAgo) },
      ],
      relations: ["cpo", "jobCard"],
    });
  }

  async markReminderSent(ids: number[], reminderAt: Date): Promise<void> {
    await this.repository.update(ids, { lastInvoiceReminderAt: reminderAt });
  }

  countByStatus(companyId: number, status: CalloffStatus): Promise<number> {
    return this.repository.count({ where: { companyId, status } });
  }

  countOverdueDelivered(companyId: number, twentyOneDaysAgo: Date): Promise<number> {
    return this.repository.count({
      where: {
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
      },
    });
  }

  findOverdueForCpoWithJobCard(
    cpoId: number,
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: {
        cpoId,
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
      relations: ["jobCard"],
    });
  }

  findCalledOffWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: { companyId, status: CalloffStatus.CALLED_OFF },
      relations: ["cpo", "jobCard"],
    });
  }

  findForCompanyWithCpo(companyId: number): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["cpo"],
    });
  }

  findOverdueDeliveredWithCpoAndJobCard(
    companyId: number,
    twentyOneDaysAgo: Date,
  ): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: {
        companyId,
        status: CalloffStatus.DELIVERED,
        deliveredAt: LessThanOrEqual(twentyOneDaysAgo),
        invoicedAt: IsNull(),
      },
      relations: ["cpo", "jobCard"],
    });
  }

  findForCompanyWithCpoAndJobCard(companyId: number): Promise<CpoCalloffRecord[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["cpo", "jobCard"],
    });
  }
}
