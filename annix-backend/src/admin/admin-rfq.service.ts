import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import { StreamableFile } from '@nestjs/common';
import { fromISO, now } from '../lib/datetime';

import { Rfq } from '../rfq/entities/rfq.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { RfqItem } from '../rfq/entities/rfq-item.entity';
import { RfqDocument } from '../rfq/entities/rfq-document.entity';
import { AnonymousDraft } from '../rfq/entities/anonymous-draft.entity';
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
  RfqStatus,
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
    @InjectRepository(AnonymousDraft)
    private readonly anonymousDraftRepo: Repository<AnonymousDraft>,
    @Inject(forwardRef(() => RfqService))
    private readonly rfqService: RfqService,
  ) {}

  /**
   * Get all RFQ Drafts with filtering and pagination (VIEW-ONLY)
   * Includes both registered customer drafts and anonymous (unregistered) drafts
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

    // Query registered customer drafts
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
    if (status && status !== RfqStatus.UNREGISTERED) {
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

    // Get registered drafts (skip if filtering for UNREGISTERED only)
    let registeredDrafts: RfqDraft[] = [];
    let registeredTotal = 0;
    if (status !== RfqStatus.UNREGISTERED) {
      registeredTotal = await queryBuilder.getCount();
      registeredDrafts = await queryBuilder.getMany();
    }

    // Query anonymous (unregistered) drafts
    const anonQueryBuilder = this.anonymousDraftRepo
      .createQueryBuilder('anon')
      .where('anon.isClaimed = false');

    // Apply search filter for anonymous drafts
    if (search) {
      anonQueryBuilder.andWhere(
        '(anon.projectName ILIKE :search OR anon.customerEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply date range filter for anonymous drafts
    if (dateFrom && dateTo) {
      anonQueryBuilder.andWhere('anon.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: fromISO(dateFrom).toJSDate(),
        dateTo: fromISO(dateTo).toJSDate(),
      });
    }

    // Get anonymous drafts (skip if filtering for non-UNREGISTERED status)
    let anonymousDrafts: AnonymousDraft[] = [];
    let anonymousTotal = 0;
    if (!status || status === RfqStatus.UNREGISTERED || status === RfqStatus.DRAFT) {
      anonymousTotal = await anonQueryBuilder.getCount();
      anonymousDrafts = await anonQueryBuilder.getMany();
    }

    // Map registered drafts to DTOs
    const today = now().startOf('day');
    const registeredItems: RfqListItemDto[] = registeredDrafts.map((draft) => {
      const requiredDate = draft.formData?.requiredDate
        ? new Date(draft.formData.requiredDate)
        : undefined;
      const isPastDeadline = requiredDate
        ? fromISO(draft.formData.requiredDate).startOf('day') < today
        : false;

      return {
        id: draft.id,
        projectName: draft.projectName || draft.draftNumber,
        customerName: draft.createdBy?.username || '',
        customerEmail: draft.createdBy?.email || '',
        status: draft.isConverted ? 'SUBMITTED' : 'DRAFT',
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        itemCount: draft.straightPipeEntries?.length || 0,
        requiredDate,
        isPastDeadline,
      };
    });

    // Map anonymous drafts to DTOs (use negative IDs to distinguish them)
    const anonymousItems: RfqListItemDto[] = anonymousDrafts.map((draft) => {
      const requiredDate = draft.formData?.requiredDate
        ? new Date(draft.formData.requiredDate)
        : undefined;
      const isPastDeadline = requiredDate
        ? fromISO(draft.formData.requiredDate).startOf('day') < today
        : false;

      return {
        id: -draft.id,
        projectName: draft.projectName || `Anonymous Draft`,
        customerName: draft.formData?.customerName || draft.formData?.companyName || 'Unknown',
        customerEmail: draft.customerEmail || '',
        status: 'DRAFT',
        isUnregistered: true,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        itemCount: draft.entries?.length || 0,
        requiredDate,
        isPastDeadline,
      };
    });

    // Combine and sort all items
    const allItems = [...registeredItems, ...anonymousItems];
    allItems.sort((a, b) => {
      if (sortOrder === 'DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Calculate total and apply pagination
    const total = registeredTotal + anonymousTotal;
    const skip = (page - 1) * limit;
    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get RFQ Draft detail by ID (VIEW-ONLY)
   * Negative IDs indicate anonymous drafts
   */
  async getRfqDetail(rfqId: number): Promise<RfqDetailDto> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findOne({
        where: { id: Math.abs(rfqId) },
      });

      if (!anonDraft) {
        throw new NotFoundException(`Anonymous RFQ Draft with ID ${Math.abs(rfqId)} not found`);
      }

      return {
        id: rfqId,
        projectName: anonDraft.projectName || `Anonymous Draft`,
        description: anonDraft.formData?.description || undefined,
        requiredDate: anonDraft.formData?.requiredDate || undefined,
        customerName: anonDraft.formData?.customerName || anonDraft.formData?.companyName || 'Unknown',
        customerEmail: anonDraft.customerEmail || '',
        customerPhone: anonDraft.formData?.customerPhone || undefined,
        status: 'DRAFT',
        isUnregistered: true,
        createdAt: anonDraft.createdAt,
        updatedAt: anonDraft.updatedAt,
        createdBy: undefined,
      };
    }

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
   * Negative IDs indicate anonymous drafts
   */
  async getRfqFullDraft(rfqId: number): Promise<RfqFullDraftDto> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findOne({
        where: { id: Math.abs(rfqId) },
      });

      if (!anonDraft) {
        throw new NotFoundException(`Anonymous RFQ Draft with ID ${Math.abs(rfqId)} not found`);
      }

      return {
        id: rfqId,
        draftNumber: `ANON-${anonDraft.id}`,
        projectName: anonDraft.projectName,
        currentStep: anonDraft.currentStep,
        completionPercentage: Math.round((anonDraft.currentStep / 5) * 100),
        isConverted: false,
        convertedRfqId: undefined,
        formData: anonDraft.formData || {},
        globalSpecs: anonDraft.globalSpecs,
        requiredProducts: anonDraft.requiredProducts,
        straightPipeEntries: anonDraft.entries,
        pendingDocuments: undefined,
        createdAt: anonDraft.createdAt,
        updatedAt: anonDraft.updatedAt,
      };
    }

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
   * Negative IDs indicate anonymous drafts
   */
  async getRfqItems(rfqId: number): Promise<RfqItemDetailDto[]> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findOne({
        where: { id: Math.abs(rfqId) },
      });

      if (!anonDraft) {
        throw new NotFoundException(`Anonymous RFQ Draft with ID ${Math.abs(rfqId)} not found`);
      }

      const entries = anonDraft.entries || [];
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
        throw new NotFoundException(
          `RFQ Draft with ID ${dto.draftId} not found`,
        );
      }

      const userId = draft.createdBy?.id;
      if (!userId) {
        throw new NotFoundException(
          `RFQ Draft ${dto.draftId} has no associated user`,
        );
      }

      return this.rfqService.saveDraft(dto, userId);
    }

    throw new NotFoundException('Draft ID is required for admin updates');
  }
}
