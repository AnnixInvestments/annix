import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BoqRepository } from "../boq/boq.repository";
import { BoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository";
import { SupplierBoqStatus } from "../boq/entities/boq-supplier-access.entity";
import { EmailService } from "../email/email.service";
import { formatDateZA, now } from "../lib/datetime";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { RfqDraftFullResponseDto, RfqDraftResponseDto, SaveRfqDraftDto } from "./dto/rfq-draft.dto";
import { RfqStatus } from "./entities/rfq.entity";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqDraftRepository } from "./rfq-draft.repository";

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
  private readonly logger = new Logger(RfqDraftService.name);

  constructor(
    private rfqDraftRepository: RfqDraftRepository,
    private userRepository: UserRepository,
    private boqRepository: BoqRepository,
    private boqSupplierAccessRepository: BoqSupplierAccessRepository,
    private emailService: EmailService,
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
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const draftFields = {
      customerRfqReference: dto.customerRfqReference || dto.formData.customerRfqReference,
      projectName: dto.projectName || dto.formData.projectName || "Untitled Draft",
      currentStep: dto.currentStep,
      formData: dto.formData,
      globalSpecs: dto.globalSpecs,
      requiredProducts: dto.requiredProducts,
      straightPipeEntries: dto.straightPipeEntries,
      pendingDocuments: dto.pendingDocuments,
      completionPercentage: this.calculateCompletionPercentage(dto),
    };

    let savedDraft: RfqDraft;

    if (dto.draftId) {
      const existingDraft = await this.rfqDraftRepository.findByIdForUser(dto.draftId, userId);
      if (!existingDraft) {
        throw new NotFoundException(`Draft with ID ${dto.draftId} not found or access denied`);
      }
      if (existingDraft.isConverted) {
        throw new BadRequestException("Cannot update a draft that has been converted to an RFQ");
      }
      Object.assign(existingDraft, draftFields);
      savedDraft = await this.rfqDraftRepository.save(existingDraft);
    } else {
      savedDraft = await this.rfqDraftRepository.create({
        draftNumber: await this.generateDraftNumber(),
        createdBy: user,
        ...draftFields,
      });
    }

    void this.sendDraftSavedNotification(savedDraft, user, !dto.draftId);

    return this.mapDraftToResponse(savedDraft);
  }

  /**
   * Notify info@annix.co.za on every draft save so the team has
   * visibility on which RFQs are mid-flight (and so the user
   * triggering the save sees a confirmation in their inbox if
   * they're cc'd via the platform fallback). Fire-and-forget — a
   * mail-server hiccup must not block the wizard.
   */
  private async sendDraftSavedNotification(
    draft: RfqDraft,
    user: User,
    isFirstSave: boolean,
  ): Promise<void> {
    try {
      const customerLine = user.email ? `${user.email}` : "(unknown user)";
      const projectLine = draft.projectName || "(unnamed project)";
      const action = isFirstSave ? "started" : "updated";
      const subject = `RFQ draft ${action}: ${draft.draftNumber} — ${projectLine}`;
      const html = `
        <p>An RFQ draft was just <strong>${action}</strong> on the platform.</p>
        <table style="border-collapse:collapse;margin:12px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Draft number</td><td style="padding:4px 0;font-family:monospace;">${draft.draftNumber}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Project</td><td style="padding:4px 0;">${projectLine}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Customer ref</td><td style="padding:4px 0;">${draft.customerRfqReference || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Step</td><td style="padding:4px 0;">${draft.currentStep} of 5 (${this.completionPercentageForStep(draft.currentStep)}%)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Saved by</td><td style="padding:4px 0;">${customerLine}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Saved at</td><td style="padding:4px 0;">${formatDateZA(draft.updatedAt)}</td></tr>
        </table>
        <p style="font-size:12px;color:#6b7280;">Resume link: <a href="${process.env.FRONTEND_URL || "https://annix-app.fly.dev"}/rfq?draft=${draft.id}">${process.env.FRONTEND_URL || "https://annix-app.fly.dev"}/rfq?draft=${draft.id}</a></p>
      `;
      const text = `RFQ draft ${action}: ${draft.draftNumber}\n\nProject: ${projectLine}\nCustomer ref: ${draft.customerRfqReference || "—"}\nStep: ${draft.currentStep}/5\nSaved by: ${customerLine}\nSaved at: ${formatDateZA(draft.updatedAt)}\n\nResume: ${process.env.FRONTEND_URL || "https://annix-app.fly.dev"}/rfq?draft=${draft.id}`;
      await this.emailService.sendEmail({
        to: "info@annix.co.za",
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send draft-saved notification for draft ${draft.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async drafts(userId: number): Promise<RfqDraftResponseDto[]> {
    const drafts = await this.rfqDraftRepository.findAllForUserWithConvertedRfq(userId);

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
    const boqLinks = await this.boqRepository.findRfqLinksByRfqIds(rfqIds);

    if (boqLinks.length === 0) {
      return new Map();
    }

    const boqIdToRfqId = new Map(boqLinks.map((link) => [link.boqId, link.rfqId]));
    const boqIds = boqLinks.map((link) => link.boqId);

    const counts =
      await this.boqSupplierAccessRepository.countDistinctSuppliersByStatusForBoqs(boqIds);

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
    const draft = await this.rfqDraftRepository.findByIdForUser(draftId, userId);

    if (!draft) {
      throw new NotFoundException(`Draft with ID ${draftId} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Get a draft by draft number
   */
  async draftByNumber(draftNumber: string, userId: number): Promise<RfqDraftFullResponseDto> {
    const draft = await this.rfqDraftRepository.findByDraftNumberForUser(draftNumber, userId);

    if (!draft) {
      throw new NotFoundException(`Draft ${draftNumber} not found or access denied`);
    }

    return this.mapDraftToFullResponse(draft);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: number, userId: number): Promise<void> {
    const draft = await this.rfqDraftRepository.findByIdForUser(draftId, userId);

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
    const draft = await this.rfqDraftRepository.findByIdForUser(draftId, userId);

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
