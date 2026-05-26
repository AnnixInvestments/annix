import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberOrderImportCorrection } from "../entities/rubber-order-import-correction.entity";

export abstract class RubberOrderImportCorrectionRepository extends CrudRepository<RubberOrderImportCorrection> {
  abstract saveMany(
    rows: Partial<RubberOrderImportCorrection>[],
  ): Promise<RubberOrderImportCorrection[]>;
  abstract findOneByFieldAndOriginalValueLatest(
    fieldName: string,
    originalValue: string,
  ): Promise<RubberOrderImportCorrection | null>;
  abstract findByCompanyNameLatest(
    companyName: string,
    take: number,
  ): Promise<RubberOrderImportCorrection[]>;
}
