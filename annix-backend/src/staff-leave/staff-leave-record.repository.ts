import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { StaffLeaveRecord } from "./entities/staff-leave-record.entity";

export abstract class StaffLeaveRecordRepository extends CrudRepository<StaffLeaveRecord> {
  abstract instantiate(data: DeepPartial<StaffLeaveRecord>): StaffLeaveRecord;
  abstract findForMonth(
    companyId: number,
    monthStart: string,
    monthEnd: string,
  ): Promise<StaffLeaveRecord[]>;
  abstract findForUser(companyId: number, userId: number): Promise<StaffLeaveRecord[]>;
  abstract findByIdAndCompany(
    recordId: number,
    companyId: number,
  ): Promise<StaffLeaveRecord | null>;
  abstract findActiveForUser(
    companyId: number,
    userId: number,
    dateStr: string,
  ): Promise<StaffLeaveRecord | null>;
  abstract userIdsOnLeave(companyId: number, dateStr: string): Promise<number[]>;
}
