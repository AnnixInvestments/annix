import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { DeliveryNote } from "./delivery-note.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class DnExtractionCorrection {
  id: number;

  company: StockControlCompany;

  companyId: number;

  supplierName: string;

  deliveryNote: DeliveryNote;

  deliveryNoteId: number;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  itemDescription: string | null;

  itemIndex: number | null;

  correctedByUser: StockControlUser | null;

  correctedBy: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCorrectedByUser?: User | null;

  unifiedCorrectedBy?: number | null;

  createdAt: Date;
}
