import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, Repository } from "typeorm";
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
    private readonly dataSource: DataSource,
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
      take: limit,
      skip: (page - 1) * limit,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stockItem = await queryRunner.manager.findOne(StockItem, {
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

      await queryRunner.manager.save(StockItem, stockItem);

      const movement = queryRunner.manager.create(StockMovement, {
        stockItem,
        movementType: data.movementType,
        quantity: data.quantity,
        referenceType: ReferenceType.MANUAL,
        notes: data.notes || null,
        createdBy: data.createdBy || null,
        companyId,
      });

      const saved = await queryRunner.manager.save(StockMovement, movement);

      await queryRunner.commitTransaction();

      if (
        (data.movementType === MovementType.OUT ||
          data.movementType === MovementType.ADJUSTMENT) &&
        stockItem.minStockLevel > 0 &&
        stockItem.quantity < stockItem.minStockLevel
      ) {
        this.requisitionService
          .createReorderRequisition(companyId, stockItem.id)
          .catch((err) =>
            this.logger.error(`Failed to create reorder requisition: ${err.message}`),
          );
      }

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async movementsByItem(companyId: number, stockItemId: number): Promise<StockMovement[]> {
    return this.movementRepo.find({
      where: { stockItem: { id: stockItemId }, companyId },
      order: { createdAt: "DESC" },
    });
  }
}
