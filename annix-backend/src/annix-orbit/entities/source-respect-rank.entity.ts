// How "respected" each job source is, used to decide which copy of a duplicate
// listing to keep (higher rank = kept). Researched defaults are seeded by
// migration; rows can be re-ranked at runtime without a code change.
export class SourceRespectRank {
  id: number;

  provider: string;

  rank: number;

  label: string | null;

  rationale: string | null;

  createdAt: Date;

  updatedAt: Date;
}
