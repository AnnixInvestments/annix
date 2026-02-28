import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import {
  RequisitionItemType,
  RequisitionSourceType,
  RequisitionStatus,
  RubberPurchaseRequisition,
  RubberPurchaseRequisitionItem,
  requisitionSourceLabels,
  requisitionStatusLabels,
} from "./entities/rubber-purchase-requisition.entity";

export interface RequisitionDto {
  id: number;
  firebaseUid: string;
  requisitionNumber: string;
  sourceType: RequisitionSourceType;
  sourceTypeLabel: string;
  status: RequisitionStatus;
  statusLabel: string;
  supplierCompanyId: number | null;
  supplierCompanyName: string | null;
  externalPoNumber: string | null;
  externalPoDocumentPath: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  items: RequisitionItemDto[];
  totalQuantityKg: number;
  totalReceivedKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionItemDto {
  id: number;
  requisitionId: number;
  itemType: RequisitionItemType;
  compoundStockId: number | null;
  compoundCodingId: number | null;
  compoundName: string | null;
  quantityKg: number;
  quantityReceivedKg: number;
  unitPrice: number | null;
  notes: string | null;
  createdAt: string;
}

@Injectable()
export class RubberRequisitionService {
  private readonly logger = new Logger(RubberRequisitionService.name);

  constructor(
    @InjectRepository(RubberPurchaseRequisition)
    private readonly requisitionRepo: Repository<RubberPurchaseRequisition>,
    @InjectRepository(RubberPurchaseRequisitionItem)
    private readonly requisitionItemRepo: Repository<RubberPurchaseRequisitionItem>,
    @InjectRepository(RubberCompoundStock)
    private readonly compoundStockRepo: Repository<RubberCompoundStock>,
  ) {}

  private async generateRequisitionNumber(): Promise<string> {
    const count = await this.requisitionRepo.count();
    const paddedNumber = String(count + 1).padStart(5, "0");
    return `REQ-${paddedNumber}`;
  }

  async allRequisitions(filters?: {
    status?: RequisitionStatus;
    sourceType?: RequisitionSourceType;
  }): Promise<RequisitionDto[]> {
    const queryBuilder = this.requisitionRepo
      .createQueryBuilder("req")
      .leftJoinAndSelect("req.supplierCompany", "supplier")
      .leftJoinAndSelect("req.items", "items")
      .orderBy("req.createdAt", "DESC");

    if (filters?.status) {
      queryBuilder.andWhere("req.status = :status", { status: filters.status });
    }

    if (filters?.sourceType) {
      queryBuilder.andWhere("req.sourceType = :sourceType", {
        sourceType: filters.sourceType,
      });
    }

    const requisitions = await queryBuilder.getMany();
    return requisitions.map((req) => this.toDto(req));
  }

  async requisitionById(id: number): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["supplierCompany", "items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    return this.toDto(requisition);
  }

  async createManualRequisition(data: {
    supplierCompanyId?: number;
    externalPoNumber?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy?: string;
    items: {
      itemType: RequisitionItemType;
      compoundStockId?: number;
      compoundCodingId?: number;
      compoundName?: string;
      quantityKg: number;
      unitPrice?: number;
      notes?: string;
    }[];
  }): Promise<RequisitionDto> {
    const requisition = this.requisitionRepo.create({
      firebaseUid: uuidv4(),
      requisitionNumber: await this.generateRequisitionNumber(),
      sourceType: RequisitionSourceType.MANUAL,
      status: RequisitionStatus.PENDING,
      supplierCompanyId: data.supplierCompanyId || null,
      externalPoNumber: data.externalPoNumber || null,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      notes: data.notes || null,
      createdBy: data.createdBy || null,
      items: data.items.map((item) =>
        this.requisitionItemRepo.create({
          itemType: item.itemType,
          compoundStockId: item.compoundStockId || null,
          compoundCodingId: item.compoundCodingId || null,
          compoundName: item.compoundName || null,
          quantityKg: item.quantityKg,
          quantityReceivedKg: 0,
          unitPrice: item.unitPrice || null,
          notes: item.notes || null,
        }),
      ),
    });

    const saved = await this.requisitionRepo.save(requisition);
    return this.requisitionById(saved.id);
  }

  async createExternalPoRequisition(data: {
    supplierCompanyId?: number;
    externalPoNumber: string;
    externalPoDocumentPath?: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy?: string;
    items: {
      itemType: RequisitionItemType;
      compoundStockId?: number;
      compoundCodingId?: number;
      compoundName?: string;
      quantityKg: number;
      unitPrice?: number;
      notes?: string;
    }[];
  }): Promise<RequisitionDto> {
    const requisition = this.requisitionRepo.create({
      firebaseUid: uuidv4(),
      requisitionNumber: await this.generateRequisitionNumber(),
      sourceType: RequisitionSourceType.EXTERNAL_PO,
      status: RequisitionStatus.APPROVED,
      supplierCompanyId: data.supplierCompanyId || null,
      externalPoNumber: data.externalPoNumber,
      externalPoDocumentPath: data.externalPoDocumentPath || null,
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      notes: data.notes || null,
      createdBy: data.createdBy || null,
      approvedBy: data.createdBy || "System",
      approvedAt: new Date(),
      items: data.items.map((item) =>
        this.requisitionItemRepo.create({
          itemType: item.itemType,
          compoundStockId: item.compoundStockId || null,
          compoundCodingId: item.compoundCodingId || null,
          compoundName: item.compoundName || null,
          quantityKg: item.quantityKg,
          quantityReceivedKg: 0,
          unitPrice: item.unitPrice || null,
          notes: item.notes || null,
        }),
      ),
    });

    const saved = await this.requisitionRepo.save(requisition);
    return this.requisitionById(saved.id);
  }

  async createLowStockRequisition(compoundStockId: number): Promise<RequisitionDto | null> {
    const compoundStock = await this.compoundStockRepo.findOne({
      where: { id: compoundStockId },
      relations: ["compoundCoding"],
    });

    if (!compoundStock) {
      this.logger.warn(`Compound stock ${compoundStockId} not found`);
      return null;
    }

    if (
      compoundStock.minStockLevelKg <= 0 ||
      compoundStock.quantityKg >= compoundStock.minStockLevelKg
    ) {
      return null;
    }

    const existingRequisition = await this.requisitionRepo.findOne({
      where: {
        sourceType: RequisitionSourceType.LOW_STOCK,
        status: RequisitionStatus.PENDING,
      },
      relations: ["items"],
    });

    if (existingRequisition) {
      const hasItem = existingRequisition.items.some(
        (item) => item.compoundStockId === compoundStockId,
      );
      if (hasItem) {
        this.logger.log(
          `Active low-stock requisition already exists for compound ${compoundStockId}`,
        );
        return null;
      }
    }

    const deficit =
      compoundStock.reorderPointKg > 0
        ? compoundStock.reorderPointKg - compoundStock.quantityKg
        : compoundStock.minStockLevelKg - compoundStock.quantityKg;

    const quantityToOrder = Math.max(deficit, compoundStock.reorderPointKg || 100);

    const compoundName = compoundStock.compoundCoding?.name || `Compound #${compoundStockId}`;
    const compoundCode = compoundStock.compoundCoding?.code || "";

    const requisition = this.requisitionRepo.create({
      firebaseUid: uuidv4(),
      requisitionNumber: await this.generateRequisitionNumber(),
      sourceType: RequisitionSourceType.LOW_STOCK,
      status: RequisitionStatus.PENDING,
      notes: `Auto-generated: ${compoundName} (${compoundCode}) is below minimum stock level. Current: ${compoundStock.quantityKg} kg, Minimum: ${compoundStock.minStockLevelKg} kg`,
      createdBy: "System",
      items: [
        this.requisitionItemRepo.create({
          itemType: RequisitionItemType.COMPOUND,
          compoundStockId: compoundStock.id,
          compoundCodingId: compoundStock.compoundCodingId,
          compoundName: `${compoundName} (${compoundCode})`,
          quantityKg: quantityToOrder,
          quantityReceivedKg: 0,
        }),
      ],
    });

    const saved = await this.requisitionRepo.save(requisition);
    this.logger.log(`Created low-stock requisition ${saved.requisitionNumber} for ${compoundName}`);

    return this.requisitionById(saved.id);
  }

  async approveRequisition(id: number, approvedBy: string): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new Error(
        `Requisition ${id} is not in PENDING status (current: ${requisition.status})`,
      );
    }

    requisition.status = RequisitionStatus.APPROVED;
    requisition.approvedBy = approvedBy;
    requisition.approvedAt = new Date();

    await this.requisitionRepo.save(requisition);
    return this.requisitionById(id);
  }

  async rejectRequisition(id: number, rejectedBy: string, reason: string): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    if (requisition.status !== RequisitionStatus.PENDING) {
      throw new Error(
        `Requisition ${id} is not in PENDING status (current: ${requisition.status})`,
      );
    }

    requisition.status = RequisitionStatus.CANCELLED;
    requisition.rejectedBy = rejectedBy;
    requisition.rejectedAt = new Date();
    requisition.rejectionReason = reason;

    await this.requisitionRepo.save(requisition);
    return this.requisitionById(id);
  }

  async markAsOrdered(
    id: number,
    data?: { externalPoNumber?: string; expectedDeliveryDate?: string },
  ): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    if (requisition.status !== RequisitionStatus.APPROVED) {
      throw new Error(
        `Requisition ${id} is not in APPROVED status (current: ${requisition.status})`,
      );
    }

    requisition.status = RequisitionStatus.ORDERED;
    requisition.orderedAt = new Date();

    if (data?.externalPoNumber) {
      requisition.externalPoNumber = data.externalPoNumber;
    }
    if (data?.expectedDeliveryDate) {
      requisition.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
    }

    await this.requisitionRepo.save(requisition);
    return this.requisitionById(id);
  }

  async receiveItems(
    id: number,
    itemReceipts: { itemId: number; quantityReceivedKg: number }[],
  ): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    if (
      requisition.status !== RequisitionStatus.ORDERED &&
      requisition.status !== RequisitionStatus.PARTIALLY_RECEIVED
    ) {
      throw new Error(
        `Requisition ${id} is not in ORDERED or PARTIALLY_RECEIVED status (current: ${requisition.status})`,
      );
    }

    for (const receipt of itemReceipts) {
      const item = requisition.items.find((i) => i.id === receipt.itemId);
      if (item) {
        item.quantityReceivedKg =
          Number(item.quantityReceivedKg) + Number(receipt.quantityReceivedKg);
        await this.requisitionItemRepo.save(item);
      }
    }

    const updatedRequisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    const totalOrdered = updatedRequisition!.items.reduce(
      (sum, item) => sum + Number(item.quantityKg),
      0,
    );
    const totalReceived = updatedRequisition!.items.reduce(
      (sum, item) => sum + Number(item.quantityReceivedKg),
      0,
    );

    if (totalReceived >= totalOrdered) {
      updatedRequisition!.status = RequisitionStatus.RECEIVED;
      updatedRequisition!.receivedAt = new Date();
    } else if (totalReceived > 0) {
      updatedRequisition!.status = RequisitionStatus.PARTIALLY_RECEIVED;
    }

    await this.requisitionRepo.save(updatedRequisition!);
    return this.requisitionById(id);
  }

  async cancelRequisition(id: number): Promise<RequisitionDto> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    if (
      requisition.status === RequisitionStatus.RECEIVED ||
      requisition.status === RequisitionStatus.CANCELLED
    ) {
      throw new Error(`Requisition ${id} cannot be cancelled (status: ${requisition.status})`);
    }

    requisition.status = RequisitionStatus.CANCELLED;
    await this.requisitionRepo.save(requisition);
    return this.requisitionById(id);
  }

  async pendingApprovals(): Promise<RequisitionDto[]> {
    const requisitions = await this.requisitionRepo.find({
      where: { status: RequisitionStatus.PENDING },
      relations: ["supplierCompany", "items"],
      order: { createdAt: "ASC" },
    });

    return requisitions.map((req) => this.toDto(req));
  }

  async checkAndCreateLowStockRequisitions(): Promise<RequisitionDto[]> {
    const lowStockItems = await this.compoundStockRepo
      .createQueryBuilder("stock")
      .where("stock.min_stock_level_kg > 0")
      .andWhere("stock.quantity_kg < stock.min_stock_level_kg")
      .getMany();

    const created: RequisitionDto[] = [];

    for (const stock of lowStockItems) {
      const requisition = await this.createLowStockRequisition(stock.id);
      if (requisition) {
        created.push(requisition);
      }
    }

    return created;
  }

  private toDto(requisition: RubberPurchaseRequisition): RequisitionDto {
    const items = requisition.items || [];
    const totalQuantityKg = items.reduce((sum, item) => sum + Number(item.quantityKg), 0);
    const totalReceivedKg = items.reduce((sum, item) => sum + Number(item.quantityReceivedKg), 0);

    return {
      id: requisition.id,
      firebaseUid: requisition.firebaseUid,
      requisitionNumber: requisition.requisitionNumber,
      sourceType: requisition.sourceType,
      sourceTypeLabel: requisitionSourceLabels[requisition.sourceType],
      status: requisition.status,
      statusLabel: requisitionStatusLabels[requisition.status],
      supplierCompanyId: requisition.supplierCompanyId,
      supplierCompanyName: requisition.supplierCompany?.name || null,
      externalPoNumber: requisition.externalPoNumber,
      externalPoDocumentPath: requisition.externalPoDocumentPath,
      expectedDeliveryDate: requisition.expectedDeliveryDate?.toISOString() || null,
      notes: requisition.notes,
      createdBy: requisition.createdBy,
      approvedBy: requisition.approvedBy,
      approvedAt: requisition.approvedAt?.toISOString() || null,
      rejectionReason: requisition.rejectionReason,
      rejectedBy: requisition.rejectedBy,
      rejectedAt: requisition.rejectedAt?.toISOString() || null,
      orderedAt: requisition.orderedAt?.toISOString() || null,
      receivedAt: requisition.receivedAt?.toISOString() || null,
      items: items.map((item) => ({
        id: item.id,
        requisitionId: item.requisitionId,
        itemType: item.itemType,
        compoundStockId: item.compoundStockId,
        compoundCodingId: item.compoundCodingId,
        compoundName: item.compoundName,
        quantityKg: Number(item.quantityKg),
        quantityReceivedKg: Number(item.quantityReceivedKg),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
      })),
      totalQuantityKg,
      totalReceivedKg,
      createdAt: requisition.createdAt.toISOString(),
      updatedAt: requisition.updatedAt.toISOString(),
    };
  }
}
