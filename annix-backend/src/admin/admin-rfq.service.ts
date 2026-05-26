import * as fs from "node:fs";
import { createReadStream } from "node:fs";
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { fromISO, fromJSDate, now } from "../lib/datetime";
import { AnonymousDraftRepository } from "../rfq/anonymous-draft.repository";
import { CreateUnifiedRfqDto } from "../rfq/dto/create-unified-rfq.dto";
import { RfqDraftResponseDto, SaveRfqDraftDto } from "../rfq/dto/rfq-draft.dto";
import { AnonymousDraft } from "../rfq/entities/anonymous-draft.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqDraft } from "../rfq/entities/rfq-draft.entity";
import { RfqService } from "../rfq/rfq.service";
import { RfqDocumentRepository } from "../rfq/rfq-document.repository";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { RfqDraftService } from "../rfq/rfq-draft.service";
import {
  RfqDetailDto,
  RfqDocumentDto,
  RfqFullDraftDto,
  RfqItemDetailDto,
  RfqListItemDto,
  RfqListResponseDto,
  RfqQueryDto,
  RfqStatus,
} from "./dto/admin-rfq.dto";

@Injectable()
export class AdminRfqService {
  private readonly logger = new Logger(AdminRfqService.name);

  constructor(
    private readonly rfqDraftRepo: RfqDraftRepository,
    private readonly rfqDocumentRepo: RfqDocumentRepository,
    private readonly anonymousDraftRepo: AnonymousDraftRepository,
    @Inject(forwardRef(() => RfqService))
    private readonly rfqService: RfqService,
    private readonly rfqDraftService: RfqDraftService,
  ) {}

  /**
   * Get all RFQ Drafts with filtering and pagination (VIEW-ONLY)
   * Includes both registered customer drafts and anonymous (unregistered) drafts
   */
  async listRfqs(queryDto: RfqQueryDto): Promise<RfqListResponseDto> {
    const {
      search,
      status,
      customerId,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "DESC",
      page = 1,
      limit = 20,
    } = queryDto;

    const dateFromJs = dateFrom ? fromISO(dateFrom).toJSDate() : undefined;
    const dateToJs = dateTo ? fromISO(dateTo).toJSDate() : undefined;

    let registeredDrafts: RfqDraft[] = [];
    let registeredTotal = 0;
    if (status !== RfqStatus.UNREGISTERED) {
      const result = await this.rfqDraftRepo.searchPaginatedWithCreator({
        search,
        status,
        customerId,
        dateFrom: dateFromJs,
        dateTo: dateToJs,
        sortBy: sortBy === "projectName" ? "projectName" : "createdAt",
        sortOrder,
      });
      registeredDrafts = result.items;
      registeredTotal = result.total;
    }

    let anonymousDrafts: AnonymousDraft[] = [];
    let anonymousTotal = 0;
    if (!status || status === RfqStatus.UNREGISTERED || status === RfqStatus.DRAFT) {
      const result = await this.anonymousDraftRepo.searchUnclaimedPaginated({
        search,
        dateFrom: dateFromJs,
        dateTo: dateToJs,
      });
      anonymousDrafts = result.items;
      anonymousTotal = result.total;
    }

    // Map registered drafts to DTOs
    const today = now().startOf("day");
    const registeredItems: RfqListItemDto[] = registeredDrafts.map((draft) => {
      const requiredDate = draft.formData?.requiredDate
        ? fromISO(draft.formData.requiredDate).toJSDate()
        : undefined;
      const isPastDeadline = requiredDate
        ? fromISO(draft.formData.requiredDate).startOf("day") < today
        : false;

      return {
        id: draft.id,
        projectName: draft.projectName || draft.draftNumber,
        customerName: draft.createdBy?.username || "",
        customerEmail: draft.createdBy?.email || "",
        status: draft.isConverted ? "SUBMITTED" : "DRAFT",
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
        ? fromISO(draft.formData.requiredDate).toJSDate()
        : undefined;
      const isPastDeadline = requiredDate
        ? fromISO(draft.formData.requiredDate).startOf("day") < today
        : false;

      return {
        id: -draft.id,
        projectName: draft.projectName || "Anonymous Draft",
        customerName: draft.formData?.customerName || draft.formData?.companyName || "Unknown",
        customerEmail: draft.customerEmail || "",
        status: "DRAFT",
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
      if (sortOrder === "DESC") {
        return fromJSDate(b.createdAt).toMillis() - fromJSDate(a.createdAt).toMillis();
      }
      return fromJSDate(a.createdAt).toMillis() - fromJSDate(b.createdAt).toMillis();
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
  async rfqDetail(rfqId: number): Promise<RfqDetailDto> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findById(Math.abs(rfqId));

      if (!anonDraft) {
        throw new NotFoundException(`Anonymous RFQ Draft with ID ${Math.abs(rfqId)} not found`);
      }

      return {
        id: rfqId,
        projectName: anonDraft.projectName || "Anonymous Draft",
        description: anonDraft.formData?.description || undefined,
        requiredDate: anonDraft.formData?.requiredDate || undefined,
        customerName:
          anonDraft.formData?.customerName || anonDraft.formData?.companyName || "Unknown",
        customerEmail: anonDraft.customerEmail || "",
        customerPhone: anonDraft.formData?.customerPhone || undefined,
        status: "DRAFT",
        isUnregistered: true,
        createdAt: anonDraft.createdAt,
        updatedAt: anonDraft.updatedAt,
        createdBy: undefined,
      };
    }

    const draft = await this.rfqDraftRepo.findByIdWithCreator(rfqId);

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    return {
      id: draft.id,
      projectName: draft.projectName || draft.draftNumber,
      description: draft.formData?.description || undefined,
      requiredDate: draft.formData?.requiredDate || undefined,
      customerName: draft.createdBy?.username || "",
      customerEmail: draft.createdBy?.email || "",
      customerPhone: draft.formData?.customerPhone || undefined,
      status: draft.isConverted ? "SUBMITTED" : "DRAFT",
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      createdBy: draft.createdBy
        ? {
            id: draft.createdBy.id,
            email: draft.createdBy.email,
            name: draft.createdBy.username || "",
          }
        : undefined,
    };
  }

  /**
   * Get full RFQ Draft data for editing
   * Negative IDs indicate anonymous drafts
   */
  async rfqFullDraft(rfqId: number): Promise<RfqFullDraftDto> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findById(Math.abs(rfqId));

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

    const draft = await this.rfqDraftRepo.findById(rfqId);

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
  async rfqItems(rfqId: number): Promise<RfqItemDetailDto[]> {
    if (rfqId < 0) {
      const anonDraft = await this.anonymousDraftRepo.findById(Math.abs(rfqId));

      if (!anonDraft) {
        throw new NotFoundException(`Anonymous RFQ Draft with ID ${Math.abs(rfqId)} not found`);
      }

      const entries = anonDraft.entries || [];
      return entries.map((entry, index) => ({
        id: index + 1,
        type: "STRAIGHT_PIPE",
        quantity: entry.quantity || 1,
        weightPerUnit: entry.weightPerUnit || undefined,
        totalWeight: entry.totalWeight || undefined,
        unitPrice: undefined,
        totalPrice: undefined,
        specifications: entry,
      }));
    }

    const draft = await this.rfqDraftRepo.findById(rfqId);

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    // Extract items from draft's straightPipeEntries
    const entries = draft.straightPipeEntries || [];
    return entries.map((entry, index) => ({
      id: index + 1,
      type: "STRAIGHT_PIPE",
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
  async rfqDocuments(rfqId: number): Promise<RfqDocumentDto[]> {
    const draft = await this.rfqDraftRepo.findByIdWithCreator(rfqId);

    if (!draft) {
      throw new NotFoundException(`RFQ Draft with ID ${rfqId} not found`);
    }

    // Extract documents from draft's pendingDocuments
    const docs = draft.pendingDocuments || [];
    return docs.map((doc, index) => ({
      id: index + 1,
      fileName: doc.fileName || doc.name || "Unknown",
      filePath: doc.filePath || "",
      mimeType: doc.mimeType || "application/octet-stream",
      fileSize: doc.fileSize || 0,
      uploadedAt: draft.createdAt,
      uploadedBy: draft.createdBy
        ? {
            id: draft.createdBy.id,
            email: draft.createdBy.email,
            name: draft.createdBy.username || "",
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
    const document = await this.rfqDocumentRepo.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (!fs.existsSync(document.filePath)) {
      this.logger.error(`File not found at path: ${document.filePath}`);
      throw new NotFoundException("Document file not found on server");
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

    const draft = await this.rfqDraftRepo.findByIdWithCreator(id);

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
    this.logger.log(`Admin saving draft ${dto.draftId || "new"}`);

    if (dto.draftId) {
      const draft = await this.rfqDraftRepo.findByIdWithCreator(dto.draftId);

      if (!draft) {
        throw new NotFoundException(`RFQ Draft with ID ${dto.draftId} not found`);
      }

      const userId = draft.createdBy?.id;
      if (!userId) {
        throw new NotFoundException(`RFQ Draft ${dto.draftId} has no associated user`);
      }

      return this.rfqDraftService.saveDraft(dto, userId);
    }

    throw new NotFoundException("Draft ID is required for admin updates");
  }
}
