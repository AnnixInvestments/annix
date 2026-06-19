import { Company } from "../../platform/entities/company.entity";
import { DeliveryNote } from "./delivery-note.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockItem } from "./stock-item.entity";

export class DeliveryNoteItem {
  id: number;

  deliveryNote: DeliveryNote;

  stockItem: StockItem;

  quantityReceived: number;

  rollNumber: string | null;

  weightKg: number | null;

  photoUrl: string | null;

  company: StockControlCompany;

  companyId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;
}
