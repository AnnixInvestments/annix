import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { DnExtractionCorrection } from "../entities/dn-extraction-correction.entity";

export abstract class DnExtractionCorrectionRepository extends CrudRepository<DnExtractionCorrection> {
  abstract createMany(
    rows: Array<DeepPartial<DnExtractionCorrection>>,
  ): Promise<DnExtractionCorrection[]>;
  abstract findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<DnExtractionCorrection[]>;
}
