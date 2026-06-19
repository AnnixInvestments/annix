import { Company } from "../../platform/entities/company.entity";
import { Requisition } from "./requisition.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export class RequisitionItem {
  id: number;

  requisitionId: number;

  requisition: Requisition;

  stockItemId: number | null;

  stockItem: StockItem | null;

  productName: string;

  area: string | null;

  litresRequired: number;

  packSizeLitres: number;

  packsToOrder: number;

  quantityRequired: number | null;

  reorderQty: number | null;

  reqNumber: string | null;

  company: StockControlCompany;

  companyId: number;

  quantityReceived: number;

  linkedDeliveryNoteId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;
}
