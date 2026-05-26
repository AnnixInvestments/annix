import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { now } from "../lib/datetime";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { RfqItemRepository } from "../rfq/rfq-item.repository";
import { PaginatedResponse } from "../shared/dto";
import { User } from "../user/entities/user.entity";
import { BoqRepository } from "./boq.repository";
import { BoqLineItemRepository } from "./boq-line-item.repository";
import { BoqQueryDto } from "./dto/boq-query.dto";
import { CreateBoqDto } from "./dto/create-boq.dto";
import { CreateBoqLineItemDto } from "./dto/create-boq-line-item.dto";
import { ReorderLineItemsDto } from "./dto/reorder-line-items.dto";
import { UpdateBoqDto } from "./dto/update-boq.dto";
import { UpdateBoqLineItemDto } from "./dto/update-boq-line-item.dto";
import { Boq, BoqStatus } from "./entities/boq.entity";
import { BoqItemType, BoqLineItem } from "./entities/boq-line-item.entity";

export type PaginatedResult<T> = PaginatedResponse<T>;

@Injectable()
export class BoqService {
  constructor(
    private readonly boqRepository: BoqRepository,
    private readonly lineItemRepository: BoqLineItemRepository,
    private readonly rfqRepository: RfqRepository,
    private readonly rfqItemRepository: RfqItemRepository,
    private readonly auditService: AuditService,
  ) {}

  private async generateBoqNumber(rfqNumber?: string | null): Promise<string> {
    if (rfqNumber) {
      return rfqNumber.replace("RFQ-", "BOQ-");
    }

    const year = now().year;
    const prefix = `BOQ-${year}-`;

    const lastBoq = await this.boqRepository.findLastByNumberPrefix(prefix);

    let nextNumber = 1;
    if (lastBoq) {
      const lastNumber = parseInt(lastBoq.boqNumber.replace(prefix, ""), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  async create(dto: CreateBoqDto, user: User): Promise<Boq> {
    let rfqNumber: string | null = null;
    let rfqItems: RfqItem[] = [];

    if (dto.rfqId) {
      const rfq = await this.rfqRepository.findById(dto.rfqId);
      if (rfq) {
        rfqNumber = rfq.rfqNumber;
      }
      rfqItems = await this.rfqItemRepository.findByRfqIdOrderedByLineNumber(dto.rfqId);
    }

    const boqNumber = await this.generateBoqNumber(rfqNumber);

    const savedBoq = await this.boqRepository.create({
      boqNumber,
      title: dto.title,
      description: dto.description,
      status: BoqStatus.DRAFT,
      createdBy: user,
      drawing: dto.drawingId ? ({ id: dto.drawingId } as any) : null,
      rfq: dto.rfqId ? ({ id: dto.rfqId } as any) : null,
    });

    if (rfqItems.length > 0) {
      const lineItems = rfqItems.map((rfqItem, index) =>
        this.lineItemRepository.create({
          boq: savedBoq,
          lineNumber: rfqItem.lineNumber || index + 1,
          itemCode: this.generateItemCode(rfqItem.itemType, index + 1),
          description: rfqItem.description,
          itemType: this.mapRfqItemTypeToBoqItemType(rfqItem.itemType),
          unitOfMeasure: "EA",
          quantity: rfqItem.quantity || 1,
          unitWeightKg: rfqItem.weightPerUnitKg ? Number(rfqItem.weightPerUnitKg) : null,
          totalWeightKg: rfqItem.totalWeightKg ? Number(rfqItem.totalWeightKg) : null,
          notes: rfqItem.notes,
        }),
      );
      await Promise.all(lineItems);
      await this.boqRepository.recalculateTotals(savedBoq.id);
    }

    await this.auditService.log({
      entityType: "boq",
      entityId: savedBoq.id,
      action: AuditAction.CREATE,
      newValues: {
        boqNumber,
        title: dto.title,
        lineItemsCreated: rfqItems.length,
      },
      performedBy: user,
    });

    return this.findOne(savedBoq.id);
  }

  private generateItemCode(itemType: string, lineNumber: number): string {
    const typePrefix =
      (
        {
          straight_pipe: "PIPE",
          bend: "BEND",
          fitting: "FIT",
          flange: "FLG",
          fastener: "FST",
          custom: "CUST",
        } as Record<string, string>
      )[itemType] || "ITEM";
    return `${typePrefix}-${String(lineNumber).padStart(3, "0")}`;
  }

  private mapRfqItemTypeToBoqItemType(rfqItemType: string): BoqItemType {
    const typeMap: Record<string, BoqItemType> = {
      straight_pipe: BoqItemType.STRAIGHT_PIPE,
      bend: BoqItemType.BEND,
      fitting: BoqItemType.FITTING,
      flange: BoqItemType.FLANGE,
      fastener: BoqItemType.FASTENER,
      custom: BoqItemType.CUSTOM,
    };
    return typeMap[rfqItemType] || BoqItemType.CUSTOM;
  }

  async findAll(query: BoqQueryDto): Promise<PaginatedResult<Boq>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.boqRepository.findAllPaginated({
      status: query.status ?? null,
      drawingId: query.drawingId ?? null,
      rfqId: query.rfqId ?? null,
      createdByUserId: query.createdByUserId ?? null,
      search: query.search ?? null,
      skip,
      limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Boq> {
    const boq = await this.boqRepository.findOneWithRelations(id);

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${id} not found`);
    }

    return boq;
  }

  async update(id: number, dto: UpdateBoqDto, user: User): Promise<Boq> {
    const boq = await this.findOne(id);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const oldValues = {
      title: boq.title,
      description: boq.description,
    };

    if (dto.title) boq.title = dto.title;
    if (dto.description !== undefined) boq.description = dto.description;
    if (dto.drawingId !== undefined) {
      boq.drawing = dto.drawingId ? ({ id: dto.drawingId } as any) : null;
    }
    if (dto.rfqId !== undefined) {
      boq.rfq = dto.rfqId ? ({ id: dto.rfqId } as any) : null;
    }

    await this.boqRepository.save(boq);

    await this.auditService.log({
      entityType: "boq",
      entityId: boq.id,
      action: AuditAction.UPDATE,
      oldValues,
      newValues: dto,
      performedBy: user,
    });

    return this.findOne(id);
  }

  async remove(id: number, user: User): Promise<void> {
    const boq = await this.findOne(id);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot delete approved BOQ");
    }

    await this.auditService.log({
      entityType: "boq",
      entityId: boq.id,
      action: AuditAction.DELETE,
      oldValues: {
        boqNumber: boq.boqNumber,
        title: boq.title,
      },
      performedBy: user,
    });

    await this.boqRepository.remove(boq);
  }

  async addLineItem(boqId: number, dto: CreateBoqLineItemDto, user: User): Promise<BoqLineItem> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const maxLine = await this.lineItemRepository.maxLineNumber(boqId);
    const lineNumber = maxLine + 1;

    const savedItem = await this.lineItemRepository.create({
      boq,
      lineNumber,
      itemCode: dto.itemCode,
      description: dto.description,
      itemType: dto.itemType,
      unitOfMeasure: dto.unitOfMeasure,
      quantity: dto.quantity,
      unitWeightKg: dto.unitWeightKg,
      totalWeightKg: dto.unitWeightKg ? dto.quantity * dto.unitWeightKg : null,
      unitPrice: dto.unitPrice,
      totalPrice: dto.unitPrice ? dto.quantity * dto.unitPrice : null,
      notes: dto.notes,
      drawingReference: dto.drawingReference,
      specifications: dto.specifications,
    });

    await this.boqRepository.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      newValues: { addedLineItem: savedItem.id, description: dto.description },
      performedBy: user,
    });

    return savedItem;
  }

  async addLineItemsBulk(
    boqId: number,
    items: CreateBoqLineItemDto[],
    user: User,
  ): Promise<BoqLineItem[]> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const maxLine = await this.lineItemRepository.maxLineNumber(boqId);
    let lineNumber = maxLine + 1;

    const savedItems = await Promise.all(
      items.map((dto) =>
        this.lineItemRepository.create({
          boq,
          lineNumber: lineNumber++,
          itemCode: dto.itemCode,
          description: dto.description,
          itemType: dto.itemType,
          unitOfMeasure: dto.unitOfMeasure,
          quantity: dto.quantity,
          unitWeightKg: dto.unitWeightKg,
          totalWeightKg: dto.unitWeightKg ? dto.quantity * dto.unitWeightKg : null,
          unitPrice: dto.unitPrice,
          totalPrice: dto.unitPrice ? dto.quantity * dto.unitPrice : null,
          notes: dto.notes,
          drawingReference: dto.drawingReference,
          specifications: dto.specifications,
        }),
      ),
    );

    await this.boqRepository.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      newValues: { addedLineItems: savedItems.map((i) => i.id) },
      performedBy: user,
    });

    return savedItems;
  }

  async updateLineItem(
    boqId: number,
    lineItemId: number,
    dto: UpdateBoqLineItemDto,
    user: User,
  ): Promise<BoqLineItem> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const lineItem = await this.lineItemRepository.findOneByBoq(lineItemId, boqId);

    if (!lineItem) {
      throw new NotFoundException("Line item not found");
    }

    const oldValues = { ...lineItem };

    if (dto.itemCode !== undefined) lineItem.itemCode = dto.itemCode;
    if (dto.description) lineItem.description = dto.description;
    if (dto.itemType) lineItem.itemType = dto.itemType;
    if (dto.unitOfMeasure) lineItem.unitOfMeasure = dto.unitOfMeasure;
    if (dto.quantity !== undefined) lineItem.quantity = dto.quantity;
    if (dto.unitWeightKg !== undefined) lineItem.unitWeightKg = dto.unitWeightKg;
    if (dto.unitPrice !== undefined) lineItem.unitPrice = dto.unitPrice;
    if (dto.notes !== undefined) lineItem.notes = dto.notes;
    if (dto.drawingReference !== undefined) lineItem.drawingReference = dto.drawingReference;
    if (dto.specifications !== undefined) lineItem.specifications = dto.specifications;

    lineItem.totalWeightKg = lineItem.unitWeightKg
      ? lineItem.quantity * lineItem.unitWeightKg
      : null;
    lineItem.totalPrice = lineItem.unitPrice ? lineItem.quantity * lineItem.unitPrice : null;

    const updated = await this.lineItemRepository.save(lineItem);
    await this.boqRepository.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      oldValues: { lineItemId, ...oldValues },
      newValues: dto,
      performedBy: user,
    });

    return updated;
  }

  async removeLineItem(boqId: number, lineItemId: number, user: User): Promise<void> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const lineItem = await this.lineItemRepository.findOneByBoq(lineItemId, boqId);

    if (!lineItem) {
      throw new NotFoundException("Line item not found");
    }

    await this.lineItemRepository.remove(lineItem);
    await this.reorderLineNumbers(boqId);
    await this.boqRepository.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      oldValues: { deletedLineItem: lineItemId },
      performedBy: user,
    });
  }

  async reorderLineItems(
    boqId: number,
    dto: ReorderLineItemsDto,
    user: User,
  ): Promise<BoqLineItem[]> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    const existingItems = await this.lineItemRepository.findByBoq(boqId);
    const existingIds = new Set(existingItems.map((i) => i.id));
    const invalidId = dto.itemIds.find((id) => !existingIds.has(id));
    if (invalidId) {
      throw new BadRequestException(`Line item ${invalidId} does not belong to this BOQ`);
    }

    await this.lineItemRepository.reorderByIds(dto.itemIds);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      newValues: { reorderedItems: dto.itemIds },
      performedBy: user,
    });

    const boqUpdated = await this.findOne(boqId);
    return boqUpdated.lineItems;
  }

  async linkToDrawing(boqId: number, drawingId: number, user: User): Promise<Boq> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException("Cannot modify approved BOQ");
    }

    boq.drawing = { id: drawingId } as any;
    await this.boqRepository.save(boq);

    await this.auditService.log({
      entityType: "boq",
      entityId: boqId,
      action: AuditAction.UPDATE,
      newValues: { linkedDrawingId: drawingId },
      performedBy: user,
    });

    return this.findOne(boqId);
  }

  async updateStatus(id: number, status: BoqStatus): Promise<Boq> {
    const boq = await this.findOne(id);
    boq.status = status;
    return this.boqRepository.save(boq);
  }

  private async reorderLineNumbers(boqId: number): Promise<void> {
    const items = await this.lineItemRepository.findByBoq(boqId);
    const itemsNeedingUpdate = items.filter((item, i) => item.lineNumber !== i + 1);

    if (itemsNeedingUpdate.length > 0) {
      await this.lineItemRepository.reorderByIds(items.map((item) => item.id));
    }
  }
}
