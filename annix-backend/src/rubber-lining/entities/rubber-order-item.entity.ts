import { RubberOrder } from "./rubber-order.entity";
import { RubberProduct } from "./rubber-product.entity";

export interface CallOffEvent {
  timestamp: number;
  status: number;
  createdBy?: string;
  notes?: string;
}

export interface CallOff {
  quantity: number;
  quantityRemaining: number;
  events: CallOffEvent[];
  notes?: string;
  createdBy?: string;
  createdAt?: number;
}

export class RubberOrderItem {
  id: number;

  orderId: number;

  order: RubberOrder;

  productFirebaseUid: string | null;

  productId: number | null;

  product: RubberProduct | null;

  thickness: number | null;

  width: number | null;

  length: number | null;

  quantity: number | null;

  cpoUnitPrice: number | null;

  pricePerKg: number | null;

  callOffs: CallOff[];

  createdByFirebaseUid: string | null;

  updatedByFirebaseUid: string | null;

  createdAt: Date;

  updatedAt: Date;
}
