import { Injectable } from "@nestjs/common";
import { EducationRequirementDraftRepository } from "../repositories/education-requirement-draft.repository";

export interface PublicRequirement {
  fieldKey: string;
  label: string;
  value: Record<string, unknown>;
}

export interface PublicProgrammeRequirements {
  programmeId: string;
  intakeYear: number;
  requirements: PublicRequirement[];
  pendingCount: number;
  allConfirmed: boolean;
  note: string | null;
}

@Injectable()
export class EducationRequirementsReadService {
  constructor(private readonly draftRepo: EducationRequirementDraftRepository) {}

  async approvedForProgramme(
    programmeId: string,
    intakeYear: number,
  ): Promise<PublicProgrammeRequirements> {
    const drafts = await this.draftRepo.findForProgrammeYear(programmeId, intakeYear);
    const approved = drafts.filter((draft) => draft.status === "approved");
    const pendingCount = drafts.filter(
      (draft) => draft.status === "draft" || draft.status === "changed",
    ).length;
    return {
      programmeId,
      intakeYear,
      requirements: approved.map((draft) => ({
        fieldKey: draft.fieldKey,
        label: draft.label,
        value: draft.approvedValue ?? draft.extractedValue,
      })),
      pendingCount,
      allConfirmed: pendingCount === 0 && approved.length > 0,
      note: pendingCount > 0 ? "Marks still to be confirmed" : null,
    };
  }
}
