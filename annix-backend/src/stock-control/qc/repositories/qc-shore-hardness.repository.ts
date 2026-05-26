import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";

export type QcShoreHardnessWithJob = QcShoreHardness & {
  jobNumber: string | null;
  jcNumber: string | null;
};

export abstract class QcShoreHardnessRepository extends CrudRepository<QcShoreHardness> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcShoreHardness[]>;
  abstract findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcShoreHardness[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcShoreHardness | null>;
  abstract countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    readingDate: string,
  ): Promise<number>;
  abstract findAllWithJobInfo(companyId: number): Promise<QcShoreHardnessWithJob[]>;
}
