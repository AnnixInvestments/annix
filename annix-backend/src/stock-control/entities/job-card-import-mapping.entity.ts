import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export interface FieldMapping {
  column: number;
  startRow: number;
  endRow: number;
}

export interface CustomFieldMapping {
  fieldName: string;
  column: number;
  startRow: number;
  endRow: number;
}

export interface ImportMappingConfig {
  jobNumber: FieldMapping | null;
  jcNumber: FieldMapping | null;
  pageNumber: FieldMapping | null;
  jobName: FieldMapping | null;
  customerName: FieldMapping | null;
  description: FieldMapping | null;
  poNumber: FieldMapping | null;
  siteLocation: FieldMapping | null;
  contactPerson: FieldMapping | null;
  dueDate: FieldMapping | null;
  notes: FieldMapping | null;
  reference: FieldMapping | null;
  customFields: CustomFieldMapping[];
  lineItems: {
    itemCode: FieldMapping | null;
    itemDescription: FieldMapping | null;
    itemNo: FieldMapping | null;
    quantity: FieldMapping | null;
    jtNo: FieldMapping | null;
  };
}

export class JobCardImportMapping {
  id: number;

  companyId: number;

  company: StockControlCompany;

  mappingConfig: ImportMappingConfig | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
