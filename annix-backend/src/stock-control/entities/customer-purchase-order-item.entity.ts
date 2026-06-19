import { Company } from "../../platform/entities/company.entity";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class CustomerPurchaseOrderItem {
  id: number;

  cpoId: number;

  cpo: CustomerPurchaseOrder;

  companyId: number;

  company: StockControlCompany;

  itemCode: string | null;

  itemDescription: string | null;

  itemNo: string | null;

  quantityOrdered: number;

  quantityFulfilled: number;

  jtNo: string | null;

  m2: number | null;

  sortOrder: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
