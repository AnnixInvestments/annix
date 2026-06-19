import { RubberCompany } from "./rubber-company.entity";

export enum RequisitionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  ORDERED = "ORDERED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export enum RequisitionSourceType {
  LOW_STOCK = "LOW_STOCK",
  MANUAL = "MANUAL",
  EXTERNAL_PO = "EXTERNAL_PO",
}

export const requisitionStatusLabels: Record<RequisitionStatus, string> = {
  [RequisitionStatus.PENDING]: "Pending Approval",
  [RequisitionStatus.APPROVED]: "Approved",
  [RequisitionStatus.ORDERED]: "Ordered",
  [RequisitionStatus.PARTIALLY_RECEIVED]: "Partially Received",
  [RequisitionStatus.RECEIVED]: "Received",
  [RequisitionStatus.CANCELLED]: "Cancelled",
};

export const requisitionSourceLabels: Record<RequisitionSourceType, string> = {
  [RequisitionSourceType.LOW_STOCK]: "Low Stock Alert",
  [RequisitionSourceType.MANUAL]: "Manual Request",
  [RequisitionSourceType.EXTERNAL_PO]: "External PO",
};

export class RubberPurchaseRequisition {
  id: number;

  firebaseUid: string;

  requisitionNumber: string;

  sourceType: RequisitionSourceType;

  status: RequisitionStatus;

  supplierCompanyId: number | null;

  supplierCompany: RubberCompany | null;

  externalPoNumber: string | null;

  externalPoDocumentPath: string | null;

  expectedDeliveryDate: Date | null;

  notes: string | null;

  createdBy: string | null;

  approvedBy: string | null;

  approvedAt: Date | null;

  rejectionReason: string | null;

  rejectedBy: string | null;

  rejectedAt: Date | null;

  orderedAt: Date | null;

  receivedAt: Date | null;

  items: RubberPurchaseRequisitionItem[];

  createdAt: Date;

  updatedAt: Date;
}

export enum RequisitionItemType {
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

export class RubberPurchaseRequisitionItem {
  id: number;

  requisitionId: number;

  requisition: RubberPurchaseRequisition;

  itemType: RequisitionItemType;

  compoundStockId: number | null;

  compoundCodingId: number | null;

  compoundName: string | null;

  quantityKg: number;

  quantityReceivedKg: number;

  unitPrice: number | null;

  notes: string | null;

  createdAt: Date;
}
