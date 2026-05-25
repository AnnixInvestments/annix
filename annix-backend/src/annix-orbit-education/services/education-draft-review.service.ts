import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { type IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { EducationExtractionCorrection } from "../entities/education-extraction-correction.entity";
import {
  EducationRequirementDraft,
  type RequirementDraftStatus,
} from "../entities/education-requirement-draft.entity";

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
    @InjectRepository(EducationRequirementDraft)
    private readonly draftRepo: Repository<EducationRequirementDraft>,
    @InjectRepository(EducationExtractionCorrection)
    private readonly correctionRepo: Repository<EducationExtractionCorrection>,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  async list(filter: DraftFilter): Promise<DraftView[]> {
    const where: Record<string, unknown> = {};
    if (filter.programmeId) {
      where.programmeId = filter.programmeId;
    }
    if (filter.institutionId) {
      where.institutionId = filter.institutionId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    const drafts = await this.draftRepo.find({ where, order: { fetchedAt: "DESC" } });
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
    await this.correctionRepo.save(
      this.correctionRepo.create({
        institutionId: draft.institutionId,
        fieldKey: draft.fieldKey,
        extractedValue: draft.extractedValue,
        correctedValue,
        sourceUrl: draft.sourceUrl,
      }),
    );
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
    const drafts = await this.draftRepo.find({ where: { programmeId, intakeYear } });
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
    const draft = await this.draftRepo.findOne({ where: { id } });
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
