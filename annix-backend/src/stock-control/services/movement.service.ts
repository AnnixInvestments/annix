import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { RequisitionService } from "./requisition.service";

@Injectable()
export class MovementService {
  private readonly logger = new Logger(MovementService.name);

  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
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
      limit?: number;
    },
  ): Promise<StockMovement[]> {
    const where: Record<string, unknown> = { companyId };

    if (filters?.stockItemId) {
      where.stockItem = { id: filters.stockItemId };
    }

    if (filters?.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    return this.movementRepo.find({
      where,
      relations: ["stockItem"],
      order: { createdAt: "DESC" },
      take: filters?.limit || 100,
    });
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
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: data.stockItemId, companyId },
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

    await this.stockItemRepo.save(stockItem);

    const movement = this.movementRepo.create({
      stockItem,
      movementType: data.movementType,
      quantity: data.quantity,
      referenceType: ReferenceType.MANUAL,
      notes: data.notes || null,
      createdBy: data.createdBy || null,
      companyId,
    });

    const saved = await this.movementRepo.save(movement);

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
    return this.movementRepo.find({
      where: { stockItem: { id: stockItemId }, companyId },
      order: { createdAt: "DESC" },
    });
  }
}
