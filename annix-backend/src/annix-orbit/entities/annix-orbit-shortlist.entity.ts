export const ORBIT_SHORTLIST_STATUSES = ["draft", "ready", "sent", "reviewed", "closed"] as const;
export type AnnixOrbitShortlistStatus = (typeof ORBIT_SHORTLIST_STATUSES)[number];

export class AnnixOrbitShortlist {
  id: number;

  companyId: number;

  name: string;

  jobTitle: string | null;

  clientId: number | null;

  candidateIds: number[] | null;

  status: AnnixOrbitShortlistStatus;

  // Tokenised read-only client view (issue #337). Null = no live share link.
  shareToken: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
