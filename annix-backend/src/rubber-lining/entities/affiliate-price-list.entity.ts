export enum PriceListStatus {
  PENDING = "PENDING",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
}

export class AffiliatePriceList {
  id: number;

  affiliateId: number | null;

  originalFilename: string;

  storagePath: string;

  status: PriceListStatus;

  itemCount: number;

  uploadedBy: string;

  uploadedAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
