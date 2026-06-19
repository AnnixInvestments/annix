/**
 * A persisted evaluation result (#308). Captures the EXACT requirement version
 * used so a learner returning months later gets a reproducible recommendation
 * (supports appeals/debugging). `result` is a serialized EvaluationResult.
 */
export class EducationRecommendationSnapshot {
  id: string;

  educationProfileId: string | null;

  programmeId: string;

  intakeYear: number;

  requirementVersionId: string | null;

  band: string;

  /** Serialized EvaluationResult (eligibility + scoring + competitiveness + explanation). */
  result: Record<string, unknown>;

  createdAt: Date;
}
