import { RubberCompany } from "./rubber-company.entity";

export class RubberOrderImportCorrection {
  id: number;

  company: RubberCompany;

  companyId: number | null;

  companyName: string | null;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  correctedBy: string | null;

  createdAt: Date;
}
