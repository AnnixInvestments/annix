import { Company } from "../../platform/entities/company.entity";
import { DeliveryNoteItem } from "./delivery-note-item.entity";
import { JobCard } from "./job-card.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlLocation } from "./stock-control-location.entity";
import { StockMovement } from "./stock-movement.entity";

export class StockItem {
  id: number;

  sku: string;

  name: string;

  description: string | null;

  category: string | null;

  unitOfMeasure: string;

  costPerUnit: number;

  quantity: number;

  minStockLevel: number;

  location: string | null;

  locationEntity: StockControlLocation | null;

  locationId: number | null;

  photoUrl: string | null;

  needsQrPrint: boolean;

  company: StockControlCompany;

  companyId: number;

  allocations: StockAllocation[];

  movements: StockMovement[];

  deliveryNoteItems: DeliveryNoteItem[];

  thicknessMm: number | null;

  widthMm: number | null;

  lengthM: number | null;

  color: string | null;

  compoundCode: string | null;

  packSizeLitres: number | null;

  componentGroup: string | null;

  componentRole: string | null;

  mixRatio: string | null;

  rollNumber: string | null;

  rollNumbers: string[] | null;

  sourceRollNumber: string | null;

  isLeftover: boolean;

  sourceJobCard: JobCard | null;

  sourceJobCardId: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
