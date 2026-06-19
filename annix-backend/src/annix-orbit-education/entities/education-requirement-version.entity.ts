/**
 * An IMMUTABLE, per-intake-year snapshot of a programme's admission requirement
 * spec (#308). Admissions rules mutate yearly; a new rule = a NEW row, never an
 * update — so historical recommendations stay reproducible. The `spec` jsonb is
 * a serialized `RequirementSpec` from @annix/product-data/orbit-education.
 */
export class EducationRequirementVersion {
  id: string;

  programmeId: string;

  intakeYear: number;

  /** Serialized RequirementSpec. */
  spec: Record<string, unknown>;

  validFrom: string;

  validTo: string | null;

  confidence: string;

  verificationStatus: string;

  createdAt: Date;
}
