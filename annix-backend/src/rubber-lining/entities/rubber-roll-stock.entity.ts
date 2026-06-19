import { RubberCompany } from "./rubber-company.entity";
import { RubberProductCoding } from "./rubber-product-coding.entity";
import { RubberStockLocation } from "./rubber-stock-location.entity";

export enum RollStockStatus {
  IN_STOCK = "IN_STOCK",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  SCRAPPED = "SCRAPPED",
  REJECTED = "REJECTED",
}

export class RubberRollStock {
  id: number;

  firebaseUid: string;

  rollNumber: string;

  compoundCodingId: number | null;

  compoundCoding: RubberProductCoding | null;

  weightKg: number;

  widthMm: number | null;

  thicknessMm: number | null;

  lengthM: number | null;

  status: RollStockStatus;

  linkedBatchIds: number[];

  deliveryNoteItemId: number | null;

  soldToCompanyId: number | null;

  soldToCompany: RubberCompany | null;

  auCocId: number | null;

  reservedBy: string | null;

  reservedAt: Date | null;

  soldAt: Date | null;

  location: string | null;

  locationId: number | null;

  stockLocation: RubberStockLocation | null;

  notes: string | null;

  costZar: number | null;

  tollCostR: number | null;

  compoundCostR: number | null;

  totalCostR: number | null;

  priceZar: number | null;

  productionDate: Date | null;

  supplierTaxInvoiceId: number | null;

  supplierTaxInvoiceLineIdx: number | null;

  customerTaxInvoiceId: number | null;

  customerDeliveryNoteId: number | null;

  supplierDeliveryNoteId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
