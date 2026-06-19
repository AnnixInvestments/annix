import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { JobCard } from "./job-card.entity";
import { RequisitionItem } from "./requisition-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum RequisitionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  ORDERED = "ordered",
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received",
  CANCELLED = "cancelled",
}

export enum RequisitionSource {
  JOB_CARD = "job_card",
  REORDER = "reorder",
  CPO = "cpo",
}

export class Requisition {
  id: number;

  requisitionNumber: string;

  jobCardId: number | null;

  jobCard: JobCard | null;

  source: RequisitionSource;

  status: RequisitionStatus;

  notes: string | null;

  createdBy: string | null;

  company: StockControlCompany;

  companyId: number;

  cpo: CustomerPurchaseOrder | null;

  cpoId: number | null;

  isCalloffOrder: boolean;

  items: RequisitionItem[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
