/**
 * Historical admission distribution for a programme-year (#308). A single
 * cut-off misleads (cut-off 42 vs accepted-median 46), so we store the spread
 * to make Reach/Match/Safe honest. Numerics are nullable — curate what's known.
 */
export class EducationAdmissionDistribution {
  id: string;

  programmeId: string;

  intakeYear: number;

  minAdmitted: string | null;

  medianAdmitted: string | null;

  p25Admitted: string | null;

  p75Admitted: string | null;

  seats: number | null;

  source: string | null;

  asOf: string | null;

  createdAt: Date;
}
