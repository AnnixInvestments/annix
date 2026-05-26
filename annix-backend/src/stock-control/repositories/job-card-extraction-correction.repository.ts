import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";

export abstract class JobCardExtractionCorrectionRepository extends CrudRepository<JobCardExtractionCorrection> {
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardExtractionCorrection[]>;
  abstract findRecentForCustomer(
    companyId: number,
    customerName: string,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]>;
  abstract findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]>;
}
