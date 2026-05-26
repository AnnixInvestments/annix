import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { type IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  EducationRequirementDraft,
  type RequirementDraftStatus,
} from "../entities/education-requirement-draft.entity";
import { EducationExtractionCorrectionRepository } from "../repositories/education-extraction-correction.repository";
import { EducationRequirementDraftRepository } from "../repositories/education-requirement-draft.repository";

export interface DraftView {
  id: string;
  programmeId: string | null;
  institutionId: string | null;
  intakeYear: number;
  fieldKey: string;
  label: string;
  extractedValue: Record<string, unknown>;
  approvedValue: Record<string, unknown> | null;
  status: RequirementDraftStatus;
  confidence: string | null;
  sourceUrl: string;
  screenshotUrl: string | null;
  rawSnippet: string | null;
  fetchedAt: Date;
}

export interface DraftFilter {
  programmeId?: string;
  institutionId?: string;
  status?: RequirementDraftStatus;
}

export interface ProgrammeRequirements {
  approved: DraftView[];
  pendingCount: number;
  allConfirmed: boolean;
}

@Injectable()
export class EducationDraftReviewService {
  constructor(
    private readonly draftRepo: EducationRequirementDraftRepository,
    private readonly correctionRepo: EducationExtractionCorrectionRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  async list(filter: DraftFilter): Promise<DraftView[]> {
    const drafts = await this.draftRepo.findMatching(filter);
    return Promise.all(drafts.map((draft) => this.toView(draft)));
  }

  async approve(id: string, approvedById: number | null): Promise<DraftView> {
    const draft = await this.require(id);
    draft.approvedValue = draft.approvedValue ?? draft.extractedValue;
    draft.status = "approved";
    draft.approvedById = approvedById;
    draft.approvedAt = now().toJSDate();
    return this.toView(await this.draftRepo.save(draft));
  }

  async correct(
    id: string,
    correctedValue: Record<string, unknown>,
    approvedById: number | null,
  ): Promise<DraftView> {
    const draft = await this.require(id);
    await this.correctionRepo.create({
      institutionId: draft.institutionId,
      fieldKey: draft.fieldKey,
      extractedValue: draft.extractedValue,
      correctedValue,
      sourceUrl: draft.sourceUrl,
    });
    draft.approvedValue = correctedValue;
    draft.status = "approved";
    draft.approvedById = approvedById;
    draft.approvedAt = now().toJSDate();
    return this.toView(await this.draftRepo.save(draft));
  }

  async reject(id: string): Promise<DraftView> {
    const draft = await this.require(id);
    draft.status = "rejected";
    return this.toView(await this.draftRepo.save(draft));
  }

  async approvedForProgramme(
    programmeId: string,
    intakeYear: number,
  ): Promise<ProgrammeRequirements> {
    const drafts = await this.draftRepo.findForProgrammeYear(programmeId, intakeYear);
    const approved = drafts.filter((draft) => draft.status === "approved");
    const pendingCount = drafts.filter(
      (draft) => draft.status === "draft" || draft.status === "changed",
    ).length;
    const approvedViews = await Promise.all(approved.map((draft) => this.toView(draft)));
    return {
      approved: approvedViews,
      pendingCount,
      allConfirmed: pendingCount === 0 && approved.length > 0,
    };
  }

  private async require(id: string): Promise<EducationRequirementDraft> {
    const draft = await this.draftRepo.findById(id);
    if (!draft) {
      throw new NotFoundException(`Requirement draft ${id} not found`);
    }
    return draft;
  }

  private async toView(draft: EducationRequirementDraft): Promise<DraftView> {
    let screenshotUrl: string | null = null;
    if (draft.screenshotPath) {
      try {
        screenshotUrl = await this.storage.presignedUrl(draft.screenshotPath, 3600);
      } catch {
        screenshotUrl = null;
      }
    }
    return {
      id: draft.id,
      programmeId: draft.programmeId,
      institutionId: draft.institutionId,
      intakeYear: draft.intakeYear,
      fieldKey: draft.fieldKey,
      label: draft.label,
      extractedValue: draft.extractedValue,
      approvedValue: draft.approvedValue,
      status: draft.status,
      confidence: draft.confidence,
      sourceUrl: draft.sourceUrl,
      screenshotUrl,
      rawSnippet: draft.rawSnippet,
      fetchedAt: draft.fetchedAt,
    };
  }
}
