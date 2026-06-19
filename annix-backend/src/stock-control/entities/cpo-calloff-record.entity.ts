import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { JobCard } from "./job-card.entity";
import { Requisition } from "./requisition.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum CalloffType {
  RUBBER = "rubber",
  PAINT = "paint",
  SOLUTION = "solution",
}

export enum CalloffStatus {
  PENDING = "pending",
  CALLED_OFF = "called_off",
  DELIVERED = "delivered",
  INVOICED = "invoiced",
}

export class CpoCalloffRecord {
  id: number;

  company: StockControlCompany;

  companyId: number;

  cpo: CustomerPurchaseOrder;

  cpoId: number;

  jobCard: JobCard | null;

  jobCardId: number | null;

  requisition: Requisition | null;

  requisitionId: number | null;

  calloffType: CalloffType;

  status: CalloffStatus;

  calledOffAt: Date | null;

  deliveredAt: Date | null;

  invoicedAt: Date | null;

  lastInvoiceReminderAt: Date | null;

  notes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
