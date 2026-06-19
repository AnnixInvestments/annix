export type RequirementDraftStatus = "draft" | "approved" | "rejected" | "changed";

export class EducationRequirementDraft {
  id: string;

  institutionId: string | null;

  programmeId: string | null;

  intakeYear: number;

  fieldKey: string;

  label: string;

  extractedValue: Record<string, unknown>;

  approvedValue: Record<string, unknown> | null;

  status: RequirementDraftStatus;

  confidence: string | null;

  sourceUrl: string;

  screenshotPath: string | null;

  rawSnippet: string | null;

  fetchedAt: Date;

  approvedById: number | null;

  approvedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
