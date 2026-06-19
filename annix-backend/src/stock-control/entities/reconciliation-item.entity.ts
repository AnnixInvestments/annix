import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum ReconciliationSourceType {
  CPO = "cpo",
  JT_DN = "jt_dn",
  MANUAL = "manual",
}

export enum ReconciliationStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  COMPLETE = "complete",
  DISCREPANCY = "discrepancy",
}

export class ReconciliationItem {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  itemDescription: string;

  itemCode: string | null;

  sourceDocumentId: number | null;

  sourceType: ReconciliationSourceType;

  quantityOrdered: number;

  quantityReleased: number;

  quantityShipped: number;

  quantityMps: number;

  reconciliationStatus: ReconciliationStatus;

  notes: string | null;

  sortOrder: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
