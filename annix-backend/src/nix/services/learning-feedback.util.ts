import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { LearningSource, LearningType, NixLearning } from "../entities/nix-learning.entity";

export type NixFeedbackCorrectionType =
  | "field_correction"
  | "item_split"
  | "item_merge"
  | "item_deletion"
  | "item_added";

export interface NixFeedbackCorrection {
  originalRowNumber: number | null;
  sheetName?: string | null;
  correctionType: NixFeedbackCorrectionType;
  originalItem: unknown | null;
  correctedItem: unknown | null;
  changedFields?: string[];
}

export interface NixFeedbackPayload {
  extractionId?: number | null;
  userId?: number | null;
  customerId?: number | null;
  corrections: NixFeedbackCorrection[];
}

export const NIX_STEP3_FEEDBACK_CATEGORY = "step3_feedback";

const MAX_VALUE_CHARS = 16000;
const DELETED_MARKER = "DELETED";

const asJsonOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value).slice(0, MAX_VALUE_CHARS);
};

export function feedbackPatternKey(
  extractionId: number | null | undefined,
  correction: NixFeedbackCorrection,
): string {
  const sheet = correction.sheetName || "";
  return `extraction:${extractionId ?? "na"}:row:${sheet}#${correction.originalRowNumber ?? "na"}:${correction.correctionType}`;
}

// Issue #263: Step 3 line-item edits become NixLearning rows so the
// extraction prompts can be refined against real human corrections.
// confidence is 1.0 — these are explicit corrections, not inferences.
export function feedbackLearningRow(
  payload: NixFeedbackPayload,
  correction: NixFeedbackCorrection,
): DeepPartial<NixLearning> {
  return {
    learningType: LearningType.CORRECTION,
    source: LearningSource.USER_CORRECTION,
    category: NIX_STEP3_FEEDBACK_CATEGORY,
    patternKey: feedbackPatternKey(payload.extractionId, correction),
    originalValue: asJsonOrNull(correction.originalItem) ?? undefined,
    learnedValue: asJsonOrNull(correction.correctedItem) ?? DELETED_MARKER,
    context: {
      extractionId: payload.extractionId ?? null,
      rowNumber: correction.originalRowNumber,
      sheetName: correction.sheetName ?? null,
      correctionType: correction.correctionType,
      changedFields: correction.changedFields ?? [],
      userId: payload.userId ?? null,
      customerId: payload.customerId ?? null,
    },
    confidence: 1,
    confirmationCount: 1,
    isActive: true,
  };
}
