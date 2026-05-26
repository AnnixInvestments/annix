import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";
import { StaffLeaveRecordRepository } from "./staff-leave-record.repository";

@Injectable()
export class PostgresStaffLeaveRecordRepository
  extends TypeOrmCrudRepository<StaffLeaveRecord>
  implements StaffLeaveRecordRepository
{
  constructor(@InjectRepository(StaffLeaveRecord) repository: Repository<StaffLeaveRecord>) {
    super(repository);
  }

  instantiate(data: DeepPartial<StaffLeaveRecord>): StaffLeaveRecord {
    return this.repository.create(data);
  }

  findForMonth(
    companyId: number,
    monthStart: string,
    monthEnd: string,
  ): Promise<StaffLeaveRecord[]> {
    return this.repository.find({
      where: {
        companyId,
        startDate: LessThanOrEqual(monthEnd),
        endDate: MoreThanOrEqual(monthStart),
      },
      relations: ["user"],
      order: { startDate: "ASC" },
    });
  }

  findForUser(companyId: number, userId: number): Promise<StaffLeaveRecord[]> {
    return this.repository.find({
      where: { companyId, userId },
      order: { startDate: "DESC" },
    });
  }

  findByIdAndCompany(recordId: number, companyId: number): Promise<StaffLeaveRecord | null> {
    return this.repository.findOne({
      where: { id: recordId, companyId },
    });
  }

  findActiveForUser(
    companyId: number,
    userId: number,
    dateStr: string,
  ): Promise<StaffLeaveRecord | null> {
    return this.repository.findOne({
      where: {
        companyId,
        userId,
        startDate: LessThanOrEqual(dateStr),
        endDate: MoreThanOrEqual(dateStr),
      },
    });
  }

  async userIdsOnLeave(companyId: number, dateStr: string): Promise<number[]> {
    const records = await this.repository.find({
      where: {
        companyId,
        startDate: LessThanOrEqual(dateStr),
        endDate: MoreThanOrEqual(dateStr),
      },
      select: ["userId"],
    });

    return records.map((r) => r.userId);
  }
}
