/**
 * A curated scholarship/bursary entry (#304 Phase 1). Owner-curated content (no
 * scraping — scholarship sources have high link-rot, so we keep a small,
 * high-quality set). `lastVerifiedAt` makes staleness visible; `active` lets
 * admins retire entries without deleting history.
 */
export class EducationScholarship {
  id: string;

  name: string;

  provider: string;

  country: string | null;

  /** Free-text amount, e.g. "Full tuition" or "ZAR 50,000 / year" — amounts vary too much for a number. */
  amountDisplay: string | null;

  criteria: string | null;

  url: string | null;

  /** Optional career-cluster tag (see @annix/product-data/orbit-education) for filtering. */
  careerCluster: string | null;

  lastVerifiedAt: string | null;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
