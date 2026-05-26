import { CrudRepository } from "../lib/persistence/crud-repository";
import type { PumpOrderListResponseDto, PumpOrderSummaryDto } from "./dto/pump-order-response.dto";
import { PumpOrder } from "./entities/pump-order.entity";
import type { PumpOrderQueryParams } from "./pump-order.service";

export abstract class PumpOrderRepository extends CrudRepository<PumpOrder> {
  abstract findAllPaged(params: PumpOrderQueryParams): Promise<PumpOrderListResponseDto>;
  abstract findByOrderNumber(orderNumber: string): Promise<PumpOrder | null>;
  abstract summary(): Promise<PumpOrderSummaryDto>;
  abstract updateTotals(
    id: number,
    totals: { subtotal: number; vatAmount: number; totalAmount: number },
  ): Promise<void>;
}
