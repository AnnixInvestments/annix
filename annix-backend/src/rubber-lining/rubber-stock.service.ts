import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { generateUniqueId, now } from "../lib/datetime";
import {
  AdjustCompoundDto,
  CalculateCompoundDto,
  CompoundCalculationResultDto,
  CreateCompoundOpeningStockDto,
  CreateRubberCompoundOrderDto,
  CreateRubberCompoundStockDto,
  CreateRubberProductionDto,
  ImportCompoundOpeningStockResultDto,
  ImportCompoundOpeningStockRowDto,
  ReceiveCompoundDto,
  ReceiveCompoundOrderDto,
  RubberCompoundMovementDto,
  RubberCompoundOrderDto,
  RubberCompoundStockDto,
  RubberProductionDto,
  UpdateRubberCompoundOrderStatusDto,
  UpdateRubberCompoundStockDto,
} from "./dto/rubber-portal.dto";
import {
  CompoundMovementReferenceType,
  CompoundMovementType,
  RubberCompoundMovement,
} from "./entities/rubber-compound-movement.entity";
import {
  RubberCompoundOrder,
  RubberCompoundOrderStatus,
} from "./entities/rubber-compound-order.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberProduction, RubberProductionStatus } from "./entities/rubber-production.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";

const PRODUCTION_STATUS_LABELS: Record<RubberProductionStatus, string> = {
  [RubberProductionStatus.PENDING]: "Pending",
  [RubberProductionStatus.IN_PROGRESS]: "In Progress",
  [RubberProductionStatus.COMPLETED]: "Completed",
  [RubberProductionStatus.CANCELLED]: "Cancelled",
};

const COMPOUND_ORDER_STATUS_LABELS: Record<RubberCompoundOrderStatus, string> = {
  [RubberCompoundOrderStatus.PENDING]: "Pending",
  [RubberCompoundOrderStatus.APPROVED]: "Approved",
  [RubberCompoundOrderStatus.ORDERED]: "Ordered",
  [RubberCompoundOrderStatus.RECEIVED]: "Received",
  [RubberCompoundOrderStatus.CANCELLED]: "Cancelled",
};

@Injectable()
export class RubberStockService {
  constructor(
    @InjectRepository(RubberCompoundStock)
    private compoundStockRepository: Repository<RubberCompoundStock>,
    @InjectRepository(RubberCompoundMovement)
    private movementRepository: Repository<RubberCompoundMovement>,
    @InjectRepository(RubberProduction)
    private productionRepository: Repository<RubberProduction>,
    @InjectRepository(RubberCompoundOrder)
    private compoundOrderRepository: Repository<RubberCompoundOrder>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    @InjectRepository(RubberStockLocation)
    private stockLocationRepository: Repository<RubberStockLocation>,
  ) {}

  async allCompoundStocks(): Promise<RubberCompoundStockDto[]> {
    const stocks = await this.compoundStockRepository.find({
      relations: ["compoundCoding"],
      order: { id: "ASC" },
    });
    return stocks.map((s) => this.mapCompoundStockToDto(s));
  }

  async compoundStockById(id: number): Promise<RubberCompoundStockDto | null> {
    const stock = await this.compoundStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding"],
    });
    return stock ? this.mapCompoundStockToDto(stock) : null;
  }

  async createCompoundStock(dto: CreateRubberCompoundStockDto): Promise<RubberCompoundStockDto> {
    const coding = await this.productCodingRepository.findOne({
      where: { id: dto.compoundCodingId, codingType: ProductCodingType.COMPOUND },
    });
    if (!coding) {
      throw new BadRequestException("Invalid compound coding ID or coding is not a COMPOUND type");
    }

    const existing = await this.compoundStockRepository.findOne({
      where: { compoundCodingId: dto.compoundCodingId },
    });
    if (existing) {
      throw new BadRequestException("A stock entry already exists for this compound");
    }

    const stock = this.compoundStockRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      compoundCodingId: dto.compoundCodingId,
      quantityKg: dto.quantityKg ?? 0,
      minStockLevelKg: dto.minStockLevelKg ?? 0,
      reorderPointKg: dto.reorderPointKg ?? 0,
      costPerKg: dto.costPerKg ?? null,
      location: dto.location ?? null,
      batchNumber: dto.batchNumber ?? null,
    });
    const saved = await this.compoundStockRepository.save(stock);
    const result = await this.compoundStockRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundCoding"],
    });
    return this.mapCompoundStockToDto(result!);
  }

  async updateCompoundStock(
    id: number,
    dto: UpdateRubberCompoundStockDto,
  ): Promise<RubberCompoundStockDto | null> {
    const stock = await this.compoundStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding"],
    });
    if (!stock) return null;

    if (dto.compoundCodingId !== undefined) {
      const coding = await this.productCodingRepository.findOne({
        where: { id: dto.compoundCodingId, codingType: ProductCodingType.COMPOUND },
      });
      if (!coding) {
        throw new BadRequestException(
          "Invalid compound coding ID or coding is not a COMPOUND type",
        );
      }
      stock.compoundCodingId = dto.compoundCodingId;
    }
    if (dto.quantityKg !== undefined) stock.quantityKg = dto.quantityKg;
    if (dto.minStockLevelKg !== undefined) stock.minStockLevelKg = dto.minStockLevelKg;
    if (dto.reorderPointKg !== undefined) stock.reorderPointKg = dto.reorderPointKg;
    if (dto.costPerKg !== undefined) stock.costPerKg = dto.costPerKg ?? null;
    if (dto.location !== undefined) stock.location = dto.location ?? null;
    if (dto.batchNumber !== undefined) stock.batchNumber = dto.batchNumber ?? null;

    await this.compoundStockRepository.save(stock);
    const result = await this.compoundStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding"],
    });
    return this.mapCompoundStockToDto(result!);
  }

  async deleteCompoundStock(id: number): Promise<boolean> {
    const result = await this.compoundStockRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async lowStockCompounds(): Promise<RubberCompoundStockDto[]> {
    const stocks = await this.compoundStockRepository
      .createQueryBuilder("stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .where("stock.quantity_kg < stock.reorder_point_kg")
      .orderBy("stock.quantity_kg", "ASC")
      .getMany();
    return stocks.map((s) => this.mapCompoundStockToDto(s));
  }

  async allMovements(filters?: {
    compoundStockId?: number;
    movementType?: CompoundMovementType;
    referenceType?: CompoundMovementReferenceType;
  }): Promise<RubberCompoundMovementDto[]> {
    const query = this.movementRepository
      .createQueryBuilder("movement")
      .leftJoinAndSelect("movement.compoundStock", "stock")
      .leftJoinAndSelect("stock.compoundCoding", "coding")
      .orderBy("movement.created_at", "DESC");

    if (filters?.compoundStockId) {
      query.andWhere("movement.compound_stock_id = :stockId", {
        stockId: filters.compoundStockId,
      });
    }
    if (filters?.movementType) {
      query.andWhere("movement.movement_type = :type", { type: filters.movementType });
    }
    if (filters?.referenceType) {
      query.andWhere("movement.reference_type = :refType", { refType: filters.referenceType });
    }

    const movements = await query.getMany();
    return movements.map((m) => this.mapMovementToDto(m));
  }

  async movementsByCompound(compoundStockId: number): Promise<RubberCompoundMovementDto[]> {
    return this.allMovements({ compoundStockId });
  }

  async receiveCompound(dto: ReceiveCompoundDto): Promise<RubberCompoundMovementDto> {
    const stock = await this.compoundStockRepository.findOne({
      where: { id: dto.compoundStockId },
      relations: ["compoundCoding"],
    });
    if (!stock) {
      throw new NotFoundException("Compound stock not found");
    }

    stock.quantityKg = Number(stock.quantityKg) + dto.quantityKg;
    if (dto.batchNumber) {
      stock.batchNumber = dto.batchNumber;
    }
    await this.compoundStockRepository.save(stock);

    const movement = this.movementRepository.create({
      compoundStockId: dto.compoundStockId,
      movementType: CompoundMovementType.IN,
      quantityKg: dto.quantityKg,
      referenceType: CompoundMovementReferenceType.MANUAL,
      batchNumber: dto.batchNumber ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.movementRepository.save(movement);

    const result = await this.movementRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    return this.mapMovementToDto(result!);
  }

  async createCompoundOpeningStock(
    dto: CreateCompoundOpeningStockDto,
  ): Promise<RubberCompoundStockDto> {
    const coding = await this.productCodingRepository.findOne({
      where: { id: dto.compoundCodingId, codingType: ProductCodingType.COMPOUND },
    });
    if (!coding) {
      throw new BadRequestException("Invalid compound coding ID or coding is not a COMPOUND type");
    }

    const existing = await this.compoundStockRepository.findOne({
      where: { compoundCodingId: dto.compoundCodingId },
    });
    if (existing) {
      throw new BadRequestException(
        "A stock entry already exists for this compound. Use 'Receive' to add stock.",
      );
    }

    let locationName: string | null = null;
    if (dto.locationId) {
      const location = await this.stockLocationRepository.findOne({
        where: { id: dto.locationId },
      });
      if (location) {
        locationName = location.name;
      }
    }

    const stock = this.compoundStockRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      compoundCodingId: dto.compoundCodingId,
      quantityKg: dto.quantityKg,
      minStockLevelKg: dto.minStockLevelKg ?? 0,
      reorderPointKg: dto.reorderPointKg ?? 0,
      costPerKg: dto.costPerKg ?? null,
      locationId: dto.locationId ?? null,
      location: locationName,
      batchNumber: dto.batchNumber ?? null,
    });
    const savedStock = await this.compoundStockRepository.save(stock);

    const movement = this.movementRepository.create({
      compoundStockId: savedStock.id,
      movementType: CompoundMovementType.IN,
      quantityKg: dto.quantityKg,
      referenceType: CompoundMovementReferenceType.OPENING_STOCK,
      batchNumber: dto.batchNumber ?? null,
      notes: dto.notes ?? "Opening stock entry",
    });
    await this.movementRepository.save(movement);

    const result = await this.compoundStockRepository.findOne({
      where: { id: savedStock.id },
      relations: ["compoundCoding"],
    });
    return this.mapCompoundStockToDto(result!);
  }

  async importCompoundOpeningStock(
    rows: ImportCompoundOpeningStockRowDto[],
  ): Promise<ImportCompoundOpeningStockResultDto> {
    const result: ImportCompoundOpeningStockResultDto = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      errors: [],
    };

    const codings = await this.productCodingRepository.find({
      where: { codingType: ProductCodingType.COMPOUND },
    });
    const codingMap = new Map(codings.map((c) => [c.code.toLowerCase(), c]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const coding = codingMap.get(row.compoundCode.toLowerCase());
      if (!coding) {
        result.errors.push({
          row: rowNum,
          compoundCode: row.compoundCode,
          error: `Compound code '${row.compoundCode}' not found`,
        });
        continue;
      }

      if (!row.quantityKg || row.quantityKg <= 0) {
        result.errors.push({
          row: rowNum,
          compoundCode: row.compoundCode,
          error: "Quantity must be greater than 0",
        });
        continue;
      }

      const existing = await this.compoundStockRepository.findOne({
        where: { compoundCodingId: coding.id },
      });

      if (existing) {
        existing.quantityKg = Number(existing.quantityKg) + row.quantityKg;
        if (row.costPerKg !== undefined && row.costPerKg !== null) {
          existing.costPerKg = row.costPerKg;
        }
        if (row.minStockLevelKg !== undefined && row.minStockLevelKg !== null) {
          existing.minStockLevelKg = row.minStockLevelKg;
        }
        if (row.reorderPointKg !== undefined && row.reorderPointKg !== null) {
          existing.reorderPointKg = row.reorderPointKg;
        }
        if (row.location) {
          existing.location = row.location;
        }
        if (row.batchNumber) {
          existing.batchNumber = row.batchNumber;
        }
        await this.compoundStockRepository.save(existing);

        const movement = this.movementRepository.create({
          compoundStockId: existing.id,
          movementType: CompoundMovementType.IN,
          quantityKg: row.quantityKg,
          referenceType: CompoundMovementReferenceType.OPENING_STOCK,
          batchNumber: row.batchNumber ?? null,
          notes: "Opening stock import",
        });
        await this.movementRepository.save(movement);

        result.updated++;
      } else {
        const stock = this.compoundStockRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          compoundCodingId: coding.id,
          quantityKg: row.quantityKg,
          minStockLevelKg: row.minStockLevelKg ?? 0,
          reorderPointKg: row.reorderPointKg ?? 0,
          costPerKg: row.costPerKg ?? null,
          location: row.location ?? null,
          batchNumber: row.batchNumber ?? null,
        });
        const savedStock = await this.compoundStockRepository.save(stock);

        const movement = this.movementRepository.create({
          compoundStockId: savedStock.id,
          movementType: CompoundMovementType.IN,
          quantityKg: row.quantityKg,
          referenceType: CompoundMovementReferenceType.OPENING_STOCK,
          batchNumber: row.batchNumber ?? null,
          notes: "Opening stock import",
        });
        await this.movementRepository.save(movement);

        result.created++;
      }
    }

    return result;
  }

  async manualAdjustment(dto: AdjustCompoundDto): Promise<RubberCompoundMovementDto> {
    const stock = await this.compoundStockRepository.findOne({
      where: { id: dto.compoundStockId },
      relations: ["compoundCoding"],
    });
    if (!stock) {
      throw new NotFoundException("Compound stock not found");
    }

    const oldQty = Number(stock.quantityKg);
    stock.quantityKg = dto.quantityKg;
    await this.compoundStockRepository.save(stock);

    const difference = dto.quantityKg - oldQty;
    const movementType =
      difference >= 0 ? CompoundMovementType.IN : CompoundMovementType.ADJUSTMENT;

    const movement = this.movementRepository.create({
      compoundStockId: dto.compoundStockId,
      movementType,
      quantityKg: Math.abs(difference),
      referenceType: CompoundMovementReferenceType.STOCK_TAKE,
      notes:
        dto.notes ?? `Stock adjusted from ${oldQty.toFixed(3)} to ${dto.quantityKg.toFixed(3)} kg`,
    });
    const saved = await this.movementRepository.save(movement);

    await this.checkAndCreateAutoOrder(stock);

    const result = await this.movementRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    return this.mapMovementToDto(result!);
  }

  async allProductions(status?: RubberProductionStatus): Promise<RubberProductionDto[]> {
    const where = status !== undefined ? { status } : {};
    const productions = await this.productionRepository.find({
      where,
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
      order: { createdAt: "DESC" },
    });
    return productions.map((p) => this.mapProductionToDto(p));
  }

  async productionById(id: number): Promise<RubberProductionDto | null> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
    });
    return production ? this.mapProductionToDto(production) : null;
  }

  async createProduction(dto: CreateRubberProductionDto): Promise<RubberProductionDto> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new BadRequestException("Product not found");
    }

    const stock = await this.compoundStockRepository.findOne({
      where: { id: dto.compoundStockId },
      relations: ["compoundCoding"],
    });
    if (!stock) {
      throw new BadRequestException("Compound stock not found");
    }

    const lastProduction = await this.productionRepository
      .createQueryBuilder("production")
      .orderBy("production.id", "DESC")
      .getOne();
    const nextNumber = (lastProduction?.id || 0) + 1;
    const productionNumber = `PRD-${String(nextNumber).padStart(5, "0")}`;

    const production = this.productionRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      productionNumber,
      productId: dto.productId,
      compoundStockId: dto.compoundStockId,
      thicknessMm: dto.thicknessMm,
      widthMm: dto.widthMm,
      lengthM: dto.lengthM,
      quantity: dto.quantity,
      status: RubberProductionStatus.PENDING,
      orderId: dto.orderId ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.productionRepository.save(production);

    const result = await this.productionRepository.findOne({
      where: { id: saved.id },
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
    });
    return this.mapProductionToDto(result!);
  }

  async startProduction(id: number): Promise<RubberProductionDto> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
    });
    if (!production) {
      throw new NotFoundException("Production not found");
    }

    if (production.status !== RubberProductionStatus.PENDING) {
      throw new BadRequestException("Production can only be started from PENDING status");
    }

    production.status = RubberProductionStatus.IN_PROGRESS;
    await this.productionRepository.save(production);
    return this.mapProductionToDto(production);
  }

  async completeProduction(id: number): Promise<RubberProductionDto> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
    });
    if (!production) {
      throw new NotFoundException("Production not found");
    }

    if (production.status !== RubberProductionStatus.IN_PROGRESS) {
      throw new BadRequestException("Production can only be completed from IN_PROGRESS status");
    }

    const specificGravity = Number(production.product?.specificGravity) || 1;
    const compoundRequired = this.calculateCompoundWeight(
      production.thicknessMm,
      production.widthMm,
      production.lengthM,
      specificGravity,
      production.quantity,
    );

    production.compoundUsedKg = compoundRequired;
    production.status = RubberProductionStatus.COMPLETED;
    production.completedAt = now().toJSDate();
    await this.productionRepository.save(production);

    const stock = production.compoundStock;
    stock.quantityKg = Number(stock.quantityKg) - compoundRequired;
    await this.compoundStockRepository.save(stock);

    const movement = this.movementRepository.create({
      compoundStockId: production.compoundStockId,
      movementType: CompoundMovementType.OUT,
      quantityKg: compoundRequired,
      referenceType: CompoundMovementReferenceType.PRODUCTION,
      referenceId: production.id,
      notes: `Production ${production.productionNumber}`,
    });
    await this.movementRepository.save(movement);

    await this.checkAndCreateAutoOrder(stock);

    return this.mapProductionToDto(production);
  }

  async cancelProduction(id: number): Promise<RubberProductionDto> {
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ["product", "compoundStock", "compoundStock.compoundCoding"],
    });
    if (!production) {
      throw new NotFoundException("Production not found");
    }

    if (production.status === RubberProductionStatus.COMPLETED) {
      throw new BadRequestException("Completed productions cannot be cancelled");
    }

    production.status = RubberProductionStatus.CANCELLED;
    await this.productionRepository.save(production);
    return this.mapProductionToDto(production);
  }

  async calculateCompoundRequired(
    dto: CalculateCompoundDto,
  ): Promise<CompoundCalculationResultDto> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const specificGravity = Number(product.specificGravity) || 1;
    const kgPerUnit = this.calculateCompoundWeight(
      dto.thicknessMm,
      dto.widthMm,
      dto.lengthM,
      specificGravity,
      1,
    );
    const totalKg = kgPerUnit * dto.quantity;

    return {
      productTitle: product.title,
      specificGravity,
      kgPerUnit,
      compoundRequiredKg: totalKg,
    };
  }

  async allCompoundOrders(status?: RubberCompoundOrderStatus): Promise<RubberCompoundOrderDto[]> {
    const where = status !== undefined ? { status } : {};
    const orders = await this.compoundOrderRepository.find({
      where,
      relations: ["compoundStock", "compoundStock.compoundCoding"],
      order: { createdAt: "DESC" },
    });
    return orders.map((o) => this.mapCompoundOrderToDto(o));
  }

  async compoundOrderById(id: number): Promise<RubberCompoundOrderDto | null> {
    const order = await this.compoundOrderRepository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    return order ? this.mapCompoundOrderToDto(order) : null;
  }

  async createCompoundOrder(dto: CreateRubberCompoundOrderDto): Promise<RubberCompoundOrderDto> {
    const stock = await this.compoundStockRepository.findOne({
      where: { id: dto.compoundStockId },
      relations: ["compoundCoding"],
    });
    if (!stock) {
      throw new BadRequestException("Compound stock not found");
    }

    const lastOrder = await this.compoundOrderRepository
      .createQueryBuilder("order")
      .orderBy("order.id", "DESC")
      .getOne();
    const nextNumber = (lastOrder?.id || 0) + 1;
    const orderNumber = `CPO-${String(nextNumber).padStart(5, "0")}`;

    const order = this.compoundOrderRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      orderNumber,
      compoundStockId: dto.compoundStockId,
      quantityKg: dto.quantityKg,
      status: RubberCompoundOrderStatus.PENDING,
      isAutoGenerated: false,
      supplierName: dto.supplierName ?? null,
      expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
      notes: dto.notes ?? null,
    });
    const saved = await this.compoundOrderRepository.save(order);

    const result = await this.compoundOrderRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    return this.mapCompoundOrderToDto(result!);
  }

  async updateCompoundOrderStatus(
    id: number,
    dto: UpdateRubberCompoundOrderStatusDto,
  ): Promise<RubberCompoundOrderDto> {
    const order = await this.compoundOrderRepository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    if (!order) {
      throw new NotFoundException("Compound order not found");
    }

    order.status = dto.status;
    await this.compoundOrderRepository.save(order);
    return this.mapCompoundOrderToDto(order);
  }

  async receiveCompoundOrder(
    id: number,
    dto: ReceiveCompoundOrderDto,
  ): Promise<RubberCompoundOrderDto> {
    const order = await this.compoundOrderRepository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    if (!order) {
      throw new NotFoundException("Compound order not found");
    }

    if (
      order.status !== RubberCompoundOrderStatus.ORDERED &&
      order.status !== RubberCompoundOrderStatus.APPROVED
    ) {
      throw new BadRequestException("Order must be in ORDERED or APPROVED status to receive");
    }

    const stock = order.compoundStock;
    stock.quantityKg = Number(stock.quantityKg) + dto.actualQuantityKg;
    if (dto.batchNumber) {
      stock.batchNumber = dto.batchNumber;
    }
    await this.compoundStockRepository.save(stock);

    const movement = this.movementRepository.create({
      compoundStockId: order.compoundStockId,
      movementType: CompoundMovementType.IN,
      quantityKg: dto.actualQuantityKg,
      referenceType: CompoundMovementReferenceType.PURCHASE,
      referenceId: order.id,
      batchNumber: dto.batchNumber ?? null,
      notes: dto.notes ?? `Received from order ${order.orderNumber}`,
    });
    await this.movementRepository.save(movement);

    order.status = RubberCompoundOrderStatus.RECEIVED;
    await this.compoundOrderRepository.save(order);

    return this.mapCompoundOrderToDto(order);
  }

  private async checkAndCreateAutoOrder(stock: RubberCompoundStock): Promise<void> {
    const currentQty = Number(stock.quantityKg);
    const reorderPoint = Number(stock.reorderPointKg);
    const minStockLevel = Number(stock.minStockLevelKg);

    if (currentQty >= reorderPoint) return;

    const existingActiveOrder = await this.compoundOrderRepository.findOne({
      where: {
        compoundStockId: stock.id,
        status: In([
          RubberCompoundOrderStatus.PENDING,
          RubberCompoundOrderStatus.APPROVED,
          RubberCompoundOrderStatus.ORDERED,
        ]),
      },
    });

    if (existingActiveOrder) return;

    const orderQty = minStockLevel - currentQty;
    if (orderQty <= 0) return;

    const lastOrder = await this.compoundOrderRepository
      .createQueryBuilder("order")
      .orderBy("order.id", "DESC")
      .getOne();
    const nextNumber = (lastOrder?.id || 0) + 1;
    const orderNumber = `CPO-${String(nextNumber).padStart(5, "0")}`;

    const autoOrder = this.compoundOrderRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      orderNumber,
      compoundStockId: stock.id,
      quantityKg: orderQty,
      status: RubberCompoundOrderStatus.PENDING,
      isAutoGenerated: true,
      notes: `Auto-generated: Stock fell below reorder point (${reorderPoint} kg)`,
    });
    await this.compoundOrderRepository.save(autoOrder);
  }

  private calculateCompoundWeight(
    thicknessMm: number,
    widthMm: number,
    lengthM: number,
    specificGravity: number,
    quantity: number,
  ): number {
    const thicknessM = Number(thicknessMm) / 1000;
    const widthM = Number(widthMm) / 1000;
    const volumeM3 = thicknessM * widthM * Number(lengthM);
    const kgPerUnit = volumeM3 * specificGravity * 1000;
    return kgPerUnit * quantity;
  }

  private mapCompoundStockToDto(stock: RubberCompoundStock): RubberCompoundStockDto {
    const quantityKg = Number(stock.quantityKg);
    const reorderPointKg = Number(stock.reorderPointKg);
    return {
      id: stock.id,
      firebaseUid: stock.firebaseUid,
      compoundCodingId: stock.compoundCodingId,
      compoundName: stock.compoundCoding?.name ?? null,
      compoundCode: stock.compoundCoding?.code ?? null,
      quantityKg,
      minStockLevelKg: Number(stock.minStockLevelKg),
      reorderPointKg,
      costPerKg: stock.costPerKg ? Number(stock.costPerKg) : null,
      location: stock.location,
      batchNumber: stock.batchNumber,
      isLowStock: quantityKg < reorderPointKg,
      createdAt: stock.createdAt.toISOString(),
      updatedAt: stock.updatedAt.toISOString(),
    };
  }

  private mapMovementToDto(movement: RubberCompoundMovement): RubberCompoundMovementDto {
    return {
      id: movement.id,
      compoundStockId: movement.compoundStockId,
      compoundName: movement.compoundStock?.compoundCoding?.name ?? null,
      movementType: movement.movementType,
      quantityKg: Number(movement.quantityKg),
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      batchNumber: movement.batchNumber,
      notes: movement.notes,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt.toISOString(),
    };
  }

  private mapProductionToDto(production: RubberProduction): RubberProductionDto {
    const specificGravity = Number(production.product?.specificGravity) || 1;
    const compoundRequired = this.calculateCompoundWeight(
      production.thicknessMm,
      production.widthMm,
      production.lengthM,
      specificGravity,
      production.quantity,
    );

    return {
      id: production.id,
      firebaseUid: production.firebaseUid,
      productionNumber: production.productionNumber,
      productId: production.productId,
      productTitle: production.product?.title ?? null,
      compoundStockId: production.compoundStockId,
      compoundName: production.compoundStock?.compoundCoding?.name ?? null,
      thicknessMm: Number(production.thicknessMm),
      widthMm: Number(production.widthMm),
      lengthM: Number(production.lengthM),
      quantity: production.quantity,
      compoundRequiredKg: compoundRequired,
      compoundUsedKg: production.compoundUsedKg ? Number(production.compoundUsedKg) : null,
      status: production.status,
      statusLabel: PRODUCTION_STATUS_LABELS[production.status],
      orderId: production.orderId,
      notes: production.notes,
      createdBy: production.createdBy,
      completedAt: production.completedAt?.toISOString() ?? null,
      createdAt: production.createdAt.toISOString(),
      updatedAt: production.updatedAt.toISOString(),
    };
  }

  private mapCompoundOrderToDto(order: RubberCompoundOrder): RubberCompoundOrderDto {
    return {
      id: order.id,
      firebaseUid: order.firebaseUid,
      orderNumber: order.orderNumber,
      compoundStockId: order.compoundStockId,
      compoundName: order.compoundStock?.compoundCoding?.name ?? null,
      quantityKg: Number(order.quantityKg),
      status: order.status,
      statusLabel: COMPOUND_ORDER_STATUS_LABELS[order.status],
      isAutoGenerated: order.isAutoGenerated,
      supplierName: order.supplierName,
      expectedDelivery: order.expectedDelivery?.toISOString().split("T")[0] ?? null,
      notes: order.notes,
      createdBy: order.createdBy,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
