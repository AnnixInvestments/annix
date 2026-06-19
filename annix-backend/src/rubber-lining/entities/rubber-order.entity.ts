import { RubberCompany } from "./rubber-company.entity";
import { RubberOrderItem } from "./rubber-order-item.entity";

export enum RubberOrderStatus {
  NEW = -1,
  DRAFT = 0,
  CANCELLED = 1,
  PARTIALLY_SUBMITTED = 2,
  SUBMITTED = 3,
  MANUFACTURING = 4,
  DELIVERING = 5,
  COMPLETE = 6,
}

export interface StatusHistoryEvent {
  timestamp: number;
  fromStatus: RubberOrderStatus;
  toStatus: RubberOrderStatus;
  changedBy?: string;
  notes?: string;
}

export class RubberOrder {
  id: number;

  firebaseUid: string;

  orderNumber: string;

  companyOrderNumber: string | null;

  status: RubberOrderStatus;

  companyFirebaseUid: string | null;

  companyId: number | null;

  company: RubberCompany | null;

  items: RubberOrderItem[];

  createdByFirebaseUid: string | null;

  updatedByFirebaseUid: string | null;

  statusHistory: StatusHistoryEvent[];

  createdAt: Date;

  updatedAt: Date;
}
