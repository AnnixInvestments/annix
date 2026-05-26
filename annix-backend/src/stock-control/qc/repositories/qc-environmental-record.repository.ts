import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcEnvironmentalRecord } from "../entities/qc-environmental-record.entity";

export type QcEnvironmentalRecordWithJob = QcEnvironmentalRecord & {
  jobNumber: string | null;
  jcNumber: string | null;
};

export abstract class QcEnvironmentalRecordRepository extends CrudRepository<QcEnvironmentalRecord> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcEnvironmentalRecord[]>;
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<QcEnvironmentalRecord[]>;
  abstract findForJobCardInRange(
    companyId: number,
    jobCardId: number,
    startDate: string,
    endDate: string,
  ): Promise<QcEnvironmentalRecord[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcEnvironmentalRecord | null>;
  abstract findByJobCardAndDate(
    companyId: number,
    jobCardId: number,
    recordDate: string | undefined,
  ): Promise<QcEnvironmentalRecord | null>;
  abstract countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    recordDate: string,
  ): Promise<number>;
  abstract findAllWithJobInfo(companyId: number): Promise<QcEnvironmentalRecordWithJob[]>;
}
