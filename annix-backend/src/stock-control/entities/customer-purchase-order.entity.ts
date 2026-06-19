import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrderItem } from "./customer-purchase-order-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export interface CpoPreviousVersion {
  versionNumber: number;
  archivedAt: string;
  jobName: string | null;
  customerName: string | null;
  poNumber: string | null;
  totalItems: number;
  totalQuantity: number;
  items: {
    itemCode: string | null;
    itemDescription: string | null;
    itemNo: string | null;
    quantityOrdered: number;
    quantityFulfilled: number;
    jtNo: string | null;
    m2: number | null;
  }[];
}

export enum CpoStatus {
  ACTIVE = "active",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
}

export class CustomerPurchaseOrder {
  id: number;

  company: StockControlCompany;

  companyId: number;

  cpoNumber: string;

  jobNumber: string;

  jobName: string | null;

  customerName: string | null;

  poNumber: string | null;

  siteLocation: string | null;

  contactPerson: string | null;

  dueDate: string | null;

  notes: string | null;

  coatingSpecs: string | null;

  reference: string | null;

  customFields: Record<string, string> | null;

  status: CpoStatus;

  totalItems: number;

  totalQuantity: number;

  fulfilledQuantity: number;

  sourceFilePath: string | null;

  sourceFileName: string | null;

  versionNumber: number;

  previousVersions: CpoPreviousVersion[];

  createdBy: string | null;

  items: CustomerPurchaseOrderItem[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
