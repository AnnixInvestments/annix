/**
 * A graduate-outcome / programme-quality signal for the choice-aid layer (#309).
 *
 * STRICT firewall: these signals only help a student *choose between programmes
 * they already qualify for* — they NEVER influence #308 eligibility. Each signal
 * carries its source + recency + verification status so the UI can show "signal,
 * source, as-of" honestly (no fabricated "best uni" score). MVP signal sources:
 * UK HESA Graduate Outcomes + our own FuturePath→Orbit conversion data; SA is
 * curated/manual. QS/THE rankings are license-restricted and MUST NOT be stored.
 */
export class EducationProgrammeOutcomeSignal {
  id: string;

  programmeId: string;

  /** e.g. "HESA Graduate Outcomes", "FuturePath internal". NEVER QS/THE. */
  source: string;

  /** e.g. "employment_rate_15mo", "median_earnings", "further_study_rate". */
  metric: string;

  value: string;

  /** e.g. "percent", "GBP", "ZAR". */
  unit: string;

  asOf: string | null;

  confidence: string;

  verificationStatus: string;

  sourceUrl: string | null;

  createdAt: Date;
}
