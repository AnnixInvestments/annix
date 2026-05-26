import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { RequisitionService } from "./requisition.service";

@Injectable()
export class MovementService {
  private readonly logger = new Logger(MovementService.name);

  constructor(
    private readonly movementRepo: StockMovementRepository,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly txRunner: TransactionRunner,
  ) {}

  private transactionManager(context: TransactionContext) {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("MovementService transactions require a TypeOrmTransactionContext");
    }
    return context.manager;
  }

  async findAll(
    companyId: number,
    filters?: {
      stockItemId?: number;
      movementType?: MovementType;
      startDate?: string;
      endDate?: string;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<StockMovement[]> {
    return this.movementRepo.findFilteredForCompany(companyId, filters, page, limit);
  }

  async createManualAdjustment(
    companyId: number,
    data: {
      stockItemId: number;
      movementType: MovementType;
      quantity: number;
      notes?: string;
      createdBy?: string;
    },
  ): Promise<StockMovement> {
    const { saved, stockItem } = await this.txRunner.run(async (ctx) => {
      const manager = this.transactionManager(ctx);

      const stockItem = await manager.findOne(StockItem, {
        where: { id: data.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });
      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }

      if (data.movementType === MovementType.IN) {
        stockItem.quantity = stockItem.quantity + data.quantity;
      } else if (data.movementType === MovementType.OUT) {
        stockItem.quantity = Math.max(0, stockItem.quantity - data.quantity);
      } else {
        stockItem.quantity = data.quantity;
      }

      await manager.save(StockItem, stockItem);

      const movement = manager.create(StockMovement, {
        stockItem,
        movementType: data.movementType,
        quantity: data.quantity,
        referenceType: ReferenceType.MANUAL,
        notes: data.notes || null,
        createdBy: data.createdBy || null,
        companyId,
      });

      const saved = await manager.save(StockMovement, movement);

      return { saved, stockItem };
    });

    if (
      (data.movementType === MovementType.OUT || data.movementType === MovementType.ADJUSTMENT) &&
      stockItem.minStockLevel > 0 &&
      stockItem.quantity < stockItem.minStockLevel
    ) {
      this.requisitionService
        .createReorderRequisition(companyId, stockItem.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    return saved;
  }

  async movementsByItem(companyId: number, stockItemId: number): Promise<StockMovement[]> {
    return this.movementRepo.findByItemForCompany(companyId, stockItemId);
  }
}
