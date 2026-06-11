import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
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
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
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
  ): Promise<StockMovement> {
    const stockItem = await this.stockItemRepo.findOneForCompany(data.stockItemId, companyId);
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

    await this.stockItemRepo.save(stockItem);

    const saved = await this.movementRepo.create({
      stockItemId: stockItem.id,
      movementType: data.movementType,
      quantity: data.quantity,
      referenceType: data.referenceType ?? ReferenceType.MANUAL,
      referenceId: data.referenceId ?? null,
      notes: data.notes || null,
      createdBy: data.createdBy || null,
      companyId,
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
