import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";

export type QcBlastProfileWithJob = QcBlastProfile & {
  jobNumber: string | null;
  jcNumber: string | null;
};

export abstract class QcBlastProfileRepository extends CrudRepository<QcBlastProfile> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcBlastProfile[]>;
  abstract findForJobCardOrderedByReadingDateAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcBlastProfile[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcBlastProfile | null>;
  abstract countForJobCardOnDate(
    companyId: number,
    jobCardId: number,
    readingDate: string,
  ): Promise<number>;
  abstract findAllWithJobInfo(companyId: number): Promise<QcBlastProfileWithJob[]>;
}
