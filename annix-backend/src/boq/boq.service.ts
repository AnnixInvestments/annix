import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Boq, BoqStatus } from './entities/boq.entity';
import { BoqLineItem } from './entities/boq-line-item.entity';
import { CreateBoqDto } from './dto/create-boq.dto';
import { UpdateBoqDto } from './dto/update-boq.dto';
import { CreateBoqLineItemDto } from './dto/create-boq-line-item.dto';
import { UpdateBoqLineItemDto } from './dto/update-boq-line-item.dto';
import { BoqQueryDto } from './dto/boq-query.dto';
import { ReorderLineItemsDto } from './dto/reorder-line-items.dto';
import { User } from '../user/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BoqService {
  constructor(
    @InjectRepository(Boq)
    private boqRepository: Repository<Boq>,
    @InjectRepository(BoqLineItem)
    private lineItemRepository: Repository<BoqLineItem>,
    private auditService: AuditService,
  ) {}

  private async generateBoqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BOQ-${year}-`;

    const lastBoq = await this.boqRepository
      .createQueryBuilder('boq')
      .where('boq.boq_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('boq.boq_number', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastBoq) {
      const lastNumber = parseInt(lastBoq.boqNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async create(dto: CreateBoqDto, user: User): Promise<Boq> {
    const boqNumber = await this.generateBoqNumber();

    const boq = this.boqRepository.create({
      boqNumber,
      title: dto.title,
      description: dto.description,
      status: BoqStatus.DRAFT,
      createdBy: user,
      drawing: dto.drawingId ? { id: dto.drawingId } as any : undefined,
      rfq: dto.rfqId ? { id: dto.rfqId } as any : undefined,
    });

    const savedBoq = await this.boqRepository.save(boq);

    await this.auditService.log({
      entityType: 'boq',
      entityId: savedBoq.id,
      action: AuditAction.CREATE,
      newValues: { boqNumber, title: dto.title },
      performedBy: user,
    });

    return this.findOne(savedBoq.id);
  }

  async findAll(query: BoqQueryDto): Promise<PaginatedResult<Boq>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let queryBuilder = this.boqRepository
      .createQueryBuilder('boq')
      .leftJoinAndSelect('boq.createdBy', 'createdBy')
      .leftJoinAndSelect('boq.drawing', 'drawing')
      .leftJoinAndSelect('boq.rfq', 'rfq');

    if (query.status) {
      queryBuilder = queryBuilder.andWhere('boq.status = :status', { status: query.status });
    }

    if (query.drawingId) {
      queryBuilder = queryBuilder.andWhere('boq.drawing_id = :drawingId', { drawingId: query.drawingId });
    }

    if (query.rfqId) {
      queryBuilder = queryBuilder.andWhere('boq.rfq_id = :rfqId', { rfqId: query.rfqId });
    }

    if (query.createdByUserId) {
      queryBuilder = queryBuilder.andWhere('boq.created_by_user_id = :userId', {
        userId: query.createdByUserId,
      });
    }

    if (query.search) {
      queryBuilder = queryBuilder.andWhere(
        '(boq.title ILIKE :search OR boq.description ILIKE :search OR boq.boq_number ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('boq.updated_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Boq> {
    const boq = await this.boqRepository.findOne({
      where: { id },
      relations: ['createdBy', 'drawing', 'rfq', 'lineItems'],
      order: {
        lineItems: { lineNumber: 'ASC' },
      },
    });

    if (!boq) {
      throw new NotFoundException(`BOQ with ID ${id} not found`);
    }

    return boq;
  }

  async update(id: number, dto: UpdateBoqDto, user: User): Promise<Boq> {
    const boq = await this.findOne(id);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    const oldValues = {
      title: boq.title,
      description: boq.description,
    };

    if (dto.title) boq.title = dto.title;
    if (dto.description !== undefined) boq.description = dto.description;
    if (dto.drawingId !== undefined) {
      boq.drawing = dto.drawingId ? { id: dto.drawingId } as any : undefined;
    }
    if (dto.rfqId !== undefined) {
      boq.rfq = dto.rfqId ? { id: dto.rfqId } as any : undefined;
    }

    await this.boqRepository.save(boq);

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot delete approved BOQ');
    }

    await this.auditService.log({
      entityType: 'boq',
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

  // Line Items
  async addLineItem(boqId: number, dto: CreateBoqLineItemDto, user: User): Promise<BoqLineItem> {
    const boq = await this.findOne(boqId);

    if (boq.status === BoqStatus.APPROVED) {
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    // Get next line number
    const maxLineNumber = await this.lineItemRepository
      .createQueryBuilder('item')
      .where('item.boq_id = :boqId', { boqId })
      .select('MAX(item.line_number)', 'max')
      .getRawOne();

    const lineNumber = (maxLineNumber?.max || 0) + 1;

    const lineItem = new BoqLineItem();
    lineItem.boq = boq;
    lineItem.lineNumber = lineNumber;
    lineItem.itemCode = dto.itemCode;
    lineItem.description = dto.description;
    lineItem.itemType = dto.itemType;
    lineItem.unitOfMeasure = dto.unitOfMeasure;
    lineItem.quantity = dto.quantity;
    lineItem.unitWeightKg = dto.unitWeightKg;
    lineItem.totalWeightKg = dto.unitWeightKg ? dto.quantity * dto.unitWeightKg : undefined;
    lineItem.unitPrice = dto.unitPrice;
    lineItem.totalPrice = dto.unitPrice ? dto.quantity * dto.unitPrice : undefined;
    lineItem.notes = dto.notes;
    lineItem.drawingReference = dto.drawingReference;
    lineItem.specifications = dto.specifications;

    const savedItem = await this.lineItemRepository.save(lineItem);

    await this.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    // Get next line number
    const maxLineNumber = await this.lineItemRepository
      .createQueryBuilder('item')
      .where('item.boq_id = :boqId', { boqId })
      .select('MAX(item.line_number)', 'max')
      .getRawOne();

    let lineNumber = (maxLineNumber?.max || 0) + 1;

    const lineItems = items.map((dto) => {
      const item = this.lineItemRepository.create({
        boq,
        lineNumber: lineNumber++,
        itemCode: dto.itemCode,
        description: dto.description,
        itemType: dto.itemType,
        unitOfMeasure: dto.unitOfMeasure,
        quantity: dto.quantity,
        unitWeightKg: dto.unitWeightKg,
        totalWeightKg: dto.unitWeightKg ? dto.quantity * dto.unitWeightKg : undefined,
        unitPrice: dto.unitPrice,
        totalPrice: dto.unitPrice ? dto.quantity * dto.unitPrice : undefined,
        notes: dto.notes,
        drawingReference: dto.drawingReference,
        specifications: dto.specifications,
      });
      return item;
    });

    const savedItems = await this.lineItemRepository.save(lineItems);

    await this.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, boq: { id: boqId } },
    });

    if (!lineItem) {
      throw new NotFoundException('Line item not found');
    }

    const oldValues = { ...lineItem };

    // Update fields
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

    // Recalculate totals
    lineItem.totalWeightKg = lineItem.unitWeightKg
      ? lineItem.quantity * lineItem.unitWeightKg
      : undefined;
    lineItem.totalPrice = lineItem.unitPrice
      ? lineItem.quantity * lineItem.unitPrice
      : undefined;

    const updated = await this.lineItemRepository.save(lineItem);
    await this.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, boq: { id: boqId } },
    });

    if (!lineItem) {
      throw new NotFoundException('Line item not found');
    }

    await this.lineItemRepository.remove(lineItem);
    await this.reorderLineNumbers(boqId);
    await this.recalculateTotals(boqId);

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    // Validate all IDs belong to this BOQ
    const existingItems = await this.lineItemRepository.find({
      where: { boq: { id: boqId } },
    });

    const existingIds = new Set(existingItems.map((i) => i.id));
    for (const id of dto.itemIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Line item ${id} does not belong to this BOQ`);
      }
    }

    // Update line numbers
    for (let i = 0; i < dto.itemIds.length; i++) {
      await this.lineItemRepository.update(dto.itemIds[i], { lineNumber: i + 1 });
    }

    await this.auditService.log({
      entityType: 'boq',
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
      throw new BadRequestException('Cannot modify approved BOQ');
    }

    boq.drawing = { id: drawingId } as any;
    await this.boqRepository.save(boq);

    await this.auditService.log({
      entityType: 'boq',
      entityId: boqId,
      action: AuditAction.UPDATE,
      newValues: { linkedDrawingId: drawingId },
      performedBy: user,
    });

    return this.findOne(boqId);
  }

  // Status update
  async updateStatus(id: number, status: BoqStatus): Promise<Boq> {
    const boq = await this.findOne(id);
    boq.status = status;
    return this.boqRepository.save(boq);
  }

  // Private helpers
  private async recalculateTotals(boqId: number): Promise<void> {
    const result = await this.lineItemRepository
      .createQueryBuilder('item')
      .where('item.boq_id = :boqId', { boqId })
      .select([
        'SUM(item.quantity) as totalQuantity',
        'SUM(item.total_weight_kg) as totalWeightKg',
        'SUM(item.total_price) as totalEstimatedCost',
      ])
      .getRawOne();

    await this.boqRepository.update(boqId, {
      totalQuantity: result.totalQuantity || 0,
      totalWeightKg: result.totalWeightKg || 0,
      totalEstimatedCost: result.totalEstimatedCost || 0,
    });
  }

  private async reorderLineNumbers(boqId: number): Promise<void> {
    const items = await this.lineItemRepository.find({
      where: { boq: { id: boqId } },
      order: { lineNumber: 'ASC' },
    });

    for (let i = 0; i < items.length; i++) {
      if (items[i].lineNumber !== i + 1) {
        await this.lineItemRepository.update(items[i].id, { lineNumber: i + 1 });
      }
    }
  }
}
