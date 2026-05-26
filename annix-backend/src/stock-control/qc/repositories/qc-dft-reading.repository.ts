import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { DftCoatType, QcDftReading } from "../entities/qc-dft-reading.entity";

export type QcDftReadingWithJob = QcDftReading & {
  jobNumber: string | null;
  jcNumber: string | null;
};

export abstract class QcDftReadingRepository extends CrudRepository<QcDftReading> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcDftReading[]>;
  abstract findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcDftReading[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcDftReading | null>;
  abstract countForJobCardCoatOnDate(
    companyId: number,
    jobCardId: number,
    coatType: DftCoatType,
    readingDate: string,
  ): Promise<number>;
  abstract findAllWithJobInfo(companyId: number): Promise<QcDftReadingWithJob[]>;
}
