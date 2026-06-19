import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export enum MovementType {
  IN = "in",
  OUT = "out",
  ADJUSTMENT = "adjustment",
}

export enum ReferenceType {
  ALLOCATION = "allocation",
  DELIVERY = "delivery",
  IMPORT = "import",
  ISSUANCE = "issuance",
  MANUAL = "manual",
  RETURN = "return",
  STOCK_TAKE = "stock_take",
}

export class StockMovement {
  id: number;

  stockItemId: number;

  stockItem: StockItem;

  movementType: MovementType;

  quantity: number;

  referenceType: ReferenceType | null;

  referenceId: number | null;

  notes: string | null;

  createdBy: string | null;

  company: StockControlCompany;

  companyId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
