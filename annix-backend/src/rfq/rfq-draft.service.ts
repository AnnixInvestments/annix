import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Boq } from "../boq/entities/boq.entity";
import { BoqSupplierAccess, SupplierBoqStatus } from "../boq/entities/boq-supplier-access.entity";
import { now } from "../lib/datetime";
import { User } from "../user/entities/user.entity";
import { RfqDraftFullResponseDto, RfqDraftResponseDto, SaveRfqDraftDto } from "./dto/rfq-draft.dto";
import { RfqStatus } from "./entities/rfq.entity";
import { RfqDraft } from "./entities/rfq-draft.entity";

/**
 * RFQ Draft Management Service
 *
 * Extracted from rfq.service.ts (issue #191, Phase 7 megacomponent split).
 * Owns the CRUD lifecycle for in-progress RFQ drafts: save-new / update /
 * list / get-by-id / get-by-number / delete / mark-as-converted. Drafts are
 * per-user form progress snapshots; they graduate to a real RFQ when the
 * customer completes the wizard.
 */
@Injectable()
export class RfqDraftService {
  constructor(
    @InjectRepository(RfqDraft)
    private rfqDraftRepository: Repository<RfqDraft>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Boq)
    private boqRepository: Repository<Boq>,
    @InjectRepository(BoqSupplierAccess)
    private boqSupplierAccessRepository: Repository<BoqSupplierAccess>,
  ) {}

  private async generateDraftNumber(): Promise<string> {
    const year = now().year;
    const draftCount = await this.rfqDraftRepository.count();
    return `DRAFT-${year}-${String(draftCount + 1).padStart(4, "0")}`;
  }

  private readonly stepPercentages: Record<number, number> = {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 95,
  };

  private completionPercentageForStep(step: number): number {
    return this.stepPercentages[step] || 0;
  }

  private calculateCompletionPercentage(dto: SaveRfqDraftDto): number {
    return this.completionPercentageForStep(dto.currentStep);
  }

  /**
   * Save or update an RFQ draft
   */
  async saveDraft(dto: SaveRfqDraftDto, userId: number): Promise<RfqDraftResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let draft: RfqDraft;

    if (dto.draftId) {
      // Update existing draft
      const existingDraft = await this.rfqDraftRepository.findOne({
        where: { id: dto.draftId, createdBy: { id: userId } },
      });
      if (!existingDraft) {
        throw new NotFoundException(`Draft with ID ${dto.draftId} not found or access denied`);
      }
      if (existingDraft.isConverted) {
        throw new BadRequestException("Cannot update a draft that has been converted to an RFQ");
      }
      draft = existingDraft;
    } else {
      // Create new draft
      draft = new RfqDraft();
      draft.draftNumber = await this.generateDraftNumber();
      draft.createdBy = user;
    }

    // Update draft fields
    draft.customerRfqReference = dto.customerRfqReference || dto.formData.customerRfqReference;
    draft.projectName = dto.projectName || dto.formData.projectName || "Untitled Draft";
    draft.currentStep = dto.currentStep;
    draft.formData = dto.formData;
    draft.globalSpecs = dto.globalSpecs;
    draft.requiredProducts = dto.requiredProducts;
    draft.straightPipeEntries = dto.straightPipeEntries;
    draft.pendingDocuments = dto.pendingDocuments;
    draft.completionPercentage = this.calculateCompletionPercentage(dto);

    const savedDraft = await this.rfqDraftRepository.save(draft);

    return this.mapDraftToResponse(savedDraft);
  }

  async drafts(userId: number): Promise<RfqDraftResponseDto[]> {
    const drafts = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .leftJoinAndSelect("draft.convertedRfq", "rfq")
      .where("draft.created_by_user_id = :userId", { userId })
      .orderBy("draft.updated_at", "DESC")
      .getMany();

    const convertedRfqIds = drafts
      .filter((draft) => draft.isConverted && draft.convertedRfqId)
      .map((draft) => draft.convertedRfqId as number);

    const supplierCountsMap =
      convertedRfqIds.length > 0
        ? await this.batchSupplierCountsForRfqs(convertedRfqIds)
        : new Map<
            number,
            {
              pending: number;
              declined: number;
              intendToQuote: number;
              quoted: number;
            }
          >();

    return drafts.map((draft) => {
      const response = this.mapDraftToResponse(draft);
      if (draft.isConverted && draft.convertedRfqId) {
        response.supplierCounts = supplierCountsMap.get(draft.convertedRfqId) || {
          pending: 0,
          declined: 0,
          intendToQuote: 0,
          quoted: 0,
        };
      }
      return response;
    });
  }

  private async batchSupplierCountsForRfqs(rfqIds: number[]): Promise<
    Map<
      number,
      {
        pending: number;
        declined: number;
        intendToQuote: number;
        quoted: number;
      }
    >
  > {
    const boqs = await this.boqRepository
      .createQueryBuilder("boq")
      .select(["boq.id", "boq.rfq"])
      .innerJoin("boq.rfq", "rfq")
      .addSelect("rfq.id")
      .where("rfq.id IN (:...rfqIds)", { rfqIds })
      .getMany();

    if (boqs.length === 0) {
      return new Map();
    }

    const boqIdToRfqId = new Map(boqs.map((b) => [b.id, b.rfq?.id as number]));
    const boqIds = boqs.map((b) => b.id);

    const counts = await this.boqSupplierAccessRepository
      .createQueryBuilder("access")
      .select("access.boq_id", "boqId")
      .addSelect("access.status", "status")
      .addSelect("COUNT(DISTINCT access.supplier_profile_id)", "count")
      .where("access.boq_id IN (:...boqIds)", { boqIds })
      .groupBy("access.boq_id")
      .addGroupBy("access.status")
      .getRawMany<{ boqId: number; status: string; count: string }>();

    const resultMap = new Map<
      number,
      {
        pending: number;
        declined: number;
        intendToQuote: number;
        quoted: number;
      }
    >();

    rfqIds.forEach((rfqId) => {
      resultMap.set(rfqId, {
        pending: 0,
        declined: 0,
        intendToQuote: 0,
        quoted: 0,
      });
    });

    counts.forEach((row) => {
      const rfqId = boqIdToRfqId.get(row.boqId);
      if (rfqId === undefined) return;

      const result = resultMap.get(rfqId);
      if (!result) return;

      const count = parseInt(row.count, 10);
      switch (row.status) {
        case SupplierBoqStatus.PENDING:
          result.pending += count;
          break;
        case SupplierBoqStatus.DECLINED:
          result.declined += count;
          break;
        case SupplierBoqStatus.VIEWED:
          result.intendToQuote += count;
          break;
        case SupplierBoqStatus.QUOTED:
          result.quoted += count;
          break;
      }
    });

    return resultMap;
  }

  /**
   * Get a single draft with full data
   */
  async draftById(draftId: number, userId: number): Promise<RfqDraftFullResponseDto> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.id = :draftId", { draftId })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Get a draft by draft number
   */
  async draftByNumber(draftNumber: string, userId: number): Promise<RfqDraftFullResponseDto> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.draft_number = :draftNumber", { draftNumber })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft ${draftNumber} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: number, userId: number): Promise<void> {
    const draft = await this.rfqDraftRepository
      .createQueryBuilder("draft")
      .where("draft.id = :draftId", { draftId })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found or access denied`);
    }

    if (draft.isConverted) {
      throw new BadRequestException("Cannot delete a draft that has been converted to an RFQ");
    }

    await this.rfqDraftRepository.remove(draft);
  }

  /**
   * Mark a draft as converted to RFQ
   */
  async markDraftAsConverted(draftId: number, rfqId: number, userId: number): Promise<void> {
    const draft = await this.rfqDraftRepository.findOne({
      where: { id: draftId, createdBy: { id: userId } },
    });

    if (draft) {
      draft.isConverted = true;
      draft.convertedRfqId = rfqId;
      await this.rfqDraftRepository.save(draft);
    }
  }

  /**
   * Map draft entity to response DTO
   */
  private mapDraftToResponse(draft: RfqDraft): RfqDraftResponseDto {
    const rfqStatus = draft.convertedRfq?.status;
    const status = draft.isConverted ? rfqStatus || RfqStatus.SUBMITTED : RfqStatus.DRAFT;

    return {
      id: draft.id,
      draftNumber: draft.draftNumber,
      rfqNumber: draft.convertedRfq?.rfqNumber,
      customerRfqReference: draft.customerRfqReference,
      projectName: draft.projectName,
      currentStep: draft.currentStep,
      completionPercentage: draft.isConverted
        ? 100
        : this.completionPercentageForStep(draft.currentStep),
      status,
      createdAt: draft.createdAt,
      updatedAt: draft.convertedRfq?.updatedAt || draft.updatedAt,
      isConverted: draft.isConverted,
      convertedRfqId: draft.convertedRfqId,
    };
  }

  /**
   * Map draft entity to full response DTO
   */
  private mapDraftToFullResponse(draft: RfqDraft): RfqDraftFullResponseDto {
    return {
      ...this.mapDraftToResponse(draft),
      formData: draft.formData,
      globalSpecs: draft.globalSpecs,
      requiredProducts: draft.requiredProducts,
      straightPipeEntries: draft.straightPipeEntries,
      pendingDocuments: draft.pendingDocuments,
    };
  }
}
