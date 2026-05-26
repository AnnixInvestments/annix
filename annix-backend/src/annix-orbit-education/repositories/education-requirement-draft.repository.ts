import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import {
  EducationRequirementDraft,
  type RequirementDraftStatus,
} from "../entities/education-requirement-draft.entity";

export interface DraftSource {
  institutionId: string | null;
  programmeId: string | null;
  intakeYear: number;
  sourceUrl: string;
}

export interface DraftQuery {
  programmeId?: string;
  institutionId?: string;
  status?: RequirementDraftStatus;
}

export abstract class EducationRequirementDraftRepository extends CrudRepository<EducationRequirementDraft> {
  abstract createMany(
    rows: Array<DeepPartial<EducationRequirementDraft>>,
  ): Promise<EducationRequirementDraft[]>;
  abstract findMatching(query: DraftQuery): Promise<EducationRequirementDraft[]>;
  abstract findForProgrammeYear(
    programmeId: string,
    intakeYear: number,
  ): Promise<EducationRequirementDraft[]>;
  abstract distinctSources(): Promise<DraftSource[]>;
  abstract deleteDraftsForSource(sourceUrl: string): Promise<void>;
}
