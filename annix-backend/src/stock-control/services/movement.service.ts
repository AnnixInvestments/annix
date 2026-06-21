import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { RequisitionService } from "./requisition.service";

@Injectable()
export class MovementService {
  private readonly logger = new Logger(MovementService.name);

  constructor(
    private readonly movementRepo: StockMovementRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly txRunner: TransactionRunner,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly auditService: AuditService,
  ) {}

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
      referenceType?: ReferenceType;
      referenceId?: number;
    },
    userId?: number,
  ): Promise<StockMovement> {
    const stockItem = await this.stockItemRepo.findOneForCompany(data.stockItemId, companyId);
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const saved = await this.txRunner.run(async (ctx) => {
      const stockItemTx = this.stockItemRepo.withTransaction(ctx);
      const movementTx = this.movementRepo.withTransaction(ctx);

      if (data.movementType === MovementType.IN) {
        await stockItemTx.incrementQuantityForCompany(stockItem.id, companyId, data.quantity);
      } else if (data.movementType === MovementType.OUT) {
        const decremented = await stockItemTx.decrementQuantityForCompany(
          stockItem.id,
          companyId,
          data.quantity,
          true,
        );
        if (!decremented) {
          await stockItemTx.setQuantityForCompany(stockItem.id, companyId, 0);
        }
      } else {
        await stockItemTx.setQuantityForCompany(stockItem.id, companyId, data.quantity);
      }

      return movementTx.create({
        stockItemId: stockItem.id,
        movementType: data.movementType,
        quantity: data.quantity,
        referenceType: data.referenceType ?? ReferenceType.MANUAL,
        referenceId: data.referenceId ?? null,
        notes: data.notes || null,
        createdBy: data.createdBy || null,
        companyId,
      });
    });

    if (data.movementType === MovementType.OUT || data.movementType === MovementType.ADJUSTMENT) {
      this.checkReorderThreshold(companyId, stockItem.id).catch((err) =>
        this.logger.error(`Failed to evaluate reorder threshold: ${err.message}`),
      );
    }

    this.auditService
      .log({
        entityType: "stock_movement",
        entityId: saved.id,
        action: AuditAction.UPDATE,
        newValues: {
          companyId,
          userId: userId ?? null,
          stockItemId: stockItem.id,
          movementType: data.movementType,
          quantity: data.quantity,
          referenceType: saved.referenceType,
          referenceId: saved.referenceId,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    return saved;
  }

  private async checkReorderThreshold(companyId: number, stockItemId: number): Promise<void> {
    const refreshed = await this.stockItemRepo.findOneForCompany(stockItemId, companyId);
    if (refreshed && refreshed.minStockLevel > 0 && refreshed.quantity < refreshed.minStockLevel) {
      await this.requisitionService.createReorderRequisition(companyId, stockItemId);
    }
  }

  async movementsByItem(companyId: number, stockItemId: number): Promise<StockMovement[]> {
    return this.movementRepo.findByItemForCompany(companyId, stockItemId);
  }
}
