import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { StreamableFile } from '@nestjs/common';
import { fromISO } from '../lib/datetime';

import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { RfqDocument } from '../rfq/entities/rfq-document.entity';
import { RfqService } from '../rfq/rfq.service';
import { CreateUnifiedRfqDto } from '../rfq/dto/create-unified-rfq.dto';
import { SaveRfqDraftDto, RfqDraftResponseDto } from '../rfq/dto/rfq-draft.dto';
import {
  RfqQueryDto,
  RfqListItemDto,
  RfqListResponseDto,
  RfqDetailDto,
  RfqItemDetailDto,
  RfqDocumentDto,
  RfqFullDraftDto,
} from './dto/admin-rfq.dto';

@Injectable()
export class AdminRfqService {
  private readonly logger = new Logger(AdminRfqService.name);

  constructor(
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(RfqDraft)
    private readonly rfqDraftRepo: Repository<RfqDraft>,
    @InjectRepository(RfqItem)
    private readonly rfqItemRepo: Repository<RfqItem>,
    @InjectRepository(RfqDocument)
    private readonly rfqDocumentRepo: Repository<RfqDocument>,
    @Inject(forwardRef(() => RfqService))
    private readonly rfqService: RfqService,
  ) {}

  /**
   * Get all RFQ Drafts with filtering and pagination (VIEW-ONLY)
   */
  async getAllRfqs(queryDto: RfqQueryDto): Promise<RfqListResponseDto> {
    const {
      search,
      status,
      customerId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = queryDto;

    const queryBuilder = this.rfqDraftRepo
      .createQueryBuilder('draft')
      .leftJoinAndSelect('draft.createdBy', 'user');

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(draft.projectName ILIKE :search OR draft.draftNumber ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply status filter - map to currentStep for drafts
    if (status) {
      // For drafts, status is based on completion/conversion
      if (status === 'DRAFT') {
        queryBuilder.andWhere('draft.isConverted = false');
      } else if (status === 'PENDING') {
        queryBuilder.andWhere('draft.isConverted = true');
      }
    }

    // Apply customer filter
    if (customerId) {
      queryBuilder.andWhere('user.id = :customerId', { customerId });
    }

    // Apply date range filter
    if (dateFrom && dateTo) {
      queryBuilder.andWhere('draft.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: fromISO(dateFrom).toJSDate(),
        dateTo: fromISO(dateTo).toJSDate(),
      });
    }

    // Apply sorting
    const sortField =
      sortBy === 'projectName' ? 'draft.projectName' : 'draft.createdAt';
    queryBuilder.orderBy(sortField, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const drafts = await queryBuilder.getMany();

    // Map to DTOs
    const items: RfqListItemDto[] = drafts.map((draft) => ({
      id: draft.id,
      projectName: draft.projectName || draft.draftNumber,
      customerName: draft.createdBy?.username || '',
      customerEmail: draft.createdBy?.email || '',
      status: draft.isConverted ? 'SUBMITTED' : 'DRAFT',
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      itemCount: draft.straightPipeEntries?.length || 0,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get RFQ Draft detail by ID (VIEW-ONLY)
   */
  async getRfqDetail(rfqId: number): Promise<RfqDetailDto> {
    const draft = await this.rfqDraftRepo.findOne({
      where: { id: rfqId },
      relations: ['createdBy'],
    });

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    return {
      id: draft.id,
      projectName: draft.projectName || draft.draftNumber,
      description: draft.formData?.description || undefined,
      requiredDate: draft.formData?.requiredDate || undefined,
      customerName: draft.createdBy?.username || '',
      customerEmail: draft.createdBy?.email || '',
      customerPhone: draft.formData?.customerPhone || undefined,
      status: draft.isConverted ? 'SUBMITTED' : 'DRAFT',
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      createdBy: draft.createdBy
        ? {
            id: draft.createdBy.id,
            email: draft.createdBy.email,
            name: draft.createdBy.username || '',
          }
        : undefined,
    };
  }

  /**
   * Get full RFQ Draft data for editing
   */
  async getRfqFullDraft(rfqId: number): Promise<RfqFullDraftDto> {
    const draft = await this.rfqDraftRepo.findOne({
      where: { id: rfqId },
    });

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    return {
      id: draft.id,
      draftNumber: draft.draftNumber,
      projectName: draft.projectName,
      currentStep: draft.currentStep,
      completionPercentage: draft.completionPercentage,
      isConverted: draft.isConverted,
      convertedRfqId: draft.convertedRfqId,
      formData: draft.formData || {},
      globalSpecs: draft.globalSpecs,
      requiredProducts: draft.requiredProducts,
      straightPipeEntries: draft.straightPipeEntries,
      pendingDocuments: draft.pendingDocuments,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  /**
   * Get RFQ Draft items with specifications (VIEW-ONLY)
   */
  async getRfqItems(rfqId: number): Promise<RfqItemDetailDto[]> {
    const draft = await this.rfqDraftRepo.findOne({
      where: { id: rfqId },
    });

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    // Extract items from draft's straightPipeEntries
    const entries = draft.straightPipeEntries || [];
    return entries.map((entry, index) => ({
      id: index + 1,
      type: 'STRAIGHT_PIPE',
      quantity: entry.quantity || 1,
      weightPerUnit: entry.weightPerUnit || undefined,
      totalWeight: entry.totalWeight || undefined,
      unitPrice: undefined,
      totalPrice: undefined,
      specifications: entry,
    }));
  }

  /**
   * Get RFQ Draft documents (VIEW-ONLY)
   */
  async getRfqDocuments(rfqId: number): Promise<RfqDocumentDto[]> {
    const draft = await this.rfqDraftRepo.findOne({
      where: { id: rfqId },
      relations: ['createdBy'],
    });

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    // Extract documents from draft's pendingDocuments
    const docs = draft.pendingDocuments || [];
    return docs.map((doc, index) => ({
      id: index + 1,
      fileName: doc.fileName || doc.name || 'Unknown',
      filePath: doc.filePath || '',
      mimeType: doc.mimeType || 'application/octet-stream',
      fileSize: doc.fileSize || 0,
      uploadedAt: draft.createdAt,
      uploadedBy: draft.createdBy
        ? {
            id: draft.createdBy.id,
            email: draft.createdBy.email,
            name: draft.createdBy.username || '',
          }
        : undefined,
    }));
  }

  /**
   * Download RFQ document (VIEW-ONLY)
   */
  async downloadDocument(documentId: number): Promise<{
    file: StreamableFile;
    fileName: string;
    mimeType: string;
  }> {
    const document = await this.rfqDocumentRepo.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (!fs.existsSync(document.filePath)) {
      this.logger.error(`File not found at path: ${document.filePath}`);
      throw new NotFoundException('Document file not found on server');
    }

    const fileStream = createReadStream(document.filePath);

    return {
      file: new StreamableFile(fileStream),
      fileName: document.filename,
      mimeType: document.mimeType,
    };
  }

  /**
   * Update RFQ as admin (bypasses customer ownership check)
   */
  async updateRfq(
    id: number,
    dto: CreateUnifiedRfqDto,
  ): Promise<{ rfq: Rfq; itemsUpdated: number }> {
    this.logger.log(`Admin updating RFQ ${id}`);

    const draft = await this.rfqDraftRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${id} not found`);
    }

    const userId = draft.createdBy?.id;
    if (!userId) {
      throw new NotFoundException(`RFQ Draft ${id} has no associated user`);
    }

    return this.rfqService.updateUnifiedRfq(id, dto, userId);
  }

  /**
   * Save/update RFQ draft as admin (bypasses customer ownership check)
   */
  async saveDraft(dto: SaveRfqDraftDto): Promise<RfqDraftResponseDto> {
    this.logger.log(`Admin saving draft ${dto.draftId || 'new'}`);

    if (dto.draftId) {
      const draft = await this.rfqDraftRepo.findOne({
        where: { id: dto.draftId },
        relations: ['createdBy'],
      });

      if (!draft) {
        throw new NotFoundException(`RFQ Draft with ID ${dto.draftId} not found`);
      }

      const userId = draft.createdBy?.id;
      if (!userId) {
        throw new NotFoundException(`RFQ Draft ${dto.draftId} has no associated user`);
      }

      return this.rfqService.saveDraft(dto, userId);
    }

    throw new NotFoundException('Draft ID is required for admin updates');
  }
}
